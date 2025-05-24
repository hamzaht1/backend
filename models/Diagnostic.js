// models/Diagnostique.js
const mongoose = require('mongoose');

const DiagnostiqueSchema = new mongoose.Schema({
  obd_data_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ObdData',
    required: true
  },
  uid: {
    type: String,
    required: true
  },
  license_plate: {
    type: String,
    required: true
  },
  dtc_code: {
    type: String,
    default: null
  },
  regime_moteur: {
    type: Number,
    default: null
  },
  fuel_level: {
    type: Number,
    default: null
  },
  speed: {
    type: Number,
    default: null
  },
  original_timestamp: {
    type: Date,
    required: true
  },
  diagnostic_timestamp: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: "Aucun problème détecté"
  },
  symptoms: {
    type: String,
    default: "N/A"
  },
  solutions: {
    type: String,
    default: "N/A"
  },
  status: {
    type: String,
    enum: ['processed', 'pending', 'error'],
    default: 'processed'
  }
}, { collection: 'diagnostique' }); // Spécifier explicitement le nom de la collection

// Méthode virtuelle pour déterminer le type de panne
DiagnostiqueSchema.virtual('fault_type').get(function() {
  if (!this.dtc_code) return 'none';
  
  const prefix = this.dtc_code.charAt(0).toUpperCase();
  
  switch(prefix) {
    case 'P': return 'engine';
    case 'C': return 'body';
    case 'B': return 'accident';
    default: return 'other';
  }
});

// Inclure les virtuels lors de la conversion en JSON
DiagnostiqueSchema.set('toJSON', { virtuals: true });
DiagnostiqueSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Diagnostique', DiagnostiqueSchema);