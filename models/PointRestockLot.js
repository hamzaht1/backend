const mongoose = require('mongoose');

const pointRestockLotSchema = new mongoose.Schema({
  point_restock_id: {
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
    required: true,
    default: 30
  },
  available_spaces: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
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

module.exports = mongoose.model('PointRestockLot', pointRestockLotSchema, 'point_restock_lots');