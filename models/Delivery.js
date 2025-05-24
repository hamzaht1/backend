const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  id_camion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  type_marchandise: {
    type: String,
    required: true
  },
  id_driver: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  date_debut: {
    type: Date,
    required: true
  },
  date_fin_prevue: {
    type: Date,
    required: true
  },
  origin: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  departure_time: {
    type: Date,
    required: true
  },
  estimated_arrival: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'delivered', 'cancelled'],
    
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

deliverySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema, 'livraison_encours');
