// models/Trip.js
const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    index: true
  },
  license_plate: {
    type: String, 
    required: true
  },
  start_time: {
    type: Date,
    required: true
  },
  end_time: {
    type: Date,
    required: true
  },
  origin: {
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lon: Number
    }
  },
  destination: {
    name: String,
    address: String,
    coordinates: {
      lat: Number,
      lon: Number
    }
  },
  distance: {
    type: Number, // en kilomètres
    default: 0
  },
  duration: {
    type: Number, // en minutes
    default: 0
  },
  status: {
    type: String,
    enum: ['Complété', 'En cours', 'Annulé'],
    default: 'Complété'
  },
  waypoints: [{
    lat: Number,
    lon: Number,
    timestamp: Date
  }],
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Spécifier explicitement le nom de la collection "historique"
module.exports = mongoose.model('Trip', TripSchema, 'historique');