const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle'); // Utilise votre modèle existant
const LivePosition = require('../models/LivePosition'); // Utilise votre modèle existant
const { body, validationResult, query } = require('express-validator');

// GET /api/vehicles/in-port - Get vehicles currently in port
router.get('/in-port', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    // Utiliser le statut 'in port' de votre modèle
    const inPortPositions = await LivePosition.find({ status: 'in port' })
      .sort({ recorded_at: -1 });
    
    // Obtenir les dernières positions pour chaque véhicule
    const latestPositions = {};
    inPortPositions.forEach(pos => {
      if (!latestPositions[pos.uid] || pos.recorded_at > latestPositions[pos.uid].recorded_at) {
        latestPositions[pos.uid] = pos;
      }
    });
    
    // Obtenir les détails des véhicules
    const vehicleIds = Object.keys(latestPositions);
    const vehicles = await Vehicle.find({ uid: { $in: vehicleIds } });
    
    // Combiner les données
    const vehiclesInPort = vehicles.map(vehicle => {
      const position = latestPositions[vehicle.uid];
      return {
        ...vehicle.toObject(),
        current_position: position
      };
    });
    
    res.json({
      success: true,
      vehicles: vehiclesInPort.slice(offset, offset + limit),
      total: vehiclesInPort.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des véhicules dans le port:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des véhicules dans le port',
      error: error.message
    });
  }
});

// GET /api/vehicles/stats - Get vehicle statistics
router.get('/stats', async (req, res) => {
  try {
    const totalVehicles = await Vehicle.countDocuments({ status: 'active' });
    
    // Compter les véhicules par statut de position
    const inPortCount = await LivePosition.countDocuments({ status: 'in port' });
    const outOfPortCount = await LivePosition.countDocuments({ status: 'out of the port' });
    
    // Statistiques simplifiées basées sur vos statuts existants
    res.json({
      success: true,
      totalVehicles,
      inPortVehicles: inPortCount,
      outOfPortVehicles: outOfPortCount,
      parkingVehicles: 0, // Pas de statut parking dans votre modèle
      restockVehicles: 0, // Pas de statut restock dans votre modèle
      roadVehicles: outOfPortCount // Considérer out of port comme sur route
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// GET /api/vehicles - Get all vehicles
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0, with_positions = 'false' } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    if (with_positions === 'true') {
      // Obtenir les véhicules avec leurs positions
      const vehicles = await Vehicle.find(filter).limit(limit).skip(offset);
      const vehiclesWithPositions = await Promise.all(
        vehicles.map(async (vehicle) => {
          const position = await LivePosition.findOne({ uid: vehicle.uid })
            .sort({ recorded_at: -1 });
          return {
            ...vehicle.toObject(),
            current_position: position
          };
        })
      );
      
      res.json({
        success: true,
        vehicles: vehiclesWithPositions,
        total: vehiclesWithPositions.length,
        limit,
        offset
      });
    } else {
      const vehicles = await Vehicle.find(filter).limit(limit).skip(offset);
      const total = await Vehicle.countDocuments(filter);
      
      res.json({
        success: true,
        vehicles,
        total,
        limit,
        offset
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des véhicules:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des véhicules',
      error: error.message
    });
  }
});

// GET /api/vehicles/:id - Get specific vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Véhicule non trouvé' });
    }
    
    // Obtenir la position actuelle
    const position = await LivePosition.findOne({ uid: vehicle.uid })
      .sort({ recorded_at: -1 });
    
    res.json({ 
      success: true, 
      vehicle: {
        ...vehicle.toObject(),
        current_position: position
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du véhicule:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du véhicule' });
  }
});

// GET /api/vehicles/uid/:uid - Get specific vehicle by UID
router.get('/uid/:uid', async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ uid: req.params.uid });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Véhicule non trouvé' });
    }
    
    // Obtenir la position actuelle
    const position = await LivePosition.findOne({ uid: vehicle.uid })
      .sort({ recorded_at: -1 });
    
    res.json({ 
      success: true, 
      vehicle: {
        ...vehicle.toObject(),
        current_position: position
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du véhicule:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du véhicule' });
  }
});

// Route de test
router.get('/test', async (req, res) => {
  try {
    const vehicleCount = await Vehicle.countDocuments();
    const positionCount = await LivePosition.countDocuments();
    const inPortCount = await LivePosition.countDocuments({ status: 'in port' });
    
    res.json({
      success: true,
      message: 'Routes vehicles fonctionnelles',
      timestamp: new Date(),
      collections: {
        vehicles: vehicleCount,
        positions: positionCount,
        inPort: inPortCount
      },
      collections_used: {
        vehicles: 'vehicules',
        positions: 'live_position'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test',
      error: error.message
    });
  }
});

module.exports = router;