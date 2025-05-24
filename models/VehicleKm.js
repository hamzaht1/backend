// models/VehicleKm.js
const mongoose = require('mongoose');

const vehicleKmSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true // Ceci crée automatiquement un index
  },
  total_km: {
    type: Number,
    required: true,
    default: 0
  },
  last_updated: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Add index for better performance (seulement pour les champs qui n'ont pas unique: true)
vehicleKmSchema.index({ last_updated: 1 });
// Supprimé l'index dupliqué sur uid car il est déjà créé par unique: true

module.exports = mongoose.model('VehicleKm', vehicleKmSchema, 'statistique');