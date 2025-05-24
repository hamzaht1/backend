// routes/pointRestock.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');

// Importer les modèles
const PointRestockLot = require('../models/PointRestockLot');
const PointRestockSpace = require('../models/PointRestockSpace');
const PointRestockHistory = require('../models/PointRestockHistory');
const RfidReader = require('../models/RfidReader');
const Vehicle = require('../models/Vehicle'); // Supposé existant pour les références

// Middleware pour gérer les erreurs de validation
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// 1. GET /api/point-restock/overview - Obtenir une vue d'ensemble des points de restock
router.get('/overview', async (req, res) => {
  try {
    // Récupérer les données de synthèse en parallèle
    const [lots, spaces, history] = await Promise.all([
      PointRestockLot.find(),
      PointRestockSpace.find(),
      PointRestockHistory.find().sort({ timestamp: -1 }).limit(100)
    ]);

    // Calculer les statistiques
    const totalLots = lots.length;
    const totalSpaces = spaces.length;
    const availableSpaces = spaces.filter(space => space.status === 'libre').length;
    const occupiedSpaces = spaces.filter(space => space.status === 'occupé').length;
    const occupancyRate = totalSpaces > 0 ? Math.round((occupiedSpaces / totalSpaces) * 100) : 0;

    // Compter par type de lot
    const lotStats = lots.map(lot => {
      const lotSpaces = spaces.filter(space => space.point_restock_id === lot.point_restock_id);
      const lotAvailableSpaces = lotSpaces.filter(space => space.status === 'libre').length;
      const lotOccupiedSpaces = lotSpaces.filter(space => space.status === 'occupé').length;
      const lotOccupancyRate = lotSpaces.length > 0 ? Math.round((lotOccupiedSpaces / lotSpaces.length) * 100) : 0;

      return {
        id: lot.point_restock_id,
        name: lot.name,
        totalSpaces: lotSpaces.length,
        availableSpaces: lotAvailableSpaces,
        occupiedSpaces: lotOccupiedSpaces,
        occupancyRate: lotOccupancyRate,
        status: lot.status
      };
    });

    // Récupérer les événements récents
    const recentEvents = history.slice(0, 5).map(event => ({
      id: event._id,
      lotId: event.point_restock_id,
      spaceNumber: event.space_number,
      vehiclePlate: event.license_plate,
      eventType: event.event_type,
      timestamp: event.timestamp
    }));

    res.json({
      totalLots,
      totalSpaces,
      availableSpaces,
      occupiedSpaces,
      occupancyRate,
      lotStats,
      recentEvents
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques', error: error.message });
  }
});

// 2. GET /api/point-restock/lots - Récupérer tous les lots
router.get('/lots', async (req, res) => {
  try {
    const lots = await PointRestockLot.find().sort({ point_restock_id: 1 });
    res.json(lots);
  } catch (error) {
    console.error('Erreur lors de la récupération des lots:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des lots', error: error.message });
  }
});

// 3. GET /api/point-restock/lots/:id - Récupérer un lot spécifique
router.get('/lots/:id', async (req, res) => {
  try {
    const lot = await PointRestockLot.findOne({ point_restock_id: req.params.id });
    
    if (!lot) {
      return res.status(404).json({ message: 'Lot non trouvé' });
    }
    
    res.json(lot);
  } catch (error) {
    console.error(`Erreur lors de la récupération du lot ${req.params.id}:`, error);
    res.status(500).json({ message: 'Erreur lors de la récupération du lot', error: error.message });
  }
});

// 4. GET /api/point-restock/spaces - Récupérer tous les espaces (avec pagination et filtres)
router.get('/spaces', async (req, res) => {
  try {
    const { 
      lot, 
      status, 
      page = 1, 
      limit = 20,
      sortBy = 'space_number',
      sortDir = 'asc'
    } = req.query;
    
    // Construire le filtre
    const filter = {};
    if (lot) filter.point_restock_id = lot;
    if (status) filter.status = status;
    
    // Construire le tri
    const sort = {};
    sort[sortBy] = sortDir === 'desc' ? -1 : 1;
    
    // Exécuter la requête avec pagination
    const spaces = await PointRestockSpace.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Compter le total pour la pagination
    const total = await PointRestockSpace.countDocuments(filter);
    
    res.json({
      spaces,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des espaces:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des espaces', error: error.message });
  }
});

// 5. GET /api/point-restock/spaces/:id - Récupérer un espace spécifique
router.get('/spaces/:id', async (req, res) => {
  try {
    const space = await PointRestockSpace.findOne({ uid: req.params.id });
    
    if (!space) {
      return res.status(404).json({ message: 'Espace non trouvé' });
    }
    
    res.json(space);
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'espace ${req.params.id}:`, error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'espace', error: error.message });
  }
});

// 6. GET /api/point-restock/history - Récupérer l'historique (avec pagination et filtres)
router.get('/history', async (req, res) => {
  try {
    const { 
      lot, 
      vehicle, 
      eventType,
      startDate, 
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Construire le filtre
    const filter = {};
    if (lot) filter.point_restock_id = lot;
    if (vehicle) {
      filter.$or = [
        { license_plate: { $regex: vehicle, $options: 'i' } },
        { rfid_tag: { $regex: vehicle, $options: 'i' } }
      ];
    }
    if (eventType) filter.event_type = eventType;
    
    // Filtrer par période
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    // Exécuter la requête avec pagination
    const history = await PointRestockHistory.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Compter le total pour la pagination
    const total = await PointRestockHistory.countDocuments(filter);
    
    res.json({
      history,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique', error: error.message });
  }
});

// 7. GET /api/point-restock/statistics - Récupérer des statistiques par période
router.get('/statistics', async (req, res) => {
  try {
    const { period = 'day', lot } = req.query;
    const now = new Date();
    let startDate;
    
    // Déterminer la période
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }
    
    // Construire le filtre
    const filter = { timestamp: { $gte: startDate } };
    if (lot) filter.point_restock_id = lot;
    
    // Récupérer l'historique pour la période
    const historyData = await PointRestockHistory.find(filter).sort({ timestamp: 1 });
    
    // Traiter les données selon la période pour créer des statistiques
    let statistics;
    
    switch (period) {
      case 'day':
        // Regrouper par heure
        statistics = processHourlyData(historyData, startDate);
        break;
      case 'week':
        // Regrouper par jour
        statistics = processDailyData(historyData, startDate, 7);
        break;
      case 'month':
        // Regrouper par jour
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        statistics = processDailyData(historyData, startDate, daysInMonth);
        break;
      case 'year':
        // Regrouper par mois
        statistics = processMonthlyData(historyData, startDate);
        break;
      default:
        statistics = processHourlyData(historyData, startDate);
    }
    
    res.json({
      period,
      startDate,
      endDate: new Date(),
      statistics
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques', error: error.message });
  }
});

// Fonction pour traiter les données par heure
function processHourlyData(data, startDate) {
  const hourlyStats = Array(24).fill().map((_, i) => ({
    hour: i,
    label: `${i.toString().padStart(2, '0')}:00`,
    entries: 0,
    exits: 0,
    occupancyRate: 0
  }));
  
  // Compter les entrées et sorties par heure
  data.forEach(event => {
    const hour = event.timestamp.getHours();
    if (event.event_type === 'entry') {
      hourlyStats[hour].entries++;
    } else if (event.event_type === 'exit') {
      hourlyStats[hour].exits++;
    }
  });
  
  // Calculer le taux d'occupation approx par heure
  let currentOccupancy = 0;
  hourlyStats.forEach((stat, i) => {
    currentOccupancy += stat.entries - stat.exits;
    stat.occupancyRate = Math.max(0, currentOccupancy); // Éviter les valeurs négatives
  });
  
  return hourlyStats;
}

// Fonction pour traiter les données par jour
function processDailyData(data, startDate, days) {
  const dailyStats = Array(days).fill().map((_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      day: i + 1,
      date: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }),
      entries: 0,
      exits: 0,
      occupancyRate: 0
    };
  });
  
  // Compter les entrées et sorties par jour
  data.forEach(event => {
    const dayDiff = Math.floor((event.timestamp - startDate) / (1000 * 60 * 60 * 24));
    if (dayDiff >= 0 && dayDiff < days) {
      if (event.event_type === 'entry') {
        dailyStats[dayDiff].entries++;
      } else if (event.event_type === 'exit') {
        dailyStats[dayDiff].exits++;
      }
    }
  });
  
  // Calculer le taux d'occupation par jour
  let currentOccupancy = 0;
  dailyStats.forEach((stat, i) => {
    currentOccupancy += stat.entries - stat.exits;
    stat.occupancyRate = Math.max(0, currentOccupancy);
  });
  
  return dailyStats;
}

// Fonction pour traiter les données par mois
function processMonthlyData(data, startDate) {
  const monthlyStats = Array(12).fill().map((_, i) => {
    const date = new Date(startDate.getFullYear(), i, 1);
    return {
      month: i + 1,
      label: date.toLocaleDateString('fr-FR', { month: 'short' }),
      entries: 0,
      exits: 0,
      occupancyRate: 0
    };
  });
  
  // Compter les entrées et sorties par mois
  data.forEach(event => {
    const month = event.timestamp.getMonth();
    if (event.event_type === 'entry') {
      monthlyStats[month].entries++;
    } else if (event.event_type === 'exit') {
      monthlyStats[month].exits++;
    }
  });
  
  // Calculer des statistiques agrégées par mois
  monthlyStats.forEach(stat => {
    stat.occupancyRate = Math.round((stat.entries - stat.exits) / Math.max(1, stat.entries + stat.exits) * 100);
  });
  
  return monthlyStats;
}

// 8. POST /api/point-restock/spaces/update - Mettre à jour le statut d'un espace
router.post('/spaces/update', [
  check('uid').notEmpty().withMessage('UID de l\'espace est requis'),
  check('status').isIn(['occupé', 'libre', 'réservé', 'maintenance']).withMessage('Statut invalide'),
  validateRequest
], async (req, res) => {
  try {
    const { uid, status, vehicle_rfid, vehicle_license_plate } = req.body;
    
    // Trouver l'espace
    const space = await PointRestockSpace.findOne({ uid });
    if (!space) {
      return res.status(404).json({ message: 'Espace non trouvé' });
    }
    
    // Vérifier si le statut a changé
    const oldStatus = space.status;
    
    // Mettre à jour l'espace
    space.status = status;
    space.last_updated = new Date();
    
    // Mettre à jour les informations du véhicule si nécessaire
    if (status === 'occupé') {
      space.vehicle_rfid = vehicle_rfid || space.vehicle_rfid;
      space.vehicle_license_plate = vehicle_license_plate || space.vehicle_license_plate;
    } else if (status === 'libre') {
      space.vehicle_rfid = null;
      space.vehicle_license_plate = null;
    }
    
    await space.save();
    
    // Si le statut a changé de 'libre' à 'occupé' ou vice versa, mettre à jour le lot
    if ((oldStatus === 'libre' && status === 'occupé') || (oldStatus === 'occupé' && status === 'libre')) {
      const lot = await PointRestockLot.findOne({ point_restock_id: space.point_restock_id });
      if (lot) {
        // Mettre à jour le nombre d'espaces disponibles
        if (oldStatus === 'libre' && status === 'occupé') {
          lot.available_spaces = Math.max(0, lot.available_spaces - 1);
        } else if (oldStatus === 'occupé' && status === 'libre') {
          lot.available_spaces = Math.min(lot.total_spaces, lot.available_spaces + 1);
        }
        lot.updated_at = new Date();
        await lot.save();
      }
    }
    
    res.json({ message: 'Espace mis à jour avec succès', space });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'espace:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'espace', error: error.message });
  }
});

// 9. POST /api/point-restock/event - Enregistrer un événement d'entrée ou de sortie
router.post('/event', [
  check('point_restock_id').notEmpty().withMessage('ID du point de restock est requis'),
  check('space_number').isInt({ min: 1 }).withMessage('Numéro d\'espace invalide'),
  check('rfid_tag').notEmpty().withMessage('Tag RFID est requis'),
  check('license_plate').notEmpty().withMessage('Plaque d\'immatriculation est requise'),
  check('event_type').isIn(['entry', 'exit']).withMessage('Type d\'événement invalide'),
  check('reader_id').notEmpty().withMessage('ID du lecteur est requis'),
  validateRequest
], async (req, res) => {
  try {
    const { point_restock_id, space_number, rfid_tag, license_plate, event_type, reader_id } = req.body;
    
    // Vérifier si le lot existe
    const lot = await PointRestockLot.findOne({ point_restock_id });
    if (!lot) {
      return res.status(404).json({ message: 'Point de restock non trouvé' });
    }
    
    // Vérifier si l'espace existe
    const space = await PointRestockSpace.findOne({ point_restock_id, space_number });
    if (!space) {
      return res.status(404).json({ message: 'Espace non trouvé' });
    }
    
    // Pour une entrée, vérifier si l'espace est disponible
    if (event_type === 'entry' && space.status === 'occupé') {
      return res.status(400).json({ message: 'L\'espace est déjà occupé' });
    }
    
    // Pour une sortie, vérifier si l'espace est bien occupé par ce véhicule
    if (event_type === 'exit' && 
        (space.status !== 'occupé' || 
        (space.vehicle_rfid !== rfid_tag && space.vehicle_license_plate !== license_plate))) {
      return res.status(400).json({ message: 'L\'espace n\'est pas occupé par ce véhicule' });
    }
    
    // Calculer la durée pour les sorties
    let duration = null;
    if (event_type === 'exit') {
      // Trouver l'entrée correspondante la plus récente
      const entryEvent = await PointRestockHistory.findOne({
        point_restock_id,
        space_number,
        rfid_tag,
        event_type: 'entry'
      }).sort({ timestamp: -1 });
      
      if (entryEvent) {
        // Calculer la durée en minutes
        const entryTime = new Date(entryEvent.timestamp);
        const exitTime = new Date();
        duration = Math.round((exitTime - entryTime) / (1000 * 60));
      }
    }
    
    // Créer l'enregistrement d'historique
    const historyEntry = new PointRestockHistory({
      point_restock_id,
      space_number,
      rfid_tag,
      license_plate,
      event_type,
      reader_id,
      timestamp: new Date(),
      duration
    });
    
    await historyEntry.save();
    
    // Mettre à jour le statut de l'espace
    if (event_type === 'entry') {
      space.status = 'occupé';
      space.vehicle_rfid = rfid_tag;
      space.vehicle_license_plate = license_plate;
      
      // Mettre à jour le nombre d'espaces disponibles dans le lot
      if (lot.available_spaces > 0) {
        lot.available_spaces -= 1;
      }
    } else if (event_type === 'exit') {
      space.status = 'libre';
      space.vehicle_rfid = null;
      space.vehicle_license_plate = null;
      
      // Mettre à jour le nombre d'espaces disponibles dans le lot
      lot.available_spaces = Math.min(lot.total_spaces, lot.available_spaces + 1);
    }
    
    space.last_updated = new Date();
    lot.updated_at = new Date();
    
    await Promise.all([space.save(), lot.save()]);
    
    res.json({ 
      message: 'Événement enregistré avec succès', 
      event: historyEntry,
      space 
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'événement:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'événement', error: error.message });
  }
});

// 10. GET /api/point-restock/readers - Récupérer les lecteurs RFID
router.get('/readers', async (req, res) => {
  try {
    const readers = await RfidReader.find().sort({ reader_id: 1 });
    res.json(readers);
  } catch (error) {
    console.error('Erreur lors de la récupération des lecteurs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des lecteurs', error: error.message });
  }
});

// 11. POST /api/point-restock/readers/update - Mettre à jour le statut d'un lecteur
router.post('/readers/update', [
  check('reader_id').notEmpty().withMessage('ID du lecteur est requis'),
  check('status').isIn(['active', 'inactive', 'maintenance']).withMessage('Statut invalide'),
  validateRequest
], async (req, res) => {
  try {
    const { reader_id, status } = req.body;
    
    // Trouver le lecteur
    const reader = await RfidReader.findOne({ reader_id });
    if (!reader) {
      return res.status(404).json({ message: 'Lecteur non trouvé' });
    }
    
    // Mettre à jour le lecteur
    reader.status = status;
    reader.last_check = new Date();
    
    await reader.save();
    
    res.json({ message: 'Lecteur mis à jour avec succès', reader });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du lecteur:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du lecteur', error: error.message });
  }
});

module.exports = router;