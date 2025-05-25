// routes/fleet.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const VehicleStatistics = require('../models/VehicleKm');
const Delivery = require('../models/Delivery');
const Diagnostic = require('../models/Diagnostic');

/**
 * @swagger
 * tags:
 *   name: Fleet
 *   description: Fleet management and vehicle operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       required:
 *         - uid
 *         - license_plate
 *         - rfid_tag
 *       properties:
 *         _id:
 *           type: string
 *         uid:
 *           type: string
 *           description: Unique identifier for the vehicle
 *         license_plate:
 *           type: string
 *           description: Vehicle's license plate number
 *         rfid_tag:
 *           type: string
 *           description: RFID tag identifier
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *           description: Current status of the vehicle
 *         driver:
 *           type: string
 *           description: ID of the assigned driver
 *         model:
 *           type: string
 *           description: Vehicle model
 *     VehicleStatistics:
 *       type: object
 *       properties:
 *         uid:
 *           type: string
 *         total_km:
 *           type: number
 *         monthly_data:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               month:
 *                 type: string
 *               km:
 *                 type: number
 *               deliveries:
 *                 type: number
 */

/**
 * @swagger
 * /api/fleet/overview:
 *   get:
 *     summary: Get fleet overview statistics
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fleet overview statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalVehicles:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                     change:
 *                       type: object
 *                       properties:
 *                         trend:
 *                           type: string
 *                           enum: [up, down]
 *                         value:
 *                           type: string
 *                         label:
 *                           type: string
 *                 trackedVehicles:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                     change:
 *                       type: object
 *                       properties:
 *                         trend:
 *                           type: string
 *                         value:
 *                           type: string
 *                         label:
 *                           type: string
 *                 connectedVehicles:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                     change:
 *                       type: object
 *                       properties:
 *                         trend:
 *                           type: string
 *                         value:
 *                           type: string
 *                         label:
 *                           type: string
 */

/**
 * @swagger
 * /api/fleet/vehicles:
 *   get:
 *     summary: Get vehicles with pagination and filtering
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive, maintenance]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of vehicles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalVehicles:
 *                       type: integer
 *                     vehiclesPerPage:
 *                       type: integer
 */

/**
 * @swagger
 * /api/fleet/vehicles/{id}:
 *   get:
 *     summary: Get vehicle details by ID
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       404:
 *         description: Vehicle not found
 */

/**
 * @swagger
 * /api/fleet/vehicles:
 *   post:
 *     summary: Create a new vehicle
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *               - license_plate
 *               - rfid_tag
 *             properties:
 *               uid:
 *                 type: string
 *               license_plate:
 *                 type: string
 *               rfid_tag:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               driver:
 *                 type: string
 *               model:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Vehicle already exists
 */

/**
 * @swagger
 * /api/fleet/vehicles/{id}:
 *   put:
 *     summary: Update a vehicle
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *               license_plate:
 *                 type: string
 *               rfid_tag:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               driver:
 *                 type: string
 *               model:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Vehicle not found
 */

/**
 * @swagger
 * /api/fleet/vehicles/{id}/status:
 *   put:
 *     summary: Update vehicle status
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *     responses:
 *       200:
 *         description: Vehicle status updated
 *       404:
 *         description: Vehicle not found
 */

/**
 * @swagger
 * /api/fleet/vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 *       404:
 *         description: Vehicle not found
 */

/**
 * @swagger
 * /api/fleet/vehicles/{id}/diagnostics:
 *   get:
 *     summary: Get diagnostics for a specific vehicle
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle diagnostics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicle:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     uid:
 *                       type: string
 *                     license_plate:
 *                       type: string
 *                 diagnostics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       dtc_code:
 *                         type: string
 *                       diagnostic_timestamp:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Vehicle not found
 */

/**
 * @swagger
 * /api/fleet/diagnostics:
 *   get:
 *     summary: Get all diagnostics (pour débogage)
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of diagnostics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 vehicles:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         dtc_code:
 *                           type: string
 *                         diagnostic_timestamp:
 *                           type: string
 *                           format: date-time
 */

/**
 * @swagger
 * /api/fleet:
 *   get:
 *     summary: Get all vehicles in fleet
 *     tags: [Fleet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vehicles in fleet
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// GET /api/fleet/overview - Get fleet overview statistics
router.get('/overview', async (req, res) => {
  try {
    // Parallele queries for better performance
    const [
      totalVehicles,
      trackedVehicles,
      connectedVehicles,
      recentActivity
    ] = await Promise.all([
      // Total vehicles count
      Vehicle.countDocuments(),
      
      // Vehicles with trackers (assuming all vehicles with rfid_tag have trackers)
      Vehicle.countDocuments({ rfid_tag: { $exists: true, $ne: null } }),
      
      // Connected vehicles (assuming active status means connected)
      Vehicle.countDocuments({ status: 'active' }),
      
      // Recent activity (deliveries from last week)
      Delivery.countDocuments({
        created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    // Calculate percentages for trends (placeholder - you can replace with real calculations)
    const previousTotal = Math.max(1, totalVehicles - Math.floor(Math.random() * 10));
    const totalTrend = ((totalVehicles - previousTotal) / previousTotal * 100).toFixed(1);
    
    const stats = {
      totalVehicles: {
        count: totalVehicles,
        change: {
          trend: totalTrend >= 0 ? 'up' : 'down',
          value: `${Math.abs(totalTrend)}%`,
          label: 'since last month'
        }
      },
      trackedVehicles: {
        count: trackedVehicles,
        change: {
          trend: 'down',
          value: '3%',
          label: 'since yesterday'
        }
      },
      connectedVehicles: {
        count: connectedVehicles,
        change: {
          trend: 'up',
          value: '8%',
          label: 'compared to previous period'
        }
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching fleet overview:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/fleet/vehicles - Get vehicles with pagination and filtering
router.get('/vehicles', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 6, 
      status = 'all',
      search = ''
    } = req.query;

    // Build query
    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { license_plate: { $regex: search, $options: 'i' } },
        { uid: { $regex: search, $options: 'i' } },
        { rfid_tag: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute queries in parallel
    const [vehicles, totalCount] = await Promise.all([
      Vehicle.find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ created_at: -1 }),
      Vehicle.countDocuments(query)
    ]);

    // Get statistics for each vehicle
    const vehiclesWithStats = await Promise.all(
      vehicles.map(async (vehicle) => {
        const stats = await VehicleStatistics.findOne({ uid: vehicle.uid });
        const recentDeliveries = await Delivery.find({ 
          id_camion: vehicle._id,
          created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).limit(5);

        // Récupérer les diagnostics récents pour les alertes
        const recentDiagnostics = await Diagnostic.find({
          $or: [
            { uid: vehicle.uid },
            { license_plate: vehicle.license_plate }
          ],
          dtc_code: { $ne: null, $exists: true }  // Uniquement les diagnostics avec des codes DTC
        })
        .sort({ diagnostic_timestamp: -1 })
        .limit(1);
        
        const hasAlert = recentDiagnostics.length > 0;

        // Generate mock monthly km data (replace with actual historical data)
        const monthlyKmData = Array(5).fill().map((_, i) => ({
          mois: ['J', 'F', 'M', 'A', 'M'][i],
          km: Math.floor(Math.random() * 200) + 100
        }));

        return {
          ...vehicle.toObject(),
          total_km: stats ? Math.round(stats.total_km) : 0,
          monthly_km_data: monthlyKmData,
          recent_deliveries_count: recentDeliveries.length,
          connectStatus: vehicle.status === 'active',
          hasAlert: hasAlert,
          alertCode: hasAlert ? recentDiagnostics[0].dtc_code : null
        };
      })
    );

    res.json({
      vehicles: vehiclesWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalVehicles: totalCount,
        vehiclesPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/fleet/vehicles/:id - Get a specific vehicle with details
router.get('/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find vehicle by ID or UID
    const vehicle = await Vehicle.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { uid: id }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Get vehicle statistics
    const stats = await VehicleStatistics.findOne({ uid: vehicle.uid });
    
    // Get recent deliveries
    const recentDeliveries = await Delivery.find({ 
      id_camion: vehicle._id 
    })
    .sort({ created_at: -1 })
    .limit(10)
    .populate('id_driver', 'name phone');

    // Récupérer les diagnostics du véhicule avec un log pour débogage
    const diagnostics = await Diagnostic.find({
      $or: [
        { uid: vehicle.uid },
        { license_plate: vehicle.license_plate }
      ]
    })
    .sort({ diagnostic_timestamp: -1 })
    .limit(10);

    console.log(`Diagnostics trouvés pour ${vehicle.license_plate}:`, diagnostics.length);
    
    // Si aucun diagnostic n'est trouvé, vérifiez avec cette requête plus large
    if (diagnostics.length === 0) {
      console.log("Aucun diagnostic trouvé. Tentative avec une requête plus large...");
      const allDiagnostics = await Diagnostic.find({}).limit(5);
      console.log("Échantillon de diagnostics disponibles:", 
        allDiagnostics.map(d => ({ 
          uid: d.uid, 
          license_plate: d.license_plate, 
          dtc_code: d.dtc_code
        }))
      );
    }

    // Calculer des statistiques sur les diagnostics
    const diagnosticStats = {
      total: diagnostics.length,
      withIssues: diagnostics.filter(d => d.dtc_code !== null && d.dtc_code !== undefined && d.dtc_code !== "").length,
      lastCheck: diagnostics.length > 0 ? diagnostics[0].diagnostic_timestamp : null
    };

    // Get monthly km data
    const monthlyStats = await VehicleStatistics.aggregate([
      { $match: { uid: vehicle.uid } },
      // Add your aggregation pipeline here for actual monthly data
    ]);

    const detailedVehicle = {
      ...vehicle.toObject(),
      total_km: stats ? Math.round(stats.total_km) : 0,
      connectStatus: vehicle.status === 'active',
      recent_deliveries: recentDeliveries,
      monthly_performance: monthlyStats || generateMockMonthlyData(),
      diagnostics: diagnostics,
      diagnosticStats: diagnosticStats
    };

    res.json(detailedVehicle);
  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/fleet/vehicles - Create a new vehicle
router.post('/vehicles', async (req, res) => {
  try {
    const { 
      uid, 
      license_plate, 
      rfid_tag, 
      status = 'active',
      driver = null,
      model = 'Camion'
    } = req.body;

    // Validate required fields
    if (!uid || !license_plate || !rfid_tag) {
      return res.status(400).json({
        message: 'Missing required fields: uid, license_plate, and rfid_tag are required'
      });
    }

    // Check if vehicle with this uid, license_plate, or rfid_tag already exists
    const existingVehicle = await Vehicle.findOne({
      $or: [
        { uid },
        { license_plate },
        { rfid_tag }
      ]
    });

    if (existingVehicle) {
      let field = '';
      if (existingVehicle.uid === uid) field = 'UID';
      else if (existingVehicle.license_plate === license_plate) field = 'License plate';
      else if (existingVehicle.rfid_tag === rfid_tag) field = 'RFID tag';
      
      return res.status(409).json({
        message: `${field} already exists on another vehicle`
      });
    }

    // Create new vehicle
    const newVehicle = new Vehicle({
      uid,
      license_plate,
      rfid_tag,
      status,
      driver,
      model,
      created_at: new Date(),
      updated_at: new Date()
    });

    await newVehicle.save();

    // Initialize vehicle statistics
    const newStats = new VehicleStatistics({
      uid,
      total_km: 0,
      created_at: new Date()
    });

    await newStats.save();

    res.status(201).json({
      message: 'Vehicle created successfully',
      vehicle: newVehicle
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/fleet/vehicles/:id - Update a vehicle
router.put('/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      uid, 
      license_plate, 
      rfid_tag, 
      status,
      driver,
      model
    } = req.body;

    // Validate required fields
    if (!uid || !license_plate || !rfid_tag) {
      return res.status(400).json({
        message: 'Missing required fields: uid, license_plate, and rfid_tag are required'
      });
    }

    // Check if vehicle exists
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if the updated values conflict with other vehicles
    if (uid !== vehicle.uid || license_plate !== vehicle.license_plate || rfid_tag !== vehicle.rfid_tag) {
      const existingVehicle = await Vehicle.findOne({
        _id: { $ne: id },
        $or: [
          { uid },
          { license_plate },
          { rfid_tag }
        ]
      });

      if (existingVehicle) {
        let field = '';
        if (existingVehicle.uid === uid) field = 'UID';
        else if (existingVehicle.license_plate === license_plate) field = 'License plate';
        else if (existingVehicle.rfid_tag === rfid_tag) field = 'RFID tag';
        
        return res.status(409).json({
          message: `${field} already exists on another vehicle`
        });
      }
    }

    // Update vehicle
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id,
      {
        uid,
        license_plate,
        rfid_tag,
        status,
        driver,
        model,
        updated_at: new Date()
      },
      { new: true }
    );

    // If UID has changed, update the statistics record
    if (uid !== vehicle.uid) {
      await VehicleStatistics.findOneAndUpdate(
        { uid: vehicle.uid },
        { uid: uid }
      );
    }

    res.json({
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/fleet/vehicles/:id/status - Update vehicle status
router.put('/vehicles/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { status, updated_at: new Date() },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ message: 'Vehicle status updated', vehicle });
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/fleet/vehicles/:id - Delete a vehicle
router.delete('/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Delete the vehicle
    await Vehicle.findByIdAndDelete(id);

    // Delete associated statistics
    await VehicleStatistics.findOneAndDelete({ uid: vehicle.uid });

    res.json({
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/fleet/vehicles/:id/diagnostics - Get diagnostics for a specific vehicle
router.get('/vehicles/:id/diagnostics', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find vehicle by ID or UID
    const vehicle = await Vehicle.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { uid: id }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Récupérer les diagnostics
    const diagnostics = await Diagnostic.find({
      $or: [
        { uid: vehicle.uid },
        { license_plate: vehicle.license_plate }
      ]
    })
    .sort({ diagnostic_timestamp: -1 })
    .limit(20);

    console.log(`API Diagnostics pour ${vehicle.license_plate}: ${diagnostics.length} trouvés`);

    res.json({
      vehicle: {
        _id: vehicle._id,
        uid: vehicle.uid,
        license_plate: vehicle.license_plate
      },
      diagnostics: diagnostics
    });
  } catch (error) {
    console.error('Error fetching vehicle diagnostics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/fleet/diagnostics - Get all diagnostics (pour débogage)
router.get('/diagnostics', async (req, res) => {
  try {
    // Récupérer tous les diagnostics (limités à 100 pour éviter de surcharger)
    const diagnostics = await Diagnostic.find({}).limit(100);
    
    console.log(`Total diagnostics trouvés: ${diagnostics.length}`);
    
    // Regrouper par véhicule pour faciliter la compréhension
    const vehicleDiagnostics = {};
    
    diagnostics.forEach(diag => {
      const key = diag.license_plate || diag.uid;
      if (!vehicleDiagnostics[key]) {
        vehicleDiagnostics[key] = [];
      }
      vehicleDiagnostics[key].push(diag);
    });
    
    res.json({
      total: diagnostics.length,
      vehicles: Object.keys(vehicleDiagnostics).length,
      data: vehicleDiagnostics
    });
  } catch (error) {
    console.error('Error fetching diagnostics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate mock monthly data
function generateMockMonthlyData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map(month => ({
    month,
    km: Math.floor(Math.random() * 200) + 100,
    deliveries: Math.floor(Math.random() * 10) + 5
  }));
}

module.exports = router;