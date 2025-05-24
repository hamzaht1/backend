// models/VehicleStatistics.js
const mongoose = require('mongoose');

const vehicleStatisticsSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
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

// Index pour améliorer les performances
vehicleStatisticsSchema.index({ uid: 1 });
vehicleStatisticsSchema.index({ last_updated: -1 });

module.exports = mongoose.model('VehicleStatistics', vehicleStatisticsSchema, 'statistique');