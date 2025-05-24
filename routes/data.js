// routes/data.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Endpoint pour récupérer les livraisons en cours
router.get('/delivery-en-cours', async (req, res) => {
    try {
        const deliveries = await mongoose.connection.db.collection('livraison_encours').aggregate([
          {
            // Jointure pour l'origine
            $lookup: {
              from: "client", // Nom de votre collection client
              localField: "origin", // Champ de la livraison correspondant à l'id du client
              foreignField: "_id", // Champ de la collection client
              as: "originDetails"
            }
          },
          {
            // Jointure pour la destination
            $lookup: {
              from: "client",
              localField: "destination",
              foreignField: "_id",
              as: "destinationDetails"
            }
          },
          {
            // Dans chacun des cas, extraire le premier résultat du tableau (puisqu'il y aura normalement un seul client par id)
            $addFields: {
              origin: { $arrayElemAt: ["$originDetails", 0] },
              destination: { $arrayElemAt: ["$destinationDetails", 0] }
            }
          },
          {
            // Optionnel : supprimer les champs temporaires
            $project: { originDetails: 0, destinationDetails: 0 }
          }
        ]).toArray();
        console.log(deliveries);
        res.json(deliveries);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
});

// Endpoint pour récupérer les positions en temps réel
router.get('/live-positions', async (req, res) => {
  try {
    const positions = await mongoose.connection.db
      .collection('live_position')
      .find({})
      .toArray();
    res.json(positions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint pour récupérer les véhicules
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await mongoose.connection.db
      .collection('vehicle')
      .find({})
      .toArray();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint pour récupérer les chauffeurs (drivers)
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await mongoose.connection.db
      .collection('drivers')
      .find({})
      .toArray();
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint pour récupérer les clients
router.get('/clients', async (req, res) => {
  try {
    const clients = await mongoose.connection.db
      .collection('client')
      .find({})
      .toArray();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
