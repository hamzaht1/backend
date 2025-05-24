const express = require('express');
const router = express.Router();
const PointRestockLot = require('../models/PointRestockLot');

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