const mongoose = require('mongoose');

const pointRestockHistorySchema = new mongoose.Schema({
  point_restock_id: {
    type: String,
    required: true,
    ref: 'PointRestockLot'
  },
  space_number: {
    type: Number,
    required: true
  },
  rfid_tag: {
    type: String,
    required: true
  },
  license_plate: {
    type: String,
    required: true
  },
  event_type: {
    type: String,
    enum: ['entry', 'exit'],
    required: true
  },
  reader_id: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number, // durée en minutes, null pour les entrées
    default: null
  }
});

// Index pour accélérer les requêtes
pointRestockHistorySchema.index({ point_restock_id: 1, timestamp: -1 });
pointRestockHistorySchema.index({ rfid_tag: 1, timestamp: -1 });
pointRestockHistorySchema.index({ license_plate: 1, timestamp: -1 });

module.exports = mongoose.model('PointRestockHistory', pointRestockHistorySchema, 'point_restock_history');