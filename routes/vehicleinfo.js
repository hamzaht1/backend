// routes/driver.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const VehicleStatistics = require('../models/VehicleKm');
const Diagnostic = require('../models/Diagnostic');
const auth = require('../middleware/auth');
const User = require('../models/User');

/**
 * @swagger
 * tags:
 *   name: Driver Vehicle Info
 *   description: Driver's vehicle information and management
 */

/**
 * @swagger
 * /api/driver/vehicle-info:
 *   get:
 *     summary: Get current driver's vehicle information
 *     tags: [Driver Vehicle Info]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicle:
 *                   $ref: '#/components/schemas/Vehicle'
 *                 diagnostics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Diagnostic'
 *                 currentDelivery:
 *                   $ref: '#/components/schemas/Delivery'
 *       404:
 *         description: No vehicle assigned to driver
 */

/**
 * @swagger
 * /api/driver/status:
 *   put:
 *     summary: Update driver status
 *     tags: [Driver Vehicle Info]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, break, maintenance]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 */

/**
 * @swagger
 * tags:
 *   name: Driver Dashboard
 *   description: Driver-specific vehicle information and dashboard
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VehicleInfo:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         vehicleId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, maintenance, inactive]
 *         currentLocation:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *             lng:
 *               type: number
 *         diagnostics:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               severity:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 */

/**
 * @swagger
 * /api/driver/vehicle-info:
 *   get:
 *     summary: Get vehicle information for logged-in driver
 *     tags: [Driver Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleInfo'
 *       401:
 *         description: Unauthorized or no vehicle assigned
 */

/**
 * @swagger
 * /api/driver/deliveries:
 *   get:
 *     summary: Get driver's delivery history
 *     tags: [Driver Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Driver's deliveries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Delivery'
 *       401:
 *         description: Unauthorized
 */

// GET /api/driver/vehicle-info - Get vehicle information for driver dashboard
router.get('/vehicle-info', auth, async (req, res) => {
  try {
    // Afficher toutes les valeurs pour le débogage
    console.log('req.user complet:', req.user);
    
    // Récupérer l'ID du véhicule depuis le token JWT
    // Si vehicleId n'est pas dans le token, tentez de trouver l'utilisateur et utilisez son uid
    let vehicleId = req.user.vehicleId;
    
    // Si vehicleId n'est pas présent, rechercher l'utilisateur pour obtenir son uid
    if (!vehicleId && req.user.id) {
      const user = await User.findById(req.user.id);
      if (user && user.uid) {
        vehicleId = user.uid;
        console.log('vehicleId récupéré depuis la base de données:', vehicleId);
      }
    }
    
    console.log('vehicleId final utilisé:', vehicleId);
    
    // Si l'utilisateur n'a pas de véhicule associé ou n'est pas conducteur
    if (!vehicleId || req.user.role !== 'conducteur') {
      return res.status(403).json({ 
        message: 'Vous n\'avez pas de véhicule assigné ou vous n\'êtes pas un conducteur'
      });
    }

    // Trouver le véhicule par son UID
    const vehicle = await Vehicle.findOne({ uid: vehicleId });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    // Récupérer les statistiques du véhicule
    const stats = await VehicleStatistics.findOne({ uid: vehicleId });
    
    // Récupérer le dernier diagnostic pour ce véhicule
    const latestDiagnostic = await Diagnostic.findOne({
      $or: [
        { uid: vehicleId },
        { license_plate: vehicle.license_plate }
      ]
    }).sort({ diagnostic_timestamp: -1 });

    // Générer ou récupérer les données pour le dashboard
    // Ces valeurs sont adaptées au format attendu par le frontend
    const vehicleData = {
      vehicleModel: vehicle.model || "Véhicule de service",
      licensePlate: vehicle.license_plate,
      status: vehicle.status === "active" ? "En service" : "Stationnement",
      odometerReading: stats ? Math.round(stats.total_km) : 0,
      
      // Obtenir les données de diagnostic si disponibles, sinon utiliser des valeurs par défaut
      fuelLevel: latestDiagnostic && latestDiagnostic.fuel_level ? 
        latestDiagnostic.fuel_level : 
        Math.floor(Math.random() * 30) + 60, // 60-90% par défaut
      
      speed: latestDiagnostic && latestDiagnostic.speed ? 
        latestDiagnostic.speed : 
        (vehicle.status === "active" ? Math.floor(Math.random() * 60) : 0),
      
      temperature: latestDiagnostic && latestDiagnostic.engine_temp ? 
        latestDiagnostic.engine_temp : 
        85 + Math.floor(Math.random() * 5), // 85-90°C par défaut
      
      oilLevel: latestDiagnostic && latestDiagnostic.oil_level ? 
        latestDiagnostic.oil_level : 
        Math.floor(Math.random() * 15) + 80, // 80-95% par défaut
      
      batteryLevel: latestDiagnostic && latestDiagnostic.battery_level ? 
        latestDiagnostic.battery_level : 
        Math.floor(Math.random() * 10) + 90, // 90-100% par défaut
      
      // Nouveau : Régime moteur
      regimeMoteur: latestDiagnostic && latestDiagnostic.regime_moteur ? 
        latestDiagnostic.regime_moteur : 
        0,
      
      // Informations supplémentaires
      vehicleId: vehicle.uid,
      rfidTag: vehicle.rfid_tag,
      lastDiagnosticTime: latestDiagnostic ? latestDiagnostic.diagnostic_timestamp : null,
      diagnosticTimestamp: latestDiagnostic ? latestDiagnostic.diagnostic_timestamp : null,
      alerts: latestDiagnostic && latestDiagnostic.dtc_code ? [latestDiagnostic.dtc_code] : []
    };

    res.json(vehicleData);
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du véhicule:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/driver/vehicle-stats - Get additional vehicle statistics
router.get('/vehicle-stats', auth, async (req, res) => {
  try {
    // Récupérer l'ID du véhicule depuis le token JWT
    // Si vehicleId n'est pas dans le token, tentez de trouver l'utilisateur et utilisez son uid
    let vehicleId = req.user.vehicleId;
    
    // Si vehicleId n'est pas présent, rechercher l'utilisateur pour obtenir son uid
    if (!vehicleId && req.user.id) {
      const user = await User.findById(req.user.id);
      if (user && user.uid) {
        vehicleId = user.uid;
      }
    }
    
    // Si l'utilisateur n'a pas de véhicule associé
    if (!vehicleId || req.user.role !== 'conducteur') {
      return res.status(403).json({ 
        message: 'Vous n\'avez pas de véhicule assigné ou vous n\'êtes pas un conducteur'
      });
    }

    // Récupérer l'historique des diagnostics (pour montrer l'évolution)
    const diagnosticsHistory = await Diagnostic.find({
      uid: vehicleId
    })
    .sort({ diagnostic_timestamp: -1 })
    .limit(10);
    
    // Transformer les données pour le format attendu par les graphiques
    const fuelHistory = diagnosticsHistory.map(d => ({
      timestamp: d.diagnostic_timestamp,
      value: d.fuel_level || 0
    })).reverse();
    
    const tempHistory = diagnosticsHistory.map(d => ({
      timestamp: d.diagnostic_timestamp,
      value: d.engine_temp || 0
    })).reverse();
    
    // Nouveau : Historique du régime moteur
    const regimeHistory = diagnosticsHistory.map(d => ({
      timestamp: d.diagnostic_timestamp,
      value: d.regime_moteur || 0
    })).reverse();
    
    // Récupérer les KM parcourus par mois (si disponible dans votre modèle)
    // Si cette donnée n'est pas disponible, nous pouvons générer des données fictives
    const monthlyDistanceData = [
      { month: 'Jan', distance: Math.floor(Math.random() * 200) + 800 },
      { month: 'Fév', distance: Math.floor(Math.random() * 200) + 800 },
      { month: 'Mar', distance: Math.floor(Math.random() * 200) + 800 },
      { month: 'Avr', distance: Math.floor(Math.random() * 200) + 800 },
      { month: 'Mai', distance: Math.floor(Math.random() * 200) + 800 },
    ];

    res.json({
      fuelHistory,
      tempHistory,
      regimeHistory,
      monthlyDistanceData
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/driver/vehicle-diagnostic - Get diagnostic information
router.get('/vehicle-diagnostic', auth, async (req, res) => {
  try {
    // Récupérer l'ID du véhicule depuis le token JWT
    // Si vehicleId n'est pas dans le token, tentez de trouver l'utilisateur et utilisez son uid
    let vehicleId = req.user.vehicleId;
    
    // Si vehicleId n'est pas présent, rechercher l'utilisateur pour obtenir son uid
    if (!vehicleId && req.user.id) {
      const user = await User.findById(req.user.id);
      if (user && user.uid) {
        vehicleId = user.uid;
      }
    }
    
    // Si l'utilisateur n'a pas de véhicule associé
    if (!vehicleId || req.user.role !== 'conducteur') {
      return res.status(403).json({ 
        message: 'Vous n\'avez pas de véhicule assigné ou vous n\'êtes pas un conducteur'
      });
    }

    // Trouver le véhicule
    const vehicle = await Vehicle.findOne({ uid: vehicleId });
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé' });
    }

    // Récupérer tous les diagnostics pour ce véhicule
    const diagnostics = await Diagnostic.find({
      $or: [
        { uid: vehicleId },
        { license_plate: vehicle.license_plate }
      ]
    })
    .sort({ diagnostic_timestamp: -1 })
    .limit(20);

    // Filtrer les diagnostics avec des codes d'erreur DTC
    const alerts = diagnostics
      .filter(d => d.dtc_code)
      .map(d => ({
        code: d.dtc_code,
        timestamp: d.diagnostic_timestamp,
        description: getDTCDescription(d.dtc_code), // Fonction d'aide pour traduire les codes DTC
        severity: getDTCSeverity(d.dtc_code) // Fonction d'aide pour déterminer la gravité
      }));

    res.json({
      alerts,
      lastDiagnosticDate: diagnostics.length > 0 ? diagnostics[0].diagnostic_timestamp : null,
      totalDiagnostics: diagnostics.length,
      hasActiveAlerts: alerts.length > 0
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des diagnostics:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Fonction d'aide pour traduire les codes DTC
function getDTCDescription(code) {
  // Idéalement, vous auriez une base de données de codes DTC avec leurs descriptions
  // Voici quelques exemples basiques
  const dtcCodes = {
    'P0001': 'Régulateur de volume de carburant - Circuit ouvert',
    'P0002': 'Régulateur de volume de carburant - Plage/Performance',
    'P0003': 'Régulateur de volume de carburant - Circuit bas',
    // Ajoutez d'autres codes selon vos besoins
  };
  
  return dtcCodes[code] || `Code d'erreur ${code}`;
}

// Fonction d'aide pour déterminer la gravité du code DTC
function getDTCSeverity(code) {
  if (!code) return 'unknown';
  
  // La première lettre du code DTC indique généralement le système concerné
  const systemCode = code.charAt(0);
  
  switch (systemCode) {
    case 'P': // Powertrain (moteur et transmission)
      return 'high';
    case 'C': // Chassis (freins, direction, suspensions)
      return 'medium';
    case 'B': // Body (habitacle)
      return 'low';
    case 'U': // Network (réseau de communication)
      return 'medium';
    default:
      return 'unknown';
  }
}

module.exports = router;