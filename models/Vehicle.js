const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  license_plate: {
    type: String,
    required: true,
    unique: true
  },
  rfid_tag: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  driver_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
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

vehicleSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema, 'vehicules');