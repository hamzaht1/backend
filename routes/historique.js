// routes/historique.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Trip = require('../models/trip');
//const LivePosition = require('../models/LivePosition');

// GET /api/historique - Récupérer tous les trajets du véhicule associé à l'utilisateur
router.get('/', auth, async (req, res) => {
  try {
    const vehicleId = req.user.vehicleId;
    
    if (!vehicleId) {
      return res.status(400).json({
        message: "Aucun véhicule n'est associé à cet utilisateur"
      });
    }
    
    // Récupérer les trajets pour ce véhicule, du plus récent au plus ancien
    const trips = await Trip.find({ uid: vehicleId })
      .sort({ start_time: -1 })
      .lean();
    
    // Formater les dates pour l'affichage frontend
    const formattedTrips = trips.map(trip => {
      const startDate = new Date(trip.start_time);
      const endDate = new Date(trip.end_time);
      
      // Calculer la durée en heures et minutes
      const durationMs = endDate - startDate;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const durationFormatted = `${hours}h ${minutes}m`;
      
      return {
        id: trip._id,
        date: startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        startTime: startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        endTime: endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        origin: trip.origin?.name || "Inconnu",
        destination: trip.destination?.name || "Inconnu",
        distance: trip.distance.toFixed(1),
        duration: durationFormatted,
        status: trip.status
      };
    });
    
    res.json(formattedTrips);
    
  } catch (err) {
    console.error('Erreur lors de la récupération des trajets:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/historique/filter - Récupérer les trajets filtrés par période et statut
router.get('/filter', auth, async (req, res) => {
  try {
    const vehicleId = req.user.vehicleId;
    const { period, status } = req.query;
    
    if (!vehicleId) {
      return res.status(400).json({
        message: "Aucun véhicule n'est associé à cet utilisateur"
      });
    }
    
    // Construire le filtre pour la requête
    const filter = { uid: vehicleId };
    
    // Ajouter le filtre de période
    if (period) {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filter.start_time = { $gte: startDate };
      }
    }
    
    // Ajouter le filtre de statut
    if (status && status !== 'Tous') {
      filter.status = status;
    }
    
    // Récupérer les trajets filtrés
    const trips = await Trip.find(filter)
      .sort({ start_time: -1 })
      .lean();
    
    // Formater les dates pour l'affichage frontend
    const formattedTrips = trips.map(trip => {
      const startDate = new Date(trip.start_time);
      const endDate = new Date(trip.end_time);
      
      // Calculer la durée en heures et minutes
      const durationMs = endDate - startDate;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const durationFormatted = `${hours}h ${minutes}m`;
      
      return {
        id: trip._id,
        date: startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        startTime: startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        endTime: endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        origin: trip.origin?.name || "Inconnu",
        destination: trip.destination?.name || "Inconnu",
        distance: trip.distance.toFixed(1),
        duration: durationFormatted,
        status: trip.status
      };
    });
    
    res.json(formattedTrips);
    
  } catch (err) {
    console.error('Erreur lors de la récupération des trajets filtrés:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/historique/:id - Récupérer les détails d'un trajet spécifique
router.get('/:id', auth, async (req, res) => {
  try {
    const vehicleId = req.user.vehicleId;
    const tripId = req.params.id;
    
    if (!vehicleId) {
      return res.status(400).json({
        message: "Aucun véhicule n'est associé à cet utilisateur"
      });
    }
    
    // Récupérer le trajet avec cet ID et véhicule
    const trip = await Trip.findOne({
      _id: tripId,
      uid: vehicleId
    });
    
    if (!trip) {
      return res.status(404).json({
        message: "Trajet non trouvé"
      });
    }
    
    // Formater la réponse pour le frontend
    const startDate = new Date(trip.start_time);
    const endDate = new Date(trip.end_time);
    
    // Calculer la durée en heures et minutes
    const durationMs = endDate - startDate;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationFormatted = `${hours}h ${minutes}m`;
    
    const tripDetails = {
      id: trip._id,
      vehicleId: trip.uid,
      license_plate: trip.license_plate,
      date: startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      startTime: startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      endTime: endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      origin: {
        name: trip.origin?.name || "Inconnu",
        address: trip.origin?.address || "",
        coordinates: trip.origin?.coordinates || { lat: 0, lon: 0 }
      },
      destination: {
        name: trip.destination?.name || "Inconnu",
        address: trip.destination?.address || "",
        coordinates: trip.destination?.coordinates || { lat: 0, lon: 0 }
      },
      distance: trip.distance.toFixed(1),
      duration: durationFormatted,
      status: trip.status,
      waypoints: trip.waypoints || []
    };
    
    res.json(tripDetails);
    
  } catch (err) {
    console.error('Erreur lors de la récupération des détails du trajet:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/historique/generate - Générer des trajets à partir des positions
router.post('/generate', auth, async (req, res) => {
  try {
    const vehicleId = req.user.vehicleId;
    
    if (!vehicleId || req.user.role !== 'conducteur') {
      return res.status(403).json({
        message: "Vous n'êtes pas autorisé à générer des trajets"
      });
    }
    
    // Récupérer les positions pour ce véhicule, triées par timestamp
    const positions = await LivePosition.find({ uid: vehicleId })
      .sort({ timestamp: 1 });
    
    if (positions.length < 2) {
      return res.status(400).json({
        message: "Pas assez de positions pour générer des trajets"
      });
    }
    
    // Définir un seuil pour considérer un véhicule comme arrêté (en minutes)
    const stationaryThreshold = 10; // 10 minutes
    
    // Identifier les points d'arrêt pour segmenter les trajets
    const trips = [];
    let tripStart = positions[0];
    let lastPosition = positions[0];
    let waypoints = [{ 
      lat: tripStart.lat, 
      lon: tripStart.lon, 
      timestamp: new Date(tripStart.timestamp) 
    }];
    
    for (let i = 1; i < positions.length; i++) {
      const currentPosition = positions[i];
      const currentTime = new Date(currentPosition.timestamp);
      const lastTime = new Date(lastPosition.timestamp);
      const timeDifference = (currentTime - lastTime) / (1000 * 60); // en minutes
      
      // Ajouter le point au trajet actuel
      waypoints.push({ 
        lat: currentPosition.lat, 
        lon: currentPosition.lon, 
        timestamp: currentTime 
      });
      
      // Si le véhicule est resté immobile pendant longtemps, terminer le trajet actuel
      if (timeDifference > stationaryThreshold) {
        // Calculer la distance totale du trajet (approximatif)
        const distance = calculateTripDistance(waypoints);
        
        // Créer un nouveau trajet
        const newTrip = new Trip({
          uid: vehicleId,
          license_plate: tripStart.license_plate,
          start_time: new Date(tripStart.timestamp),
          end_time: new Date(lastPosition.timestamp),
          origin: {
            name: "Départ",
            coordinates: {
              lat: tripStart.lat,
              lon: tripStart.lon
            }
          },
          destination: {
            name: "Arrivée",
            coordinates: {
              lat: lastPosition.lat,
              lon: lastPosition.lon
            }
          },
          distance: distance,
          duration: (new Date(lastPosition.timestamp) - new Date(tripStart.timestamp)) / (1000 * 60), // en minutes
          status: "Complété",
          waypoints: waypoints
        });
        
        await newTrip.save();
        trips.push(newTrip);
        
        // Commencer un nouveau trajet
        tripStart = currentPosition;
        waypoints = [{ 
          lat: tripStart.lat, 
          lon: tripStart.lon, 
          timestamp: new Date(tripStart.timestamp) 
        }];
      }
      
      lastPosition = currentPosition;
    }
    
    // Si le dernier trajet n'a pas été terminé
    if (waypoints.length > 1) {
      const distance = calculateTripDistance(waypoints);
      
      const lastTrip = new Trip({
        uid: vehicleId,
        license_plate: tripStart.license_plate,
        start_time: new Date(tripStart.timestamp),
        end_time: new Date(lastPosition.timestamp),
        origin: {
          name: "Départ",
          coordinates: {
            lat: tripStart.lat,
            lon: tripStart.lon
          }
        },
        destination: {
          name: "Arrivée",
          coordinates: {
            lat: lastPosition.lat,
            lon: lastPosition.lon
          }
        },
        distance: distance,
        duration: (new Date(lastPosition.timestamp) - new Date(tripStart.timestamp)) / (1000 * 60), // en minutes
        status: "Complété",
        waypoints: waypoints
      });
      
      await lastTrip.save();
      trips.push(lastTrip);
    }
    
    res.status(201).json({
      message: `${trips.length} trajets générés avec succès`,
      trips: trips.map(t => t._id)
    });
    
  } catch (err) {
    console.error('Erreur lors de la génération des trajets:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Fonction pour calculer la distance approximative d'un trajet
function calculateTripDistance(waypoints) {
  let distance = 0;
  
  for (let i = 1; i < waypoints.length; i++) {
    const lastPoint = waypoints[i-1];
    const currentPoint = waypoints[i];
    
    // Calcul de la distance entre deux points (Formule de Haversine)
    const R = 6371; // Rayon de la Terre en km
    const dLat = (currentPoint.lat - lastPoint.lat) * Math.PI / 180;
    const dLon = (currentPoint.lon - lastPoint.lon) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lastPoint.lat * Math.PI / 180) * Math.cos(currentPoint.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    
    distance += d;
  }
  
  return distance;
}

module.exports = router;