const express = require('express');
const router = express.Router();
const ParkingLot = require('../models/ParkingLot');

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