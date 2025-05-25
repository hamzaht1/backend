// routes/livePosition.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Schéma pour la collection live_position
const LivePositionSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    index: true
  },
  license_plate: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lon: {
    type: Number,
    required: true
  },
  timestamp: {
    type: String,
    required: true
  },
  recorded_at: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['in port', 'out of port', 'delivering'],
    default: 'in port'
  }
});

const LivePosition = mongoose.model('LivePosition2', LivePositionSchema, 'live_position');

/**
 * @swagger
 * tags:
 *   name: Live Position
 *   description: Real-time vehicle position tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LivePosition:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         vehicleId:
 *           type: string
 *           description: ID of the vehicle
 *         uid:
 *           type: string
 *           description: Vehicle unique identifier
 *         license_plate:
 *           type: string
 *           description: Vehicle license plate
 *         location:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *               description: Latitude
 *             lng:
 *               type: number
 *               description: Longitude
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Position timestamp
 *         speed:
 *           type: number
 *           description: Current speed in km/h
 *         heading:
 *           type: number
 *           description: Vehicle heading in degrees
 */

/**
 * @swagger
 * /api/live-position/current:
 *   get:
 *     summary: Get current position of all vehicles
 *     tags: [Live Position]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current positions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LivePosition'
 */

/**
 * @swagger
 * /api/live-position/{vehicleId}:
 *   get:
 *     summary: Get current position of a specific vehicle
 *     tags: [Live Position]
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
 *         description: Vehicle position retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LivePosition'
 *       404:
 *         description: Vehicle not found
 */

// GET /api/live-position/current - Récupérer la position actuelle du véhicule de l'utilisateur connecté
router.get('/current', auth, async (req, res) => {
  try {
    // Récupérer l'UID du véhicule depuis le token JWT
    const vehicleId = req.user.vehicleId;
    
    if (!vehicleId) {
      return res.status(400).json({
        message: "Aucun véhicule n'est associé à cet utilisateur"
      });
    }
    
    console.log('Recherche de position pour le véhicule:', vehicleId);
    
    // Récupérer la dernière position connue pour ce véhicule
    const position = await LivePosition.findOne({ uid: vehicleId })
      .sort({ recorded_at: -1 });
    
    if (!position) {
      return res.status(404).json({
        message: "Aucune position n'a été trouvée pour ce véhicule"
      });
    }
    
    res.json(position);
    
  } catch (err) {
    console.error('Erreur lors de la récupération de la position:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/live-position/history - Récupérer l'historique des positions
router.get('/history', auth, async (req, res) => {
  try {
    const vehicleId = req.user.vehicleId;
    
    if (!vehicleId) {
      return res.status(400).json({
        message: "Aucun véhicule n'est associé à cet utilisateur"
      });
    }
    
    // Récupérer les positions des dernières 24 heures
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const positions = await LivePosition.find({
      uid: vehicleId,
      recorded_at: { $gte: oneDayAgo.toISOString() }
    }).sort({ recorded_at: 1 });
    
    res.json(positions);
    
  } catch (err) {
    console.error('Erreur lors de la récupération de l\'historique des positions:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/live-position/update - Mettre à jour la position du véhicule
router.post('/update', auth, async (req, res) => {
  try {
    const vehicleId = req.user.vehicleId;
    
    if (!vehicleId || req.user.role !== 'conducteur') {
      return res.status(403).json({
        message: "Vous n'êtes pas autorisé à mettre à jour la position de ce véhicule"
      });
    }
    
    const { lat, lon, status } = req.body;
    
    // Validation des champs
    if (!lat || !lon) {
      return res.status(400).json({
        message: "Les coordonnées latitude et longitude sont requises"
      });
    }
    
    // Obtenir la plaque d'immatriculation du véhicule (depuis une requête précédente ou une autre API)
    const lastPosition = await LivePosition.findOne({ uid: vehicleId })
      .sort({ recorded_at: -1 });
    
    const license_plate = lastPosition ? lastPosition.license_plate : "UNKNOWN";
    
    // Créer une nouvelle entrée de position
    const newPosition = new LivePosition({
      uid: vehicleId,
      license_plate,
      lat,
      lon,
      timestamp: new Date().toISOString(),
      recorded_at: new Date().toISOString(),
      status: status || 'in port'
    });
    
    await newPosition.save();
    
    res.status(201).json({
      message: "Position mise à jour avec succès",
      position: newPosition
    });
    
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la position:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/live-position/nearby - Récupérer les véhicules à proximité
router.get('/nearby', auth, async (req, res) => {
  try {
    const vehicleId = req.user.vehicleId;
    
    if (!vehicleId) {
      return res.status(400).json({
        message: "Aucun véhicule n'est associé à cet utilisateur"
      });
    }
    
    // Récupérer la position actuelle du véhicule
    const currentPosition = await LivePosition.findOne({ uid: vehicleId })
      .sort({ recorded_at: -1 });
    
    if (!currentPosition) {
      return res.status(404).json({
        message: "Aucune position n'a été trouvée pour ce véhicule"
      });
    }
    
    // Récupérer les véhicules à proximité dans un rayon de 5km environ
    const nearbyVehicles = await LivePosition.aggregate([
      {
        $group: {
          _id: "$uid",
          license_plate: { $last: "$license_plate" },
          lat: { $last: "$lat" },
          lon: { $last: "$lon" },
          timestamp: { $last: "$timestamp" },
          status: { $last: "$status" }
        }
      },
      {
        $match: {
          _id: { $ne: vehicleId } // Exclure le véhicule actuel
        }
      },
      {
        $project: {
          uid: "$_id",
          license_plate: 1,
          lat: 1,
          lon: 1,
          timestamp: 1,
          status: 1,
          distance: { 
            $sqrt: { 
              $add: [
                { $pow: [{ $subtract: ["$lat", currentPosition.lat] }, 2] },
                { $pow: [{ $subtract: ["$lon", currentPosition.lon] }, 2] }
              ] 
            } 
          }
        }
      },
      {
        $match: {
          distance: { $lt: 0.05 } // ~5km en coordonnées décimales (estimation approximative)
        }
      },
      {
        $sort: { distance: 1 }
      }
    ]);
    
    res.json(nearbyVehicles);
    
  } catch (err) {
    console.error('Erreur lors de la recherche de véhicules à proximité:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;