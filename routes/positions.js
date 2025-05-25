const express = require('express');
const router = express.Router();
const LivePosition = require('../models/LivePosition'); // Utilise votre modèle existant
const Vehicle = require('../models/Vehicle'); // Utilise votre modèle existant
const { body, validationResult, query } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: Positions
 *   description: Vehicle position tracking and history
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Position:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         vehicleId:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         coordinates:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *             lng:
 *               type: number
 *         speed:
 *           type: number
 *         heading:
 *           type: number
 */

/**
 * @swagger
 * /api/positions/current:
 *   get:
 *     summary: Get current position of all vehicles
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current positions of all vehicles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Position'
 */

/**
 * @swagger
 * /api/positions/{vehicleId}/history:
 *   get:
 *     summary: Get position history for a specific vehicle
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Position history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Position'
 *       404:
 *         description: Vehicle not found
 */

/**
 * @swagger
 * /api/positions/{vehicleId}/last:
 *   get:
 *     summary: Get last known position of a specific vehicle
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Last known position retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Position'
 *       404:
 *         description: Vehicle not found
 */

// GET /api/positions - Get all positions with optional filters
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      license_plate, 
      uid, 
      limit = 100, 
      offset = 0, 
      latest_only = 'true' 
    } = req.query;
    
    if (latest_only === 'true') {
      // Obtenir la dernière position pour chaque véhicule
      const pipeline = [
        ...(status ? [{ $match: { status } }] : []),
        { $sort: { uid: 1, recorded_at: -1 } },
        {
          $group: {
            _id: '$uid',
            doc: { $first: '$$ROOT' }
          }
        },
        { $replaceRoot: { newRoot: '$doc' } }
      ];
      
      const positions = await LivePosition.aggregate(pipeline);
      
      let filteredPositions = positions;
      if (license_plate) {
        filteredPositions = positions.filter(pos => pos.license_plate === license_plate);
      }
      if (uid) {
        filteredPositions = positions.filter(pos => pos.uid === uid);
      }
      
      res.json({
        success: true,
        positions: filteredPositions.slice(offset, offset + limit),
        total: filteredPositions.length,
        limit,
        offset
      });
    } else {
      // Obtenir toutes les positions avec filtres
      const filter = {};
      if (status) filter.status = status;
      if (license_plate) filter.license_plate = license_plate;
      if (uid) filter.uid = uid;
      
      const positions = await LivePosition.find(filter)
        .sort({ recorded_at: -1 })
        .limit(limit)
        .skip(offset);
      
      const total = await LivePosition.countDocuments(filter);
      
      res.json({
        success: true,
        positions,
        total,
        limit,
        offset
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des positions:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des positions' });
  }
});

// GET /api/positions/in-port - Get positions of vehicles in port
router.get('/in-port', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const positions = await LivePosition.find({ status: 'in port' })
      .sort({ recorded_at: -1 });
    
    // Obtenir les dernières positions pour chaque véhicule
    const latestPositions = {};
    positions.forEach(pos => {
      if (!latestPositions[pos.uid] || pos.recorded_at > latestPositions[pos.uid].recorded_at) {
        latestPositions[pos.uid] = pos;
      }
    });
    
    const uniquePositions = Object.values(latestPositions);
    
    res.json({
      success: true,
      positions: uniquePositions.slice(offset, offset + limit),
      total: uniquePositions.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des positions dans le port:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des positions dans le port' 
    });
  }
});

// GET /api/positions/vehicle/:uid - Get position history for a specific vehicle
router.get('/vehicle/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { limit = 100, offset = 0, from, to } = req.query;
    
    const filter = { uid };
    if (from || to) {
      filter.recorded_at = {};
      if (from) filter.recorded_at.$gte = from;
      if (to) filter.recorded_at.$lte = to;
    }
    
    const positions = await LivePosition.find(filter)
      .sort({ recorded_at: -1 })
      .limit(limit)
      .skip(offset);
    
    const total = await LivePosition.countDocuments(filter);
    
    res.json({
      success: true,
      positions,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des positions du véhicule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des positions du véhicule' 
    });
  }
});

// GET /api/positions/latest/:uid - Get latest position for a specific vehicle
router.get('/latest/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    const position = await LivePosition.findOne({ uid })
      .sort({ recorded_at: -1 });
    
    if (!position) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucune position trouvée pour ce véhicule' 
      });
    }
    
    res.json({ success: true, position });
  } catch (error) {
    console.error('Erreur lors de la récupération de la dernière position:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de la dernière position' 
    });
  }
});

// POST /api/positions - Create new position
router.post('/', [
  body('uid').notEmpty().withMessage('UID requis'),
  body('license_plate').notEmpty().withMessage('Plaque d\'immatriculation requise'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude doit être entre -90 et 90'),
  body('lon').isFloat({ min: -180, max: 180 }).withMessage('Longitude doit être entre -180 et 180'),
  body('status').optional().isIn(['in port', 'out of the port']),
  body('timestamp').optional().isString(),
  body('recorded_at').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Vérifier que le véhicule existe
    const vehicle = await Vehicle.findOne({ uid: req.body.uid });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Véhicule non trouvé' });
    }

    // Utiliser la structure de votre modèle existant
    const position = new LivePosition({
      uid: req.body.uid,
      license_plate: req.body.license_plate,
      lat: req.body.lat,
      lon: req.body.lon,
      timestamp: req.body.timestamp || new Date().toISOString(),
      recorded_at: req.body.recorded_at || new Date().toISOString(),
      status: req.body.status || 'in port'
    });
    
    await position.save();
    
    // Envoyer la mise à jour temps réel si Socket.IO est disponible
    if (req.app.get('io')) {
      req.app.get('io').to('vehicle-updates').emit('position-updated', position);
    }
    
    res.status(201).json({ success: true, position });
  } catch (error) {
    console.error('Erreur lors de la création de la position:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création de la position' });
  }
});

// Route de test
router.get('/test', async (req, res) => {
  try {
    const positionCount = await LivePosition.countDocuments();
    const inPortCount = await LivePosition.countDocuments({ status: 'in port' });
    const outOfPortCount = await LivePosition.countDocuments({ status: 'out of the port' });
    
    res.json({
      success: true,
      message: 'Routes positions fonctionnelles',
      timestamp: new Date(),
      counts: {
        total: positionCount,
        inPort: inPortCount,
        outOfPort: outOfPortCount
      },
      availableStatuses: ['in port', 'out of the port']
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