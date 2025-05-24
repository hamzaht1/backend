// routes/diagnostique.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Diagnostique = require('../models/Diagnostic');
const Vehicle = require('../models/Vehicle'); // Pour les références aux véhicules

// GET /api/diagnostique/stats - Obtenir les statistiques des diagnostics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalCount,
      engineCount,
      bodyCount,
      accidentCount,
      recentDiagnostics
    ] = await Promise.all([
      // Total des diagnostics
      Diagnostique.countDocuments(),
      
      // Nombre de problèmes moteur (préfixe P)
      Diagnostique.countDocuments({
        dtc_code: { $regex: /^P/i }
      }),
      
      // Nombre de problèmes de carrosserie (préfixe C)
      Diagnostique.countDocuments({
        dtc_code: { $regex: /^C/i }
      }),
      
      // Nombre d'accidents (préfixe B)
      Diagnostique.countDocuments({
        dtc_code: { $regex: /^B/i }
      }),
      
      // Diagnostics récents
      Diagnostique.find({
        dtc_code: { $ne: null, $exists: true }
      })
        .sort({ diagnostic_timestamp: -1 })
        .limit(5)
    ]);

    // Calcul des pourcentages
    const percentEngine = totalCount > 0 ? Math.round((engineCount / totalCount) * 100) : 0;
    const percentBody = totalCount > 0 ? Math.round((bodyCount / totalCount) * 100) : 0;
    const percentAccident = totalCount > 0 ? Math.round((accidentCount / totalCount) * 100) : 0;
    const percentOther = totalCount > 0 ? 
      100 - (percentEngine + percentBody + percentAccident) : 0;

    // Formatage des diagnostics récents
    const formattedRecentDiagnostics = recentDiagnostics.map(diag => ({
      id: diag._id,
      vehicle: diag.license_plate,
      uid: diag.uid,
      code: diag.dtc_code || 'Aucun code',
      description: diag.description,
      timestamp: diag.diagnostic_timestamp,
      type: diag.fault_type || 'none'
    }));

    res.json({
      total: totalCount,
      categories: {
        engine: { count: engineCount, percent: percentEngine },
        body: { count: bodyCount, percent: percentBody },
        accident: { count: accidentCount, percent: percentAccident },
        other: { 
          count: totalCount - (engineCount + bodyCount + accidentCount), 
          percent: percentOther 
        }
      },
      recent: formattedRecentDiagnostics
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de diagnostic:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/diagnostique/type/:type - Obtenir les diagnostics par type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Définir le filtre en fonction du type
    let filter = {};
    switch(type) {
      case 'engine':
        filter.dtc_code = { $regex: /^P/i };
        break;
      case 'body':
        filter.dtc_code = { $regex: /^C/i };
        break;
      case 'accident':
        filter.dtc_code = { $regex: /^B/i };
        break;
      case 'other':
        filter.dtc_code = { 
          $not: { $regex: /^[PCB]/i },
          $ne: null,
          $exists: true
        };
        break;
      case 'all':
        filter.dtc_code = { $ne: null, $exists: true };
        break;
      default:
        return res.status(400).json({ message: 'Type invalide' });
    }

    // Exécuter les requêtes en parallèle
    const [diagnostics, totalCount] = await Promise.all([
      Diagnostique.find(filter)
        .sort({ diagnostic_timestamp: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Diagnostique.countDocuments(filter)
    ]);

    const formattedDiagnostics = diagnostics.map(diag => ({
      id: diag._id,
      vehicle: diag.license_plate,
      uid: diag.uid,
      code: diag.dtc_code,
      description: diag.description,
      symptoms: diag.symptoms,
      solutions: diag.solutions,
      regime_moteur: diag.regime_moteur,
      fuel_level: diag.fuel_level,
      speed: diag.speed,
      timestamp: diag.diagnostic_timestamp,
      type: diag.fault_type
    }));

    res.json({
      diagnostics: formattedDiagnostics,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pages: Math.ceil(totalCount / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des diagnostics par type:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/diagnostique/vehicle/:id - Obtenir les diagnostics pour un véhicule spécifique
router.get('/vehicle/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Rechercher le véhicule par ID, UID ou plaque d'immatriculation
    let vehicle;
    if (mongoose.Types.ObjectId.isValid(id)) {
      vehicle = await Vehicle.findById(id);
    }
    
    if (!vehicle) {
      vehicle = await Vehicle.findOne({
        $or: [
          { uid: id },
          { license_plate: id }
        ]
      });
    }
    
    if (!vehicle) {
      // Si le véhicule n'est pas trouvé, chercher directement dans les diagnostics
      const diagExists = await Diagnostique.findOne({
        $or: [
          { uid: id },
          { license_plate: id }
        ]
      });
      
      if (!diagExists) {
        return res.status(404).json({ message: 'Véhicule non trouvé' });
      }
      
      // Utiliser les données du diagnostic directement
      vehicle = {
        uid: diagExists.uid,
        license_plate: diagExists.license_plate
      };
    }
    
    // Rechercher les diagnostics pour ce véhicule
    const filter = {
      $or: [
        { uid: vehicle.uid },
        { license_plate: vehicle.license_plate }
      ]
    };
    
    const [diagnostics, totalCount] = await Promise.all([
      Diagnostique.find(filter)
        .sort({ diagnostic_timestamp: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Diagnostique.countDocuments(filter)
    ]);
    
    // Analyser les tendances des diagnostics
    const engineCount = diagnostics.filter(d => d.fault_type === 'engine').length;
    const bodyCount = diagnostics.filter(d => d.fault_type === 'body').length;
    const accidentCount = diagnostics.filter(d => d.fault_type === 'accident').length;
    
    const formattedDiagnostics = diagnostics.map(diag => ({
      id: diag._id,
      code: diag.dtc_code,
      description: diag.description,
      symptoms: diag.symptoms,
      solutions: diag.solutions,
      regime_moteur: diag.regime_moteur,
      fuel_level: diag.fuel_level,
      speed: diag.speed,
      timestamp: diag.diagnostic_timestamp,
      type: diag.fault_type
    }));
    
    res.json({
      vehicle: {
        id: vehicle._id || 'unknown',
        license_plate: vehicle.license_plate,
        uid: vehicle.uid
      },
      trends: {
        engine: engineCount,
        body: bodyCount,
        accident: accidentCount,
        other: diagnostics.length - (engineCount + bodyCount + accidentCount)
      },
      diagnostics: formattedDiagnostics,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pages: Math.ceil(totalCount / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des diagnostics pour le véhicule:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/diagnostique/:id - Obtenir un diagnostic spécifique par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de diagnostic invalide' });
    }
    
    const diagnostic = await Diagnostique.findById(id);
    
    if (!diagnostic) {
      return res.status(404).json({ message: 'Diagnostic non trouvé' });
    }
    
    const formattedDiagnostic = {
      id: diagnostic._id,
      vehicle: diagnostic.license_plate,
      uid: diagnostic.uid,
      code: diagnostic.dtc_code,
      description: diagnostic.description,
      symptoms: diagnostic.symptoms,
      solutions: diagnostic.solutions,
      regime_moteur: diagnostic.regime_moteur,
      fuel_level: diagnostic.fuel_level,
      speed: diagnostic.speed,
      original_timestamp: diagnostic.original_timestamp,
      diagnostic_timestamp: diagnostic.diagnostic_timestamp,
      type: diagnostic.fault_type
    };
    
    res.json(formattedDiagnostic);
  } catch (error) {
    console.error('Erreur lors de la récupération du diagnostic:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/diagnostique/dashboard/overview - Obtenir les données pour le tableau de bord
router.get('/dashboard/overview', async (req, res) => {
  try {
    // Obtenir le nombre total de diagnostics par mois
    const currentDate = new Date();
    const sixMonthsAgo = new Date(currentDate);
    sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
    
    // Statistiques générales
    const [
      totalDiagnostics,
      totalWithDtcCode,
      recentDiagnosticsWithIssues
    ] = await Promise.all([
      Diagnostique.countDocuments(),
      Diagnostique.countDocuments({ dtc_code: { $ne: null, $exists: true } }),
      Diagnostique.find({ 
        dtc_code: { $ne: null, $exists: true },
        diagnostic_timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
      .sort({ diagnostic_timestamp: -1 })
      .limit(10)
    ]);
    
    // Données pour le graphique sur 6 mois
    const monthlyData = await Diagnostique.aggregate([
      {
        $match: {
          diagnostic_timestamp: { $gte: sixMonthsAgo }
        }
      },
      {
        $project: {
          month: { $month: "$diagnostic_timestamp" },
          year: { $year: "$diagnostic_timestamp" },
          isEngine: { 
            $cond: [{ $regexMatch: { input: { $ifNull: ["$dtc_code", ""] }, regex: /^P/i } }, 1, 0] 
          },
          isBody: { 
            $cond: [{ $regexMatch: { input: { $ifNull: ["$dtc_code", ""] }, regex: /^C/i } }, 1, 0] 
          },
          isAccident: { 
            $cond: [{ $regexMatch: { input: { $ifNull: ["$dtc_code", ""] }, regex: /^B/i } }, 1, 0] 
          },
          hasIssue: { 
            $cond: [{ $ne: ["$dtc_code", null] }, 1, 0] 
          }
        }
      },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          total: { $sum: 1 },
          engine: { $sum: "$isEngine" },
          body: { $sum: "$isBody" },
          accident: { $sum: "$isAccident" },
          withIssues: { $sum: "$hasIssue" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);
    
    // Formater les données mensuelles
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const formattedMonthlyData = monthlyData.map(item => ({
      month: months[item._id.month - 1],
      year: item._id.year,
      label: `${months[item._id.month - 1]} ${item._id.year}`,
      total: item.total,
      engine: item.engine,
      body: item.body,
      accident: item.accident,
      withIssues: item.withIssues,
      withoutIssues: item.total - item.withIssues
    }));
    
    // Top des véhicules avec le plus de problèmes
    const topVehiclesWithIssues = await Diagnostique.aggregate([
      {
        $match: {
          dtc_code: { $ne: null, $exists: true }
        }
      },
      {
        $group: {
          _id: "$license_plate",
          count: { $sum: 1 },
          uid: { $first: "$uid" },
          lastIssue: { $max: "$diagnostic_timestamp" }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    res.json({
      totalDiagnostics,
      diagnosticsWithIssues: totalWithDtcCode,
      issueRate: Math.round((totalWithDtcCode / totalDiagnostics) * 100) || 0,
      monthlyData: formattedMonthlyData,
      topVehiclesWithIssues: topVehiclesWithIssues.map(v => ({
        license_plate: v._id,
        uid: v.uid,
        issues_count: v.count,
        last_issue: v.lastIssue
      })),
      recentIssues: recentDiagnosticsWithIssues.map(diag => ({
        id: diag._id,
        license_plate: diag.license_plate,
        code: diag.dtc_code,
        description: diag.description,
        timestamp: diag.diagnostic_timestamp,
        type: diag.fault_type
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'aperçu du tableau de bord:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;