const mongoose = require('mongoose');

const livePositionSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  license_plate: { type: String, required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  timestamp: { type: String, required: true },
  recorded_at: { type: String, required: true },
  status: { type: String, enum: ['in port', 'out of the port'], required: true }
}, {
  collection: 'live_position'
});

module.exports = mongoose.model('LivePosition', livePositionSchema);