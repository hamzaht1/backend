// models/Client.js
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  adresse: { type: String, required: true },
  coordonnees: {
    lat: { type: Number },
    long: { type: Number }
  },
  email: { type: String },
  phone: { type: String }
}, {
  collection: 'client'
});

module.exports = mongoose.model('Client', clientSchema);