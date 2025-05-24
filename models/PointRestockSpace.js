const mongoose = require('mongoose');

const pointRestockSpaceSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  point_restock_id: {
    type: String,
    required: true,
    ref: 'PointRestockLot'
  },
  space_number: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['occupé', 'libre', 'réservé', 'maintenance'],
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
  }
});

// Index composé pour garantir l'unicité de la combinaison lot + numéro d'espace
pointRestockSpaceSchema.index({ point_restock_id: 1, space_number: 1 }, { unique: true });

module.exports = mongoose.model('PointRestockSpace', pointRestockSpaceSchema, 'point_restock_spaces');