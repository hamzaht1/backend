const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète';

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - nom
 *         - prenom
 *         - email
 *         - password
 *         - role
 *       properties:
 *         nom:
 *           type: string
 *           description: User's last name
 *         prenom:
 *           type: string
 *           description: User's first name
 *         age:
 *           type: string
 *           description: User's age
 *         adresse:
 *           type: string
 *           description: User's address
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         phone:
 *           type: string
 *           description: User's phone number
 *         password:
 *           type: string
 *           description: User's password
 *         role:
 *           type: string
 *           enum: [admin, agent, conducteur]
 *           description: User's role in the system
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended, pending]
 *           default: active
 *           description: User's account status
 *         date:
 *           type: string
 *           format: date-time
 *           description: Account creation date
 *         name:
 *           type: string
 *           description: Full name (automatically generated from nom and prenom)
 *         uid:
 *           type: string
 *           description: Unique identifier for the user
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - prenom
 *               - email
 *               - password
 *               - role
 *             properties:
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, agent, conducteur]
 *               age:
 *                 type: string
 *               adresse:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email already exists
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account inactive or suspended
 */

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

// Route d'enregistrement
router.post('/register', async (req, res) => {
  try {
    const { 
      nom, 
      prenom, 
      email, 
      password, 
      role, 
      age,
      adresse,
      phone,
      uid 
    } = req.body;
    
    // Vérification si l'utilisateur existe déjà
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'L\'utilisateur existe déjà' });
    }
    
    // Vérification des champs requis
    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'Les champs nom, prenom, email, password et role sont obligatoires' 
      });
    }

    // Création du nouvel utilisateur
    user = new User({
      nom,
      prenom,
      email,
      password,
      role,
      age: age || '',
      adresse: adresse || '',
      phone: phone || '',
      status: 'active',
      uid: uid || null,
      // name sera automatiquement généré via le middleware pre-save
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
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        status: user.status,
        name: `${user.prenom} ${user.nom}`,
        uid: user.uid
      }
    };
    
    res.status(201).json(response);
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