// models/ParkingSpace.js
const mongoose = require('mongoose');

const parkingSpaceSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  parking_id: {
    type: String,
    required: true,
    ref: 'ParkingLot'
  },
  space_number: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['libre', 'occupé', 'réservé', 'maintenance'],
    default: 'libre'
  },
  vehicle_rfid: {
    type: String,
    default: null
  },
  vehicle_license_plate: {
    type: String,
    default: null
  },
  last_updated: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['standard', 'vip', 'disabled'],
    default: 'standard'
  },
  entry_time: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Index composé pour recherche efficace
parkingSpaceSchema.index({ parking_id: 1, space_number: 1 }, { unique: true });
parkingSpaceSchema.index({ status: 1 });
parkingSpaceSchema.index({ vehicle_rfid: 1 });

// Pre-save middleware pour mettre à jour last_updated
parkingSpaceSchema.pre('save', function(next) {
  this.last_updated = Date.now();
  next();
});

// Méthode virtuelle pour calculer la durée d'occupation
parkingSpaceSchema.virtual('duration').get(function() {
  if (this.entry_time && this.status === 'occupé') {
    const now = new Date();
    const diff = now - this.entry_time;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
  return null;
});

// Méthode statique pour comptabiliser les espaces par lot
parkingSpaceSchema.statics.getSpaceStatusCount = function(parkingId) {
  return this.aggregate([
    { $match: { parking_id: parkingId } },
    { 
      $group: { 
        _id: '$status', 
        count: { $sum: 1 } 
      } 
    }
  ]);
};

module.exports = mongoose.model('ParkingSpace', parkingSpaceSchema, 'parking_spaces');