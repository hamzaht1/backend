const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète';

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Données reçues :', { email });
    
    // Recherche de l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Utilisateur non trouvé :', email);
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    // Vérification du mot de passe avec bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    // Création du payload avec l'ID, le rôle et le status de l'utilisateur
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        status: user.status || 'active', // Ajouter le status au payload
        vehicleId: user.role === 'conducteur' ? user.uid : null // Ajouter vehicleId au payload si conducteur
      }
    };
    
    // Génération du token JWT
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    // Préparation de la réponse
    const response = {
      token,
      role: user.role,
      status: user.status || 'active',
      name: user.name || `${user.prenom} ${user.nom}`,
      userId: user.id
    };
    
    // Ajouter vehicleId à la réponse si le rôle est conducteur
    if (user.role === 'conducteur' && user.uid) {
      response.vehicleId = user.uid;
    }
    
    // Envoi de la réponse
    res.json(response);
  } catch (err) {
    console.error('Erreur serveur :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour vérifier la validité du token
router.get('/verify', auth, (req, res) => {
  // Si le middleware auth a passé, le token est valide
  res.json({ valid: true, user: req.user });
});

// Route d'enregistrement (si nécessaire)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, status, vehicleId } = req.body;
    
    // Vérification si l'utilisateur existe déjà
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'L\'utilisateur existe déjà' });
    }
    
    // Création du nouvel utilisateur
    user = new User({
      name,
      email,
      password,
      role: role || 'conducteur', // Par défaut, le rôle est 'conducteur'
      status: status || 'active',  // Par défaut, le status est 'active'
      // Ajouter vehicleId uniquement si le rôle est conducteur
      ...(role === 'conducteur' || !role ? { vehicleId } : {})
    });
    
    // Hashage du mot de passe
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Sauvegarde de l'utilisateur
    await user.save();
    
    // Création du payload JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        status: user.status,
        vehicleId: user.role === 'conducteur' ? user.vehicleId : null // Ajouter vehicleId au payload si conducteur
      }
    };
    
    // Génération du token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    // Préparation de la réponse
    const response = {
      token, 
      role: user.role,
      status: user.status,
      name: user.name,
      userId: user.id
    };
    
    // Ajouter vehicleId à la réponse si le rôle est conducteur
    if (user.role === 'conducteur' && user.vehicleId) {
      response.vehicleId = user.vehicleId;
    }
    
    res.json(response);
  } catch (err) {
    console.error('Erreur serveur:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour récupérer le profil de l'utilisateur connecté
router.get('/profile', auth, async (req, res) => {
  try {
    // Récupérer l'utilisateur à partir de l'ID stocké dans le token
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Erreur serveur:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour mettre à jour le profil de l'utilisateur connecté
router.put('/profile', auth, async (req, res) => {
  try {
    // Récupérer l'utilisateur à partir de l'ID stocké dans le token
    let user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Extraire les champs à mettre à jour
    const { nom, prenom, email, telephone, adresse, vehicleId } = req.body;
    
    // Vérifier si un autre utilisateur utilise déjà cet email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }
    
    // Mettre à jour les champs
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (email) user.email = email;
    if (telephone) user.telephone = telephone;
    if (adresse) user.adresse = adresse;
    // Mettre à jour vehicleId seulement si l'utilisateur est un conducteur
    if (vehicleId && user.role === 'conducteur') user.vehicleId = vehicleId;
    
    // Enregistrer les modifications
    await user.save();
    
    // Retourner l'utilisateur mis à jour (sans le mot de passe)
    user = await User.findById(req.user.id).select('-password');
    res.json(user);
    
  } catch (err) {
    console.error('Erreur lors de la mise à jour du profil:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;