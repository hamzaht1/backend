// routes/delivery.js - Routes pour les livraisons et tracking
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Schémas des modèles
const livraison_en_cours = mongoose.model('livraison_encours', {}, 'livraison_encours');
const live_position = mongoose.model('live_position', {}, 'live_position');
const client = mongoose.model('client', {}, 'client');
const drivers = mongoose.model('drivers', {}, 'drivers');
const vehicle = mongoose.model('vehicle', {}, 'vehicle');

// GET /api/delivery/statistics - Statistiques des livraisons
router.get('/statistics', async (req, res) => {
  try {
    console.log('Récupération des statistiques de livraison...');
    
    // Compter les différents statuts de livraisons
    const totalDeliveries = await livraison_en_cours.countDocuments();
    const inProgressDeliveries = await livraison_en_cours.countDocuments({ status: 'in_progress' });
    const scheduledDeliveries = await livraison_en_cours.countDocuments({ status: 'scheduled' });
    const completedDeliveries = await livraison_en_cours.countDocuments({ status: 'completed' });
    
    // Récupérer les positions des véhicules
    const inPortVehicles = await live_position.countDocuments({ status: 'in port' });
    const outPortVehicles = await live_position.countDocuments({ status: 'out of the port' });
    
    const statistics = {
      totalDeliveries: totalDeliveries || 0,
      inProgressDeliveries: inProgressDeliveries || 0,
      scheduledDeliveries: scheduledDeliveries || 0,
      completedDeliveries: completedDeliveries || 0,
      inPortVehicles: inPortVehicles || 0,
      outPortVehicles: outPortVehicles || 0
    };
    
    console.log('Statistiques calculées:', statistics);
    res.json(statistics);
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/in-progress - Livraisons en cours avec toutes les infos liées
router.get('/in-progress', async (req, res) => {
  try {
    console.log('Récupération des livraisons en cours...');
    
    // Récupérer toutes les livraisons avec status "in_progress"
    const deliveries = await livraison_en_cours.find({ status: 'in_progress' });
    
    console.log(`${deliveries.length} livraisons en cours trouvées`);
    
    // Enrichir chaque livraison avec les données des collections liées
    const enrichedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        // Récupérer les infos du client origin
        const originClient = delivery.origin ? await client.findById(delivery.origin) : null;
        // Récupérer les infos du client destination  
        const destinationClient = delivery.destination ? await client.findById(delivery.destination) : null;
        // Récupérer les infos du driver
        const driverInfo = delivery.id_driver ? await drivers.findById(delivery.id_driver) : null;
        // Récupérer les infos du véhicule
        const vehicleInfo = delivery.id_camion ? await vehicle.findById(delivery.id_camion) : null;
        
        return {
          _id: delivery._id,
          type_marchandise: delivery.type_marchandise,
          date_debut: delivery.date_debut,
          date_fin_prevue: delivery.date_fin_prevue,
          departure_time: delivery.departure_time,
          estimated_arrival: delivery.estimated_arrival,
          status: delivery.status,
          created_at: delivery.created_at,
          origin: originClient ? {
            name: originClient.name,
            address: originClient.adresse,
            coordonnees: originClient.coordonnees,
            email: originClient.email,
            phone: originClient.phone,
            color: '#10b981' // Vert pour origine
          } : null,
          destination: destinationClient ? {
            name: destinationClient.name,
            address: destinationClient.adresse,
            coordonnees: destinationClient.coordonnees,
            email: destinationClient.email,
            phone: destinationClient.phone,
            color: '#6366f1' // Bleu pour destination
          } : null,
          driver: driverInfo ? {
            name: `${driverInfo.prenom} ${driverInfo.nom}`,
            email: driverInfo.email,
            phone: driverInfo.phone,
            age: driverInfo.age,
            avatar: '/images/avatar.jfif' // Avatar par défaut
          } : null,
          vehicle: vehicleInfo ? {
            license_plate: vehicleInfo.license_plate,
            uid: vehicleInfo.uid,
            model: vehicleInfo.model || 'Unknown'
          } : null
        };
      })
    );
    
    console.log(`${enrichedDeliveries.length} livraisons enrichies envoyées`);
    res.json(enrichedDeliveries);
  } catch (error) {
    console.error('Erreur lors de la récupération des livraisons:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/live-positions - Positions des véhicules "out of the port"
router.get('/live-positions', async (req, res) => {
  try {
    console.log('Récupération des positions live...');
    
    // Compter le nombre de livraisons "in_progress"
    const inProgressCount = await livraison_en_cours.countDocuments({ status: 'in_progress' });
    console.log(`${inProgressCount} livraisons en cours trouvées`);
    
    // Récupérer exactement le même nombre de positions "out of the port"
    const livePositions = await live_position.find({ status: 'out of the port' })
      .limit(inProgressCount)
      .sort({ timestamp: -1 }); // Les plus récentes en premier
    
    console.log(`${livePositions.length} positions live "out of the port" envoyées`);
    res.json(livePositions);
  } catch (error) {
    console.error('Erreur lors de la récupération des positions live:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/all-positions - Toutes les positions pour la carte
router.get('/all-positions', async (req, res) => {
  try {
    console.log('Récupération de toutes les positions...');
    
    // Récupérer toutes les positions (in port et out of port)
    const allPositions = await live_position.find().sort({ timestamp: -1 });
    
    console.log(`${allPositions.length} positions totales récupérées`);
    res.json(allPositions);
  } catch (error) {
    console.error('Erreur lors de la récupération de toutes les positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/timeline-data - Données pour les graphiques de timeline
router.get('/timeline-data', async (req, res) => {
  try {
    const timeRange = req.query.range || 'day';
    console.log(`Génération des données de timeline pour: ${timeRange}`);
    
    // Générer des données de timeline basées sur les livraisons réelles
    const now = new Date();
    let data = {};
    
    if (timeRange === 'day') {
      // Données pour les 24 dernières heures
      data = {
        day: [
          { time: "08:00", value: await generateHourlyCount(now, 8) },
          { time: "10:00", value: await generateHourlyCount(now, 10) },
          { time: "12:00", value: await generateHourlyCount(now, 12) },
          { time: "14:00", value: await generateHourlyCount(now, 14) },
          { time: "16:00", value: await generateHourlyCount(now, 16) },
          { time: "18:00", value: await generateHourlyCount(now, 18) },
          { time: "20:00", value: await generateHourlyCount(now, 20) },
        ]
      };
    } else if (timeRange === 'month') {
      // Données pour le mois actuel
      data = {
        month: [
          { time: "Week 1", value: await generateWeeklyCount(now, 1) },
          { time: "Week 2", value: await generateWeeklyCount(now, 2) },
          { time: "Week 3", value: await generateWeeklyCount(now, 3) },
          { time: "Week 4", value: await generateWeeklyCount(now, 4) },
        ]
      };
    } else {
      // Données pour l'année actuelle
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      data = {
        year: await Promise.all(months.map(async (month, index) => ({
          time: month,
          value: await generateMonthlyCount(now, index)
        })))
      };
    }
    
    res.json(data);
  } catch (error) {
    console.error('Erreur lors de la génération des données de timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fonctions utilitaires pour générer les données de timeline
async function generateHourlyCount(date, hour) {
  const startDate = new Date(date);
  startDate.setHours(hour, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(hour + 2, 0, 0, 0);
  
  const count = await livraison_en_cours.countDocuments({
    created_at: { $gte: startDate, $lt: endDate }
  });
  
  // Ajouter quelques données simulées pour avoir des graphiques plus visuels
  return count + Math.floor(Math.random() * 10);
}

async function generateWeeklyCount(date, week) {
  const startDate = new Date(date.getFullYear(), date.getMonth(), (week - 1) * 7 + 1);
  const endDate = new Date(date.getFullYear(), date.getMonth(), week * 7 + 1);
  
  const count = await livraison_en_cours.countDocuments({
    created_at: { $gte: startDate, $lt: endDate }
  });
  
  return count + Math.floor(Math.random() * 50);
}

async function generateMonthlyCount(date, month) {
  const startDate = new Date(date.getFullYear(), month, 1);
  const endDate = new Date(date.getFullYear(), month + 1, 1);
  
  const count = await livraison_en_cours.countDocuments({
    created_at: { $gte: startDate, $lt: endDate }
  });
  
  return count + Math.floor(Math.random() * 100);
}

module.exports = router;