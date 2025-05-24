const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const Vehicle = require('../models/Vehicle');
const auth = require('../middleware/auth');

// Route pour récupérer l'historique des livraisons avec filtres
// IMPORTANT: Cette route doit être AVANT la route /:id
router.get('/filter', auth, async (req, res) => {
  try {
    const { period, status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Si l'utilisateur est un conducteur, récupérer son véhicule
    let vehicleId = null;
    if (userRole === 'conducteur') {
      // Récupérer le vehicleId depuis le token (uid)
      const vehicleUid = req.user.vehicleId;
      if (!vehicleUid) {
        return res.status(400).json({ message: 'Aucun véhicule assigné à ce conducteur' });
      }
      
      // Trouver le véhicule par uid
      const vehicle = await Vehicle.findOne({ uid: vehicleUid });
      if (!vehicle) {
        return res.status(404).json({ message: 'Véhicule non trouvé' });
      }
      vehicleId = vehicle._id;
    }
    
    // Construire la requête de base
    let query = {};
    
    // Filtrer par conducteur si c'est un conducteur
    if (userRole === 'conducteur' && vehicleId) {
      query.id_camion = vehicleId;
    }
    
    // Filtrer par statut si spécifié
    if (status && status !== 'Tous') {
      const statusMap = {
        'Complété': 'delivered',
        'En cours': 'in_progress',
        'Annulé': 'cancelled',
        'En attente': 'pending'
      };
      query.status = statusMap[status] || status.toLowerCase();
    }
    
    // Filtrer par période
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        // Par défaut, cette semaine
        const defaultWeekStart = new Date(now);
        defaultWeekStart.setDate(now.getDate() - now.getDay());
        defaultWeekStart.setHours(0, 0, 0, 0);
        startDate = defaultWeekStart;
    }
    
    query.date_debut = { $gte: startDate };
    
    // Récupérer les livraisons avec population des références
    const deliveries = await Delivery.find(query)
      .populate('id_camion', 'license_plate uid')
      .populate('origin')
      .populate('destination')
      .sort({ date_debut: -1 });
    
    // Formatter les données pour le frontend
    const formattedDeliveries = deliveries.map(delivery => {
      const startTime = new Date(delivery.date_debut);
      const endTime = delivery.date_fin_prevue ? new Date(delivery.date_fin_prevue) : null;
      
      // Calculer la durée
      let duration = 'N/A';
      if (endTime) {
        const diffMs = endTime - startTime;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${diffHours}h ${diffMinutes}m`;
      }
      
      // Mapper le statut
      const statusMap = {
        'pending': 'En attente',
        'in_progress': 'En cours',
        'delivered': 'Complété',
        'cancelled': 'Annulé'
      };
      
      return {
        id: delivery._id,
        date: startTime.toLocaleDateString('fr-FR'),
        startTime: startTime.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        endTime: endTime ? endTime.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : 'N/A',
        origin: delivery.origin?.name || delivery.origin?.address || 'Origine inconnue',
        destination: delivery.destination?.name || delivery.destination?.address || 'Destination inconnue',
        distance: calculateDistance(delivery.origin, delivery.destination),
        duration: duration,
        status: statusMap[delivery.status] || delivery.status,
        type_marchandise: delivery.type_marchandise,
        vehicle: delivery.id_camion?.license_plate || 'N/A',
        vehicleUid: delivery.id_camion?.uid || 'N/A'
      };
    });
    
    res.json(formattedDeliveries);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des livraisons:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des livraisons' });
  }
});

// Route pour mettre à jour le statut d'une livraison (pour les conducteurs)
// IMPORTANT: Cette route doit aussi être AVANT la route /:id
router.put('/:id/status', auth, async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Vérifier que le statut est valide
    const validStatuses = ['pending', 'in_progress', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }
    
    let query = { _id: deliveryId };
    
    // Si c'est un conducteur, s'assurer qu'il ne peut modifier que ses livraisons
    if (userRole === 'conducteur') {
      const vehicleUid = req.user.vehicleId;
      if (!vehicleUid) {
        return res.status(400).json({ message: 'Aucun véhicule assigné à ce conducteur' });
      }
      
      const vehicle = await Vehicle.findOne({ uid: vehicleUid });
      if (!vehicle) {
        return res.status(404).json({ message: 'Véhicule non trouvé' });
      }
      
      query.id_camion = vehicle._id;
    }
    
    const delivery = await Delivery.findOneAndUpdate(
      query,
      { 
        status: status,
        updated_at: new Date()
      },
      { new: true }
    );
    
    if (!delivery) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }
    
    res.json({ message: 'Statut mis à jour avec succès', delivery });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' });
  }
});

// Route pour récupérer le détail d'une livraison
// IMPORTANT: Cette route doit être APRÈS les routes spécifiques
router.get('/:id', auth, async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Validation de l'ObjectId
    if (!deliveryId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID de livraison invalide' });
    }
    
    let query = { _id: deliveryId };
    
    // Si c'est un conducteur, s'assurer qu'il ne peut voir que ses livraisons
    if (userRole === 'conducteur') {
      const vehicleUid = req.user.vehicleId;
      if (!vehicleUid) {
        return res.status(400).json({ message: 'Aucun véhicule assigné à ce conducteur' });
      }
      
      const vehicle = await Vehicle.findOne({ uid: vehicleUid });
      if (!vehicle) {
        return res.status(404).json({ message: 'Véhicule non trouvé' });
      }
      
      query.id_camion = vehicle._id;
    }
    
    const delivery = await Delivery.findOne(query)
      .populate('id_camion', 'license_plate uid rfid_tag')
      .populate('origin')
      .populate('destination');
    
    if (!delivery) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }
    
    // Formatter les données détaillées
    const detailedDelivery = {
      id: delivery._id,
      type_marchandise: delivery.type_marchandise,
      status: delivery.status,
      date_debut: delivery.date_debut,
      date_fin_prevue: delivery.date_fin_prevue,
      departure_time: delivery.departure_time,
      estimated_arrival: delivery.estimated_arrival,
      origin: {
        id: delivery.origin?._id,
        name: delivery.origin?.name,
        address: delivery.origin?.address,
        coordinates: delivery.origin?.coordinates
      },
      destination: {
        id: delivery.destination?._id,
        name: delivery.destination?.name,
        address: delivery.destination?.address,
        coordinates: delivery.destination?.coordinates
      },
      vehicle: {
        id: delivery.id_camion?._id,
        license_plate: delivery.id_camion?.license_plate,
        uid: delivery.id_camion?.uid,
        rfid_tag: delivery.id_camion?.rfid_tag
      },
      created_at: delivery.created_at,
      updated_at: delivery.updated_at
    };
    
    res.json(detailedDelivery);
    
  } catch (error) {
    console.error('Erreur lors de la récupération du détail de la livraison:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération du détail' });
  }
});

// Fonction helper pour calculer la distance (approximative)
function calculateDistance(origin, destination) {
  // Si on a des coordonnées, utiliser la formule de Haversine
  if (origin?.coordinates && destination?.coordinates) {
    const lat1 = origin.coordinates.latitude;
    const lon1 = origin.coordinates.longitude;
    const lat2 = destination.coordinates.latitude;
    const lon2 = destination.coordinates.longitude;
    
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Arrondir à 1 décimale
  }
  
  // Sinon, retourner une valeur par défaut
  return 'N/A';
}

module.exports = router;