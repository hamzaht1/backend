// models/RfidReader.js
const mongoose = require('mongoose');

const rfidReaderSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  reader_id: {
    type: String,
    required: true,
    unique: true
  },
  point_restock_id: {
    type: String,
    required: true,
    ref: 'PointRestockLot'
  },
  location: {
    type: String,
    enum: ['entry', 'exit'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  last_check: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RfidReader', rfidReaderSchema, 'rfid_readers');