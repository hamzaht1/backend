const express = require('express');
const router = express.Router();
const ParkingLot = require('../models/ParkingLot');

/**
 * @swagger
 * tags:
 *   name: Parking Controller
 *   description: Advanced parking management system
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ParkingStatus:
 *       type: object
 *       properties:
 *         lotId:
 *           type: string
 *         totalSpaces:
 *           type: number
 *         occupiedSpaces:
 *           type: number
 *         availableSpaces:
 *           type: number
 *         vehicles:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               vehicleId:
 *                 type: string
 *               spaceId:
 *                 type: string
 *               entryTime:
 *                 type: string
 *                 format: date-time
 *     ParkingLot:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           description: Name of the parking lot
 *         capacity:
 *           type: number
 *           description: Total capacity of the lot
 *         location:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *             lng:
 *               type: number
 *         status:
 *           type: string
 *           enum: [active, maintenance, closed]
 *     ParkingSpace:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         lotId:
 *           type: string
 *           description: ID of the parking lot
 *         spaceNumber:
 *           type: string
 *           description: Space identifier
 *         status:
 *           type: string
 *           enum: [available, occupied, reserved, maintenance]
 *         vehicleId:
 *           type: string
 *           description: ID of the vehicle occupying the space
 *         entryTime:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/parking/status:
 *   get:
 *     summary: Get current parking status
 *     tags: [Parking Controller]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current parking status
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ParkingStatus'
 */

/**
 * @swagger
 * /api/parking/vehicle/{vehicleId}/entry:
 *   post:
 *     summary: Record vehicle entry
 *     tags: [Parking Controller]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lotId
 *             properties:
 *               lotId:
 *                 type: string
 *               spaceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle entry recorded
 *       400:
 *         description: No spaces available
 */

/**
 * @swagger
 * /api/parking/vehicle/{vehicleId}/exit:
 *   post:
 *     summary: Record vehicle exit
 *     tags: [Parking Controller]
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
 *         description: Vehicle exit recorded
 *       404:
 *         description: Vehicle not found in parking
 */

/**
 * @swagger
 * /api/parking/lots:
 *   get:
 *     summary: Get all parking lots
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of parking lots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ParkingLot'
 */

/**
 * @swagger
 * /api/parking/spaces/{lotId}:
 *   get:
 *     summary: Get parking spaces for a specific lot
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lotId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of parking spaces
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ParkingSpace'
 */

// GET /api/parking/recommended - Récupérer les parkings avec le plus d'espaces disponibles
router.get('/recommended', async (req, res) => {
  try {
    const parkings = await ParkingLot.find({ status: 'active' })
      .sort({ available_spaces: -1 })
      .limit(10); // Limiter à 10 parkings pour éviter une surcharge
    res.json(parkings);
  } catch (error) {
    console.error('Erreur lors de la récupération des parkings:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;