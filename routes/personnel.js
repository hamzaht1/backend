// routes/personnel.js - Version modifiée avec gestion de password et status
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // Assurez-vous d'installer ce package

// Fonction pour générer un mot de passe hashé aléatoire
async function generateHashedPassword() {
  // Générer un mot de passe aléatoire de 10 caractères
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomPassword = '';
  for (let i = 0; i < 10; i++) {
    randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Hasher le mot de passe
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(randomPassword, salt);
  
  console.log('Mot de passe temporaire généré:', randomPassword); // Pour le débogage, à supprimer en production
  return hashedPassword;
}

// Fonctions utilitaires pour formater les données
function formatAgent(agent) {
  return {
    id: agent._id.toString(),
    name: `${agent.prenom} ${agent.nom}`,
    company: 'Administration',
    phone: agent.phone,
    email: agent.email,
    country: 'Tunisia',
    // Utilise le statut de l'utilisateur s'il existe ou 'Active' par défaut
    status: agent.status ? agent.status.charAt(0).toUpperCase() + agent.status.slice(1) : 'Active',
    role: 'Agent Administratif',
    statut: agent.statut,
    type: 'agent',
    createdAt: agent.createdAt || agent.date
  };
}

function formatDriver(driver) {
  return {
    id: driver._id.toString(),
    name: `${driver.prenom} ${driver.nom}`,
    company: 'Transport',
    phone: driver.phone,
    email: driver.email,
    country: 'Tunisia',
    // Utilise le statut de l'utilisateur s'il existe ou 'Active' par défaut
    status: driver.status ? driver.status.charAt(0).toUpperCase() + driver.status.slice(1) : 'Active',
    role: 'Driver',
    type: 'driver',
    createdAt: driver.createdAt || driver.date
  };
}

// GET /api/personnel/overview - Vue d'ensemble
router.get('/overview', async (req, res) => {
  try {
    console.log('Fetching overview...');
    
    // Récupérer tous les agents et conducteurs
    const [agents, drivers] = await Promise.all([
      User.find({ role: 'agent' }),
      User.find({ role: 'conducteur' })
    ]);

    console.log(`Found ${agents.length} agents and ${drivers.length} drivers`);

    const totalEmployees = agents.length + drivers.length;
    const totalDrivers = drivers.length;
    const totalAdminAgents = agents.length;

    // Stats cards avec données réelles
    const statsCards = [
      {
        title: 'Total Employés',
        count: totalEmployees.toString(),
        change: { value: '16%', trend: 'up', label: 'this month' },
        icon: 'users',
        color: '#4F46E5',
        chartData: [
          { value: totalEmployees, color: '#4F46E5' },
          { value: Math.max(0, 6000 - totalEmployees), color: '#e2e8f0' }
        ]
      },
      {
        title: 'Drivers',
        count: totalDrivers.toString(),
        change: { value: '1%', trend: 'down', label: 'this month' },
        icon: 'user',
        color: '#0EA5E9',
        chartData: [
          { value: totalDrivers, color: '#0EA5E9' },
          { value: Math.max(0, 2000 - totalDrivers), color: '#e2e8f0' }
        ]
      },
      {
        title: 'Agent Administratif',
        count: totalAdminAgents.toString(),
        avatars: ['user1', 'user2', 'user3', 'user4', 'user5'],
        icon: 'monitor',
        color: '#10B981',
        chartData: [
          { value: totalAdminAgents, color: '#10B981' },
          { value: Math.max(0, 200 - totalAdminAgents), color: '#e2e8f0' }
        ]
      }
    ];

    res.json({
      statsCards,
      totals: {
        employees: totalEmployees,
        drivers: totalDrivers,
        agents: totalAdminAgents
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/personnel/list - Liste de tout le personnel
router.get('/list', async (req, res) => {
  try {
    console.log('Fetching personnel list with params:', req.query);
    
    const { page = 1, limit = 8, search = '', sort = 'newest', role = 'all' } = req.query;

    // Construire les requêtes pour agents et conducteurs
    const searchRegex = search ? new RegExp(search, 'i') : null;
    
    let agentQuery = { role: 'agent' };
    let driverQuery = { role: 'conducteur' };

    if (searchRegex) {
      agentQuery.$or = [
        { nom: searchRegex },
        { prenom: searchRegex },
        { email: searchRegex }
      ];
      
      driverQuery.$or = [
        { nom: searchRegex },
        { prenom: searchRegex },
        { email: searchRegex }
      ];
    }

    // Récupérer les données selon le filtre de rôle
    let personnel = [];
    
    console.log(`Fetching ${role} with queries:`, { agentQuery, driverQuery });
    
    if (role === 'all' || role === 'agent') {
      const agents = await User.find(agentQuery);
      console.log(`Found ${agents.length} agents`);
      personnel.push(...agents.map(agent => formatAgent(agent)));
    }
    
    if (role === 'all' || role === 'driver') {
      const drivers = await User.find(driverQuery);
      console.log(`Found ${drivers.length} drivers`);
      personnel.push(...drivers.map(driver => formatDriver(driver)));
    }

    console.log(`Total personnel found: ${personnel.length}`);

    // Trier les résultats
    switch (sort) {
      case 'newest':
        personnel.sort((a, b) => new Date(b.createdAt || new Date()) - new Date(a.createdAt || new Date()));
        break;
      case 'oldest':
        personnel.sort((a, b) => new Date(a.createdAt || new Date()) - new Date(b.createdAt || new Date()));
        break;
      case 'nameAsc':
        personnel.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'nameDesc':
        personnel.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPersonnel = personnel.slice(startIndex, endIndex);

    const result = {
      personnel: paginatedPersonnel,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(personnel.length / limit),
        totalItems: personnel.length,
        itemsPerPage: parseInt(limit)
      }
    };

    console.log('Sending response with', paginatedPersonnel.length, 'items');
    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération du personnel:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/personnel/agent - Créer un nouvel agent
router.post('/agent', async (req, res) => {
  try {
    // Vérifier si un mot de passe a été fourni, sinon en générer un
    const hashedPassword = req.body.password || await generateHashedPassword();
    
    // Préparer les données pour l'utilisateur
    const agentData = {
      ...req.body,
      password: hashedPassword,
      role: 'agent',
      // Ajouter le status par défaut "active" s'il n'est pas spécifié
      status: req.body.status || 'active'
    };

    // Créer un nom si seulement prenom et nom sont fournis
    if (!agentData.name && agentData.prenom && agentData.nom) {
      agentData.name = `${agentData.prenom} ${agentData.nom}`;
    }
    
    console.log('Creating agent with data:', {
      ...agentData,
      password: '***HIDDEN***' // Ne pas logger le mot de passe
    });
    
    const agent = new User(agentData);
    await agent.save();
    
    console.log('Agent créé avec succès, ID:', agent._id);
    
    res.status(201).json({
      message: 'Agent créé avec succès',
      agent: formatAgent(agent)
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'agent:', error);
    res.status(400).json({ message: 'Erreur lors de la création', error: error.message });
  }
});

// POST /api/personnel/driver - Créer un nouveau driver
router.post('/driver', async (req, res) => {
  try {
    // Vérifier si un mot de passe a été fourni, sinon en générer un
    const hashedPassword = req.body.password || await generateHashedPassword();
    
    // Préparer les données pour l'utilisateur
    const driverData = {
      ...req.body,
      password: hashedPassword,
      role: 'conducteur',
      // Ajouter le status par défaut "active" s'il n'est pas spécifié
      status: req.body.status || 'active'
    };

    // Créer un nom si seulement prenom et nom sont fournis
    if (!driverData.name && driverData.prenom && driverData.nom) {
      driverData.name = `${driverData.prenom} ${driverData.nom}`;
    }
    
    console.log('Creating driver with data:', {
      ...driverData,
      password: '***HIDDEN***' // Ne pas logger le mot de passe
    });
    
    const driver = new User(driverData);
    await driver.save();
    
    console.log('Driver créé avec succès, ID:', driver._id);
    
    res.status(201).json({
      message: 'Driver créé avec succès',
      driver: formatDriver(driver)
    });
  } catch (error) {
    console.error('Erreur lors de la création du driver:', error);
    res.status(400).json({ message: 'Erreur lors de la création', error: error.message });
  }
});

// GET /api/personnel/:type/:id - Récupérer un personnel spécifique
router.get('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    let person;
    let role;

    if (type === 'agent') {
      role = 'agent';
    } else if (type === 'driver') {
      role = 'conducteur';
    } else {
      return res.status(400).json({ message: 'Type invalide' });
    }

    person = await User.findOne({ _id: id, role });

    if (!person) {
      return res.status(404).json({ message: 'Personnel non trouvé' });
    }

    if (type === 'agent') {
      person = formatAgent(person);
    } else {
      person = formatDriver(person);
    }

    res.json(person);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT /api/personnel/:type/:id - Mettre à jour un personnel
router.put('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    let person;
    let role;

    if (type === 'agent') {
      role = 'agent';
    } else if (type === 'driver') {
      role = 'conducteur';
    } else {
      return res.status(400).json({ message: 'Type invalide' });
    }

    // Préserver le rôle
    const updateData = {
      ...req.body,
      role
    };

    // Mettre à jour le nom si prenom et nom sont fournis
    if (!updateData.name && updateData.prenom && updateData.nom) {
      updateData.name = `${updateData.prenom} ${updateData.nom}`;
    }

    person = await User.findByIdAndUpdate(id, updateData, { new: true });

    if (!person) {
      return res.status(404).json({ message: 'Personnel non trouvé' });
    }

    if (type === 'agent') {
      person = formatAgent(person);
    } else {
      person = formatDriver(person);
    }

    res.json({
      message: 'Personnel mis à jour avec succès',
      person: person
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE /api/personnel/:type/:id - Supprimer un personnel
router.delete('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    let result;
    let role;

    if (type === 'agent') {
      role = 'agent';
    } else if (type === 'driver') {
      role = 'conducteur';
    } else {
      return res.status(400).json({ message: 'Type invalide' });
    }

    result = await User.findOneAndDelete({ _id: id, role });

    if (!result) {
      return res.status(404).json({ message: 'Personnel non trouvé' });
    }

    res.json({ message: 'Personnel supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route de test pour vérifier la connexion
router.get('/test', async (req, res) => {
  try {
    const agentCount = await User.countDocuments({ role: 'agent' });
    const driverCount = await User.countDocuments({ role: 'conducteur' });
    
    console.log('Agent count:', agentCount);
    console.log('Driver count:', driverCount);
    
    const agent = await User.findOne({ role: 'agent' });
    const driver = await User.findOne({ role: 'conducteur' });
    
    res.json({
      agents: agentCount,
      drivers: driverCount,
      sampleAgent: agent,
      sampleDriver: driver
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * tags:
 *   name: Personnel
 *   description: Personnel and driver management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Driver:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         license:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive, on-delivery]
 *         vehicleId:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/personnel/drivers:
 *   get:
 *     summary: Get all drivers
 *     tags: [Personnel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, on-delivery]
 *     responses:
 *       200:
 *         description: List of drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Driver'
 *
 *   post:
 *     summary: Add a new driver
 *     tags: [Personnel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - license
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               license:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Driver created successfully
 *       400:
 *         description: Invalid input
 */

/**
 * @swagger
 * /api/personnel/drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Personnel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Driver'
 *       404:
 *         description: Driver not found
 *
 *   put:
 *     summary: Update driver
 *     tags: [Personnel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Driver'
 *     responses:
 *       200:
 *         description: Driver updated successfully
 *       404:
 *         description: Driver not found
 */

module.exports = router;