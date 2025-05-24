// routes/parking.js - Version simplifiée sans dépendance VehicleEntry
const express = require('express');
const router = express.Router();
const ParkingLot = require('../models/ParkingLot');
const ParkingSpace = require('../models/ParkingSpace');

// GET /api/parking/overview - Vue d'ensemble
router.get('/overview', async (req, res) => {
  try {
    // Récupérer tous les parkings
    const parkingLots = await ParkingLot.find({ status: 'active' });
    
    // Données par défaut si aucun parking n'est trouvé
    if (!parkingLots || parkingLots.length === 0) {
      return res.json({
        statsCards: [],
        parkingLots: [],
        totalLots: 0,
        totalSpaces: 0,
        availableSpaces: 0,
        occupancyRate: 0
      });
    }
    
    // Calculer les statistiques globales
    let totalSpaces = 0;
    let availableSpaces = 0;
    
    // Pour chaque parking, récupérer ses espaces
    for (const lot of parkingLots) {
      const spaces = await ParkingSpace.find({ parking_id: lot.parking_id });
      
      // Mettre à jour les compteurs
      lot.total_spaces = spaces.length;
      lot.available_spaces = spaces.filter(space => space.status !== 'occupé').length;
      
      totalSpaces += lot.total_spaces;
      availableSpaces += lot.available_spaces;
    }
    
    const occupiedSpaces = totalSpaces - availableSpaces;
    const occupancyRate = totalSpaces > 0 ? Math.round((occupiedSpaces / totalSpaces) * 100) : 0;
    
    // Structure pour les 4 cartes de statistiques
    const statsCards = [
      {
        id: 'total-lots',
        title: 'Total Parking Lots',
        value: parkingLots.length,
        icon: 'warehouse',
        color: 'rgba(59, 130, 246, 0.1)',
        iconColor: '#3b82f6',
        meta: 'All facilities operational',
        showStatus: true,
        statusType: 'success'
      },
      {
        id: 'total-spaces',
        title: 'Total Parking Spaces',
        value: totalSpaces,
        icon: 'parking',
        color: 'rgba(99, 102, 241, 0.1)',
        iconColor: '#6366f1',
        meta: 'Across all parking facilities'
      },
      {
        id: 'available-spaces',
        title: 'Available Spaces',
        value: availableSpaces,
        icon: 'car-side',
        color: 'rgba(16, 185, 129, 0.1)',
        iconColor: '#10b981',
        meta: totalSpaces > 0 ? `${((availableSpaces / totalSpaces) * 100).toFixed(1)}% of capacity free` : 'No spaces available'
      },
      {
        id: 'occupancy-rate',
        title: 'Current Occupancy Rate',
        value: `${occupancyRate}%`,
        icon: 'car-alt',
        color: 'rgba(239, 68, 68, 0.1)',
        iconColor: '#ef4444',
        showChart: true,
        chartData: generateSimpleOccupancyData()
      }
    ];

    // Enrichir les données des parkings
    const enrichedLots = await Promise.all(
      parkingLots.map(async (lot) => {
        // Récupérer les espaces de ce parking
        const spaces = await ParkingSpace.find({ parking_id: lot.parking_id })
          .sort({ space_number: 1 });
        
        // Traiter chaque espace
        const processedSpaces = spaces.map(space => {
          // Déterminer le type d'espace (standard par défaut)
          const spaceType = space.type || 'standard';
          
          // Simplifier l'historique en cas d'absence de VehicleEntry
          const simpleHistory = generateSimpleSpaceHistory();
          
          return {
            id: space.uid || space._id.toString(),
            number: space.space_number,
            occupied: space.status === 'occupé',
            reserved: space.status === 'réservé',
            type: spaceType,
            status: space.status || 'libre',
            spaceClass: `${spaceType}Space ${space.status === 'occupé' ? 'occupied' : 
                         space.status === 'réservé' ? 'reserved' : 
                         space.status === 'handicap' ? 'handicap' : 
                         space.status === 'maintenance' ? 'maintenance' : 
                         'available'}`,
            vehicle: space.status === 'occupé' ? {
              plate: space.vehicle_license_plate || 'Unknown',
              rfid: space.vehicle_rfid || 'N/A',
              entryTime: space.entry_time ? new Date(space.entry_time).toLocaleTimeString() : '12:00:00',
              duration: '2h 30m' // Valeur par défaut
            } : null,
            history: simpleHistory
          };
        });
        
        return {
          id: lot.parking_id || lot._id.toString(),
          name: lot.name,
          totalSpaces: lot.total_spaces,
          availableSpaces: lot.available_spaces,
          occupancyRate: lot.total_spaces > 0 ? 
            Math.round(((lot.total_spaces - lot.available_spaces) / lot.total_spaces) * 100) : 0,
          location: lot.location || determineLocation(lot.parking_id),
          status: lot.status,
          statusIndicatorColor: lot.available_spaces > (lot.total_spaces * 0.2) ? '#10b981' : 
                                lot.available_spaces > 0 ? '#f59e0b' : '#ef4444',
          spaces: processedSpaces
        };
      })
    );
    
    res.json({
      statsCards,
      parkingLots: enrichedLots,
      totalLots: parkingLots.length,
      totalSpaces,
      availableSpaces,
      occupancyRate
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la vue d\'ensemble:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/parking/history - Historique pour le graphique principal
router.get('/history', async (req, res) => {
  try {
    const { period = 'day', parking_id = 'all' } = req.query;
    
    // Générer des données d'historique simulées
    let historyData = [];
    
    switch (period) {
      case 'day':
        historyData = generateDayHistory();
        break;
      case 'month':
        historyData = generateMonthHistory();
        break;
      case 'year':
        historyData = generateYearHistory();
        break;
      default:
        historyData = generateDayHistory();
    }
    
    // Calculer les insights
    const insights = calculateInsights(historyData, period);
    
    res.json({
      chartData: historyData,
      insights,
      period,
      selectedLot: parking_id
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/parking/space/:id/history - Historique d'un espace
router.get('/space/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Trouver l'espace de parking
    const space = await ParkingSpace.findOne({ uid: id });
    if (!space) {
      return res.status(404).json({ message: 'Espace de parking non trouvé' });
    }
    
    // Trouver le parking parent
    const parking = await ParkingLot.findOne({ parking_id: space.parking_id });
    
    // Générer un historique simulé
    const history = generateSimpleSpaceHistory();
    
    res.json({
      space: {
        id: space.uid || space._id.toString(),
        number: space.space_number,
        type: space.type || 'standard',
        status: space.status || 'libre',
        occupied: space.status === 'occupé',
        statusClass: space.status === 'occupé' ? 'statusOccupied' : 
                    space.status === 'réservé' ? 'statusReserved' : 
                    space.status === 'handicap' ? 'statusHandicap' : 
                    space.status === 'maintenance' ? 'statusMaintenance' : 
                    'statusAvailable',
        vehicle: space.status === 'occupé' ? {
          plate: space.vehicle_license_plate || 'Unknown',
          rfid: space.vehicle_rfid || 'N/A',
          entryTime: space.entry_time ? new Date(space.entry_time).toLocaleTimeString() : '12:00:00',
          duration: '2h 30m' // Valeur par défaut
        } : null
      },
      parking: {
        name: parking?.name || 'Parking Lot'
      },
      history: history
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique de l\'espace:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/parking/occupancy-trend - Données pour le mini-graphique
router.get('/occupancy-trend', async (req, res) => {
  try {
    const { timeRange = 'day' } = req.query;
    
    const trendData = generateSimpleOccupancyData(timeRange);
    
    res.json(trendData);
  } catch (error) {
    console.error('Erreur lors de la récupération des tendances:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Fonctions utilitaires pour générer des données simplifiées
function generateSimpleOccupancyData(timeRange = 'day') {
  const data = [];
  let points;
  
  switch (timeRange) {
    case 'day':
      points = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
      break;
    case 'week':
      points = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      break;
    case 'month':
      points = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      break;
    default:
      points = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
  }
  
  for (const point of points) {
    data.push({
      time: point,
      value: Math.floor(Math.random() * 50) + 30 // 30-80%
    });
  }
  
  return data;
}

function generateDayHistory() {
  const data = [];
  for (let hour = 0; hour < 24; hour += 2) {
    const time = `${String(hour).padStart(2, '0')}:00`;
    const occupied = Math.floor(Math.random() * 60) + 20;
    const total = 100;
    const available = total - occupied;
    
    data.push({
      time,
      value: Math.round((occupied / total) * 100),
      occupied,
      available,
      total
    });
  }
  return data;
}

function generateMonthHistory() {
  const data = [];
  for (let day = 1; day <= 30; day++) {
    const time = day.toString();
    const occupied = Math.floor(Math.random() * 40) + 40;
    const total = 100;
    const available = total - occupied;
    
    data.push({
      time,
      value: Math.round((occupied / total) * 100),
      occupied,
      available,
      total
    });
  }
  return data;
}

function generateYearHistory() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data = [];
  
  months.forEach(month => {
    const occupied = Math.floor(Math.random() * 30) + 50;
    const total = 100;
    const available = total - occupied;
    
    data.push({
      time: month,
      value: Math.round((occupied / total) * 100),
      occupied,
      available,
      total
    });
  });
  
  return data;
}

function calculateInsights(historyData, period) {
  const values = historyData.map(item => item.value);
  const maxOccupancy = Math.max(...values);
  const minOccupancy = Math.min(...values);
  const avgOccupancy = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  
  let maxPeriod, minPeriod;
  
  if (period === 'day') {
    const maxIndex = values.indexOf(maxOccupancy);
    const minIndex = values.indexOf(minOccupancy);
    maxPeriod = historyData[maxIndex].time + ' - ' + 
                (parseInt(historyData[maxIndex].time.split(':')[0]) + 2) + ':00';
    minPeriod = historyData[minIndex].time + ' - ' + 
                (parseInt(historyData[minIndex].time.split(':')[0]) + 2) + ':00';
  } else if (period === 'month') {
    const maxIndex = values.indexOf(maxOccupancy);
    const minIndex = values.indexOf(minOccupancy);
    maxPeriod = `Days ${maxIndex * 5 + 1}-${(maxIndex + 1) * 5}`;
    minPeriod = `Days ${minIndex * 5 + 1}-${(minIndex + 1) * 5}`;
  } else {
    const maxIndex = values.indexOf(maxOccupancy);
    const minIndex = values.indexOf(minOccupancy);
    maxPeriod = historyData[maxIndex].time + ' - ' + historyData[maxIndex].time;
    minPeriod = historyData[minIndex].time + ' - ' + historyData[minIndex].time;
  }
  
  return [
    {
      id: 'peak-occupancy',
      icon: 'parking',
      iconColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.1)',
      title: 'Peak Occupancy',
      period: maxPeriod,
      value: `${maxOccupancy}%`
    },
    {
      id: 'lowest-occupancy',
      icon: 'car-side',
      iconColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.1)',
      title: 'Lowest Occupancy',
      period: minPeriod,
      value: `${minOccupancy}%`
    },
    {
      id: 'average-occupancy',
      icon: 'car-alt',
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      title: 'Average Occupancy',
      period: `Across ${period === 'day' ? '24 hours' : period === 'month' ? '30 days' : '12 months'}`,
      value: `${avgOccupancy}%`
    }
  ];
}

function generateSimpleSpaceHistory() {
  // Générer un historique simulé pour 3 jours
  const history = [];
  
  for (let i = 0; i < 3; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const occupationsCount = Math.floor(Math.random() * 3) + 1;
    const occupations = [];
    
    for (let j = 0; j < occupationsCount; j++) {
      const fromHour = Math.floor(Math.random() * 12) + 7;
      const duration = Math.floor(Math.random() * 4) + 1;
      const toHour = fromHour + duration;
      
      occupations.push({
        vehicleId: `ABC${Math.floor(Math.random() * 900) + 100}`,
        from: `${String(fromHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        to: `${String(toHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        duration: `${duration}h ${Math.floor(Math.random() * 60)}m`
      });
    }
    
    history.push({
      date: dateStr,
      occupations
    });
  }
  
  return history;
}

function determineLocation(parkingId) {
  const locations = {
    'LOT_A': 'North Entrance',
    'LOT_B': 'Main Building',
    'LOT_C': 'East Wing',
    'LOT_D': 'West Wing',
    'LOT_E': 'South Entrance'
  };
  return locations[parkingId] || 'Not specified';
}

module.exports = router;