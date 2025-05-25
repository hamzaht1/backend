const express = require('express');
const router = express.Router();
const PointRestockLot = require('../models/PointRestockLot');

/**
 * @swagger
 * tags:
 *   name: Restock Controller
 *   description: Advanced restock point management and operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RestockOperation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         pointId:
 *           type: string
 *         vehicleId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [loading, unloading]
 *         quantity:
 *           type: number
 *         timestamp:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [pending, in-progress, completed]
 */

/**
 * @swagger
 * /api/pointRestock/operations:
 *   get:
 *     summary: Get restock operations
 *     tags: [Restock Controller]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [loading, unloading]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed]
 *     responses:
 *       200:
 *         description: List of restock operations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RestockOperation'
 *   
 *   post:
 *     summary: Create new restock operation
 *     tags: [Restock Controller]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pointId
 *               - vehicleId
 *               - type
 *               - quantity
 *             properties:
 *               pointId:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [loading, unloading]
 *               quantity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Operation created successfully
 *       400:
 *         description: Invalid input or insufficient capacity
 */

/**
 * @swagger
 * /api/pointRestock/operations/{id}/status:
 *   put:
 *     summary: Update operation status
 *     tags: [Restock Controller]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed]
 *     responses:
 *       200:
 *         description: Operation status updated
 *       404:
 *         description: Operation not found
 */

/**
 * @swagger
 * /api/pointRestock/capacity:
 *   get:
 *     summary: Get restock points capacity status
 *     tags: [Restock Controller]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Capacity information for all restock points
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   pointId:
 *                     type: string
 *                   totalCapacity:
 *                     type: number
 *                   currentOccupancy:
 *                     type: number
 *                   availableCapacity:
 *                     type: number
 */

/**
 * @swagger
 * /api/pointRestock/recommended:
 *   get:
 *     summary: Récupérer les points de restock avec le plus d'espaces disponibles
 *     tags: [Restock Controller]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des points de restock avec espaces disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PointRestockLot'
 *       500:
 *         description: Erreur serveur
 */

// GET /api/pointRestock/recommended - Récupérer les points de restock avec le plus d'espaces disponibles
router.get('/recommended', async (req, res) => {
  try {
    const pointsRestock = await PointRestockLot.find({ status: 'active' })
      .sort({ available_spaces: -1 })
      .limit(10); // Limiter à 10 résultats pour des raisons de performance
    res.json(pointsRestock);
  } catch (error) {
    console.error('Erreur lors de la récupération des points de restock:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;