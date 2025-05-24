const mongoose = require('mongoose');

const livraisonSchema = new mongoose.Schema({
  id_camion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  type_marchandise: {
    type: String,
    required: true,
    enum: ['matériel', 'nourriture', 'équipement', 'documents', 'électronique', 'textile', 'chimique']
  },
  id_driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
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
    type: String,
    required: true
  },
  estimated_arrival: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'],
    default: 'scheduled'
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

// Index pour améliorer les performances
livraisonSchema.index({ status: 1 });
livraisonSchema.index({ date_debut: 1 });
livraisonSchema.index({ id_camion: 1 });

// Pre-save middleware pour mettre à jour updated_at
livraisonSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Méthodes statiques pour obtenir les livraisons par statut
livraisonSchema.statics.findScheduled = function() {
  return this.find({ status: 'scheduled' });
};

livraisonSchema.statics.findInProgress = function() {
  return this.find({ status: 'in_progress' });
};

livraisonSchema.statics.findCompleted = function() {
  return this.find({ status: 'completed' });
};

// Virtuel pour calculer la durée prévue
livraisonSchema.virtual('duree_prevue').get(function() {
  if (this.date_debut && this.date_fin_prevue) {
    return (this.date_fin_prevue - this.date_debut) / (1000 * 60 * 60); // en heures
  }
  return 0;
});

// Exporter avec les deux noms de collection
const LivraisonPrevu = mongoose.model('LivraisonPrevu', livraisonSchema, 'livraison_prevu');
const LivraisonEnCours = mongoose.model('LivraisonEnCours', livraisonSchema, 'livraison_encours');

module.exports = { LivraisonPrevu, LivraisonEnCours, livraisonSchema };