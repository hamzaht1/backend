// ===== ROUTER CORRIGÉ =====
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Diagnostique = require('../models/Diagnostic');
const Vehicle = require('../models/Vehicle');

// Récupérer diagnostics liés au véhicule du conducteur connecté
router.get('/', auth, async (req, res) => {
  try {
    const vehicleId = req.user?.vehicleId;
    
    if (!vehicleId) {
      return res.status(403).json({ message: 'Aucun véhicule associé à cet utilisateur.' });
    }
    
    console.log('Vehicle ID:', vehicleId); // Déplacé après la vérification
    
    // Utiliser vehicleId directement comme string pour uid
    const diagnostics = await Diagnostique.find({ uid: vehicleId }).lean();
    
    // Si vehicleId est un UUID, chercher par uid ou license_plate
    // Si vehicleId est un ObjectId, utiliser findById
    let vehicle;
    if (vehicleId.includes('-')) {
      // C'est un UUID, chercher par uid
      vehicle = await Vehicle.findOne({ uid: vehicleId }).lean();
    } else {
      // C'est probablement un ObjectId
      vehicle = await Vehicle.findById(vehicleId).lean();
    }
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé.' });
    }
    
    res.json({ vehicle, diagnostics });
  } catch (err) {
    console.error('Erreur lors de la récupération des diagnostics:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Récupérer un diagnostic précis pour le véhicule connecté
router.get('/:id', auth, async (req, res) => {
  try {
    const vehicleId = req.user?.vehicleId;
    
    if (!vehicleId) {
      return res.status(403).json({ message: 'Aucun véhicule associé à cet utilisateur.' });
    }
    
    // Vérifier si l'ID est un ObjectId valide
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID de diagnostic invalide.' });
    }
    
    // Chercher le diagnostic par _id et uid
    const diag = await Diagnostique.findOne({ 
      _id: req.params.id, 
      uid: vehicleId 
    }).lean();
    
    if (!diag) {
      return res.status(404).json({ message: 'Diagnostic non trouvé pour ce véhicule.' });
    }
    
    // Chercher le véhicule
    let vehicle;
    if (vehicleId.includes('-')) {
      vehicle = await Vehicle.findOne({ uid: vehicleId }).lean();
    } else {
      vehicle = await Vehicle.findById(vehicleId).lean();
    }
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Véhicule non trouvé.' });
    }
    
    res.json({ vehicle, diagnostic: diag });
  } catch (err) {
    console.error('Erreur lors de la récupération du diagnostic:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router