const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Champs existants dans la collection
  nom: {
    type: String,
    required: true
  },
  prenom: {
    type: String,
    required: true
  },
  age: {
    type: String // Gardé en String puisqu'il apparaît comme tel dans votre collection
  },
  adresse: {
    type: String
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'agent', 'conducteur'],
    required: true
  },
  // Nouveau champ status avec valeur par défaut "active"
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  // Champ existant dans le modèle actuel (conservé avec valeur par défaut)
  date: {
    type: Date,
    default: Date.now
  },
  // Middleware pour combiner nom et prénom en name (pour assurer la compatibilité)
  name: {
    type: String,
    // Généré automatiquement à partir de nom et prénom
    get: function() {
      return this.prenom + " " + this.nom;
    }
  },
  uid: {
  type: String,
  default: null
}
});

// Middleware pre-save pour définir le champ name
UserSchema.pre('save', function(next) {
  this.name = this.prenom + " " + this.nom;
  next();
});

module.exports = mongoose.model('user', UserSchema);