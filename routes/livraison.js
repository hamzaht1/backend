const express = require('express');
const router = express.Router();
const { LivraisonPrevu, LivraisonEnCours } = require('../models/Livraison');
const Vehicle = require('../models/Vehicle');

/**
 * @swagger
 * tags:
 *   name: Livraisons
 *   description: Delivery and shipment management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Livraison:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         id_camion:
 *           type: string
 *           description: Vehicle ID for the delivery
 *         id_driver:
 *           type: string
 *           description: Driver assigned to the delivery
 *         origin:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *             lng:
 *               type: number
 *             address:
 *               type: string
 *         destination:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *             lng:
 *               type: number
 *             address:
 *               type: string
 *         status:
 *           type: string
 *           enum: [en_attente, en_cours, terminé, annulé]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         estimated_time:
 *           type: number
 *           description: Estimated delivery time in minutes
 */

/**
 * @swagger
 * /api/livraisons:
 *   get:
 *     summary: Get all deliveries
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [en_attente, en_cours, terminé, annulé]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of deliveries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Livraison'
 *   
 *   post:
 *     summary: Create a new delivery
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_camion
 *               - id_driver
 *               - origin
 *               - destination
 *             properties:
 *               id_camion:
 *                 type: string
 *               id_driver:
 *                 type: string
 *               origin:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *                   address:
 *                     type: string
 *               destination:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *                   address:
 *                     type: string
 *     responses:
 *       201:
 *         description: Delivery created successfully
 *       400:
 *         description: Invalid input data
 */

/**
 * @swagger
 * /api/livraisons/{id}:
 *   get:
 *     summary: Get delivery by ID
 *     tags: [Livraisons]
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
 *         description: Delivery details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Livraison'
 *       404:
 *         description: Delivery not found
 *
 *   put:
 *     summary: Update delivery status
 *     tags: [Livraisons]
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
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [en_attente, en_cours, terminé, annulé]
 *     responses:
 *       200:
 *         description: Delivery updated successfully
 *       404:
 *         description: Delivery not found
 */

// GET /api/livraisons/prevues - Récupérer toutes les livraisons prévues
router.get('/prevues', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all',
      type_marchandise,
      date_debut,
      date_fin
    } = req.query;

    // Construction du filtre
    let filter = {};
    
    if (status !== 'all') {
      filter.status = status;
    }
    
    if (type_marchandise) {
      filter.type_marchandise = type_marchandise;
    }
    
    if (date_debut || date_fin) {
      filter.date_debut = {};
      if (date_debut) filter.date_debut.$gte = new Date(date_debut);
      if (date_fin) filter.date_debut.$lte = new Date(date_fin);
    }

    // Exécution des requêtes en parallèle
    const [livraisons, totalCount] = await Promise.all([
      LivraisonPrevu.find(filter)
        .populate('id_camion', 'license_plate uid')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ date_debut: -1 }),
      LivraisonPrevu.countDocuments(filter)
    ]);

    res.json({
      livraisons,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalLivraisons: totalCount,
        livraisonsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des livraisons prévues:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/livraisons/encours - Récupérer toutes les livraisons en cours
router.get('/encours', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      type_marchandise
    } = req.query;

    // Construction du filtre
    let filter = { status: 'in_progress' };
    
    if (type_marchandise) {
      filter.type_marchandise = type_marchandise;
    }

    // Récupération des livraisons en cours
    const [livraisons, totalCount] = await Promise.all([
      LivraisonEnCours.find(filter)
        .populate('id_camion', 'license_plate uid status')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ date_debut: -1 }),
      LivraisonEnCours.countDocuments(filter)
    ]);

    // Enrichir avec des informations temps réel
    const enrichedLivraisons = await Promise.all(
      livraisons.map(async (livraison) => {
        const now = new Date();
        const timeElapsed = (now - livraison.date_debut) / (1000 * 60 * 60); // en heures
        const totalDuration = (livraison.date_fin_prevue - livraison.date_debut) / (1000 * 60 * 60);
        const progress = Math.min((timeElapsed / totalDuration) * 100, 100);
        
        return {
          ...livraison.toObject(),
          progress: Math.round(progress),
          time_elapsed: Math.round(timeElapsed * 10) / 10, // arrondir à 1 décimale
          remaining_time: Math.max(0, Math.round((totalDuration - timeElapsed) * 10) / 10)
        };
      })
    );

    res.json({
      livraisons: enrichedLivraisons,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalLivraisons: totalCount,
        livraisonsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des livraisons en cours:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/livraisons/statistiques - Statistiques des livraisons
router.get('/statistiques', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // Définir la période
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Requêtes agrégées en parallèle
    const [
      totalPrevues,
      totalEnCours,
      completedInPeriod,
      byType,
      byStatus,
      recentActivity
    ] = await Promise.all([
      // Total livraisons prévues
      LivraisonPrevu.countDocuments(),
      
      // Total livraisons en cours
      LivraisonEnCours.countDocuments({ status: 'in_progress' }),
      
      // Livraisons complétées dans la période
      LivraisonEnCours.countDocuments({
        status: 'completed',
        date_fin_prevue: { $gte: startDate }
      }),
      
      // Répartition par type de marchandise
      LivraisonPrevu.aggregate([
        { $group: { _id: '$type_marchandise', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Répartition par statut
      LivraisonPrevu.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Activité récente (24h)
      LivraisonEnCours.find({
        created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
      .populate('id_camion', 'license_plate')
      .sort({ created_at: -1 })
      .limit(5)
    ]);

    // Calculer les tendances
    const lastPeriodStart = new Date(startDate);
    switch (period) {
      case 'today':
        lastPeriodStart.setDate(lastPeriodStart.getDate() - 1);
        break;
      case 'week':
        lastPeriodStart.setDate(lastPeriodStart.getDate() - 7);
        break;
      case 'month':
        lastPeriodStart.setMonth(lastPeriodStart.getMonth() - 1);
        break;
      case 'year':
        lastPeriodStart.setFullYear(lastPeriodStart.getFullYear() - 1);
        break;
    }

    const lastPeriodCompleted = await LivraisonEnCours.countDocuments({
      status: 'completed',
      date_fin_prevue: { $gte: lastPeriodStart, $lt: startDate }
    });

    const trend = lastPeriodCompleted > 0 
      ? ((completedInPeriod - lastPeriodCompleted) / lastPeriodCompleted * 100)
      : 0;

    res.json({
      summary: {
        total_prevues: totalPrevues,
        total_en_cours: totalEnCours,
        completed_in_period: completedInPeriod,
        trend: Math.round(trend * 10) / 10
      },
      by_type: byType,
      by_status: byStatus,
      recent_activity: recentActivity,
      period: period
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/livraisons/:id - Récupérer une livraison spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Chercher dans les deux collections
    let livraison = await LivraisonPrevu.findById(id)
      .populate('id_camion', 'license_plate uid status')
      .populate('id_driver', 'name phone'); // Si vous avez un modèle Driver
    
    if (!livraison) {
      livraison = await LivraisonEnCours.findById(id)
        .populate('id_camion', 'license_plate uid status')
        .populate('id_driver', 'name phone');
    }
    
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }

    // Calculer les informations de progression si en cours
    if (livraison.status === 'in_progress') {
      const now = new Date();
      const timeElapsed = (now - livraison.date_debut) / (1000 * 60 * 60);
      const totalDuration = (livraison.date_fin_prevue - livraison.date_debut) / (1000 * 60 * 60);
      const progress = Math.min((timeElapsed / totalDuration) * 100, 100);
      
      livraison = livraison.toObject();
      livraison.progress = Math.round(progress);
      livraison.time_elapsed = Math.round(timeElapsed * 10) / 10;
      livraison.remaining_time = Math.max(0, Math.round((totalDuration - timeElapsed) * 10) / 10);
    }

    res.json(livraison);
  } catch (error) {
    console.error('Erreur lors de la récupération de la livraison:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT /api/livraisons/:id/status - Mettre à jour le statut d'une livraison
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!status || !['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    // Chercher dans les deux collections
    let livraison = await LivraisonPrevu.findById(id);
    let collection = 'LivraisonPrevu';
    
    if (!livraison) {
      livraison = await LivraisonEnCours.findById(id);
      collection = 'LivraisonEnCours';
    }
    
    if (!livraison) {
      return res.status(404).json({ message: 'Livraison non trouvée' });
    }

    // Mettre à jour le statut
    livraison.status = status;
    livraison.updated_at = new Date();
    
    if (notes) {
      livraison.notes = notes;
    }
    
    // Ajouter la date de completion si nécessaire
    if (status === 'completed' && !livraison.date_completion) {
      livraison.date_completion = new Date();
    }

    await livraison.save();

    res.json({
      message: 'Statut mis à jour avec succès',
      livraison,
      collection
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

/**
 * @swagger
 * /api/livraisons/prevues:
 *   get:
 *     summary: Get all scheduled deliveries
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled, delayed]
 *       - in: query
 *         name: type_marchandise
 *         schema:
 *           type: string
 *           enum: [matériel, nourriture, équipement, documents, électronique, textile, chimique]
 *     responses:
 *       200:
 *         description: List of scheduled deliveries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 livraisons:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Livraison'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalLivraisons:
 *                       type: integer
 *                     livraisonsPerPage:
 *                       type: integer
 */

/**
 * @swagger
 * /api/livraisons/encours:
 *   get:
 *     summary: Get all ongoing deliveries
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: type_marchandise
 *         schema:
 *           type: string
 *           enum: [matériel, nourriture, équipement, documents, électronique, textile, chimique]
 *     responses:
 *       200:
 *         description: List of ongoing deliveries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 livraisons:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Livraison'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalLivraisons:
 *                       type: integer
 *                     livraisonsPerPage:
 *                       type: integer
 */

/**
 * @swagger
 * /api/livraisons/statistiques:
 *   get:
 *     summary: Get delivery statistics
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *           default: week
 *     responses:
 *       200:
 *         description: Delivery statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPrevues:
 *                   type: integer
 *                 totalEnCours:
 *                   type: integer
 *                 completedInPeriod:
 *                   type: integer
 *                 byType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 byStatus:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       count:
 *                         type: integer
 */

/**
 * @swagger
 * /api/livraisons/vehicule/{vehiculeId}:
 *   get:
 *     summary: Get deliveries for a specific vehicle
 *     tags: [Livraisons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehiculeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, scheduled, in_progress, completed, cancelled, delayed]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of deliveries for the vehicle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 livraisons:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Livraison'
 *                 total:
 *                   type: integer
 */

// POST /api/livraisons/prevues - Créer une nouvelle livraison prévue
router.post('/prevues', async (req, res) => {
  try {
    const { id_camion, id_driver, origin, destination, date_debut, date_fin, type_marchandise } = req.body;

    // Validation des données
    if (!id_camion || !id_driver || !origin || !destination) {
      return res.status(400).json({ message: 'Champs manquants' });
    }

    // Créer une nouvelle livraison prévue
    const nouvelleLivraison = new LivraisonPrevu({
      id_camion,
      id_driver,
      origin,
      destination,
      date_debut,
      date_fin,
      type_marchandise,
      status: 'scheduled',
      created_at: new Date(),
      updated_at: new Date()
    });

    await nouvelleLivraison.save();

    res.status(201).json(nouvelleLivraison);
  } catch (error) {
    console.error('Erreur lors de la création de la livraison prévue:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE /api/livraisons/prevues/:id - Supprimer une livraison prévue
router.delete('/prevues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Supprimer la livraison prévue
    const resultat = await LivraisonPrevu.findByIdAndDelete(id);
    
    if (!resultat) {
      return res.status(404).json({ message: 'Livraison prévue non trouvée' });
    }

    res.json({ message: 'Livraison prévue supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la livraison prévue:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/livraisons/encours - Créer une nouvelle livraison en cours
router.post('/encours', async (req, res) => {
  try {
    const { id_camion, id_driver, origin, destination, date_debut, date_fin_prevue, type_marchandise } = req.body;

    // Validation des données
    if (!id_camion || !id_driver || !origin || !destination) {
      return res.status(400).json({ message: 'Champs manquants' });
    }

    // Créer une nouvelle livraison en cours
    const nouvelleLivraison = new LivraisonEnCours({
      id_camion,
      id_driver,
      origin,
      destination,
      date_debut,
      date_fin_prevue,
      type_marchandise,
      status: 'in_progress',
      created_at: new Date(),
      updated_at: new Date()
    });

    await nouvelleLivraison.save();

    res.status(201).json(nouvelleLivraison);
  } catch (error) {
    console.error('Erreur lors de la création de la livraison en cours:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE /api/livraisons/encours/:id - Supprimer une livraison en cours
router.delete('/encours/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Supprimer la livraison en cours
    const resultat = await LivraisonEnCours.findByIdAndDelete(id);
    
    if (!resultat) {
      return res.status(404).json({ message: 'Livraison en cours non trouvée' });
    }

    res.json({ message: 'Livraison en cours supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la livraison en cours:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/livraisons/vehicule/:vehiculeId - Livraisons d'un véhicule spécifique
router.get('/vehicule/:vehiculeId', async (req, res) => {
  try {
    const { vehiculeId } = req.params;
    const { status, limit = 10 } = req.query;
    
    let filter = { id_camion: vehiculeId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Chercher dans les deux collections
    const [prevues, enCours] = await Promise.all([
      LivraisonPrevu.find(filter)
        .populate('id_camion', 'license_plate uid')
        .sort({ date_debut: -1 })
        .limit(parseInt(limit)),
      LivraisonEnCours.find(filter)
        .populate('id_camion', 'license_plate uid')
        .sort({ date_debut: -1 })
        .limit(parseInt(limit))
    ]);

    // Combiner et trier les résultats
    const allLivraisons = [...prevues, ...enCours]
      .sort((a, b) => b.date_debut - a.date_debut)
      .slice(0, parseInt(limit));

    res.json({
      livraisons: allLivraisons,
      total: allLivraisons.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des livraisons du véhicule:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;