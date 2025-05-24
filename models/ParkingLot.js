// models/ParkingLot.js (Mise à jour du modèle existant)
const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema({
  parking_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  total_spaces: {
    type: Number,
    required: true
  },
  available_spaces: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Index pour améliorer les performances
parkingLotSchema.index({ parking_id: 1 });
parkingLotSchema.index({ status: 1 });

// Pre-save middleware pour mettre à jour updated_at
parkingLotSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Méthode virtuelle pour calculer le taux d'occupation
parkingLotSchema.virtual('occupancy_rate').get(function() {
  return ((this.total_spaces - this.available_spaces) / this.total_spaces * 100);
});

module.exports = mongoose.model('ParkingLot', parkingLotSchema, 'parking_lots');