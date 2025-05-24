// models/Driver.js - Version corrigée
const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  age: { type: Number, required: true },
  adresse: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  statut: { type: String, default: 'driver' }
}, {
  timestamps: true,
  collection: 'drivers' // Nom exact de votre collection
});

module.exports = mongoose.model('Driver', driverSchema);