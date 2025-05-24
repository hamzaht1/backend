// routes/dashboard.js
const express = require('express');
const router = express.Router();
const ParkingLot = require('../models/ParkingLot');
const Delivery = require('../models/Delivery');
const Vehicle = require('../models/Vehicle');
const PointRestockLot = require('../models/PointRestockLot');
const PointRestockSpace = require('../models/PointRestockSpace');
const PointRestockHistory = require('../models/PointRestockHistory');
// Ajout du modèle LivraisonEncours
const LivraisonEncours = require('../models/Delivery');

// GET /api/dashboard/overview - Get current overview data
router.get('/overview', async (req, res) => {
  try {
    // Get current date for active deliveries
    const currentDate = new Date();
    
    // Fetch all data in parallel
    const [parkingLots, livraisonsEncours, vehicles, pointRestockLots, pointRestockSpaces] = await Promise.all([
      ParkingLot.find({ status: 'active' }),
      // Nouvelle requête pour obtenir les livraisons avec status="in_progress"
      LivraisonEncours.find({ status: 'in_progress' }),
      Vehicle.find({}),
      PointRestockLot.find({ status: 'active' }),
      PointRestockSpace.find({})
    ]);
    
    // Calculate metrics
    const totalVehicles = vehicles.length;
    // Utilisation de livraisonsEncours au lieu de activeDeliveries
    const totalActiveDeliveries = livraisonsEncours.length;
    
    // Parking metrics
    const totalParkingSpaces = parkingLots.reduce((acc, lot) => acc + lot.total_spaces, 0);
    const availableParkingSpaces = parkingLots.reduce((acc, lot) => acc + lot.available_spaces, 0);
    
    // Point restock metrics (quais)
    const totalQuais = pointRestockLots.reduce((acc, lot) => acc + lot.total_spaces, 0);
    const availableQuais = pointRestockLots.reduce((acc, lot) => acc + lot.available_spaces, 0);
    
    const overviewData = {
      vehicles: {
        total: totalVehicles,
        trend: await calculateTrend('vehicles', currentDate)
      },
      deliveries: {
        active: totalActiveDeliveries,
        trend: await calculateTrend('deliveries', currentDate, null, true) // Ajout d'un paramètre pour indiquer l'utilisation de LivraisonEncours
      },
      parking: {
        available: availableParkingSpaces,
        total: totalParkingSpaces,
        trend: await calculateTrend('parking', currentDate)
      },
      quais: {
        available: availableQuais,
        total: totalQuais,
        trend: await calculateTrend('quais', currentDate, pointRestockLots)
      }
    };
    
    res.json(overviewData);
  } catch (error) {
    console.error('Error fetching overview data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/historical - Get historical data
router.get('/historical', async (req, res) => {
  const { period } = req.query;
  
  if (!['week', 'month', 'year'].includes(period)) {
    return res.status(400).json({ message: 'Invalid period. Use week, month, or year' });
  }
  
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
    
    // Get historical data
    const historicalData = {
      vehicles: await getVehicleHistory(startDate, endDate, period),
      deliveries: await getDeliveryHistory(startDate, endDate, period),
      parkings: await getParkingHistory(startDate, endDate, period),
      quais: await getPointRestockHistory(startDate, endDate, period)
    };
    
    res.json({ [period]: historicalData });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate trend
async function calculateTrend(type, currentDate, pointRestockLots = null, useNewDeliveryModel = false) {
  try {
    const previousWeek = new Date(currentDate);
    previousWeek.setDate(previousWeek.getDate() - 7);
    
    let current, previous;
    
    switch (type) {
      case 'vehicles':
        current = await Vehicle.countDocuments();
        previous = await Vehicle.countDocuments({
          created_at: { $lte: previousWeek }
        });
        break;
      case 'deliveries':
        if (useNewDeliveryModel) {
          // Utiliser le nouveau modèle LivraisonEncours
          current = await LivraisonEncours.countDocuments({
            status: 'in_progress'
          });
          previous = await LivraisonEncours.countDocuments({
            status: 'in_progress',
            created_at: { $lte: previousWeek }
          });
        } else {
          // Ancien code conservé pour la compatibilité
          current = await Delivery.countDocuments({
            date_debut: { $lte: currentDate },
            date_fin_prevue: { $gte: currentDate }
          });
          previous = await Delivery.countDocuments({
            date_debut: { $lte: previousWeek },
            date_fin_prevue: { $gte: previousWeek }
          });
        }
        break;
      case 'parking':
        const currentParking = await ParkingLot.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: null, total: { $sum: '$available_spaces' } } }
        ]);
        current = currentParking[0]?.total || 0;
        // For parking, we'll use the same value as a placeholder
        previous = current - Math.floor(Math.random() * 10);
        break;
      case 'quais':
        if (pointRestockLots) {
          // Use real point_restock_lots data if available
          current = pointRestockLots.reduce((acc, lot) => acc + lot.available_spaces, 0);
          // For trend, get the previous week data from point_restock_history
          const previousPointRestock = await PointRestockHistory.aggregate([
            { $match: { 
              timestamp: { $lte: previousWeek },
              event_type: 'exit' // Count spaces freed up by exits
            }},
            { $group: { _id: null, count: { $sum: 1 } } }
          ]);
          const previousExits = previousPointRestock[0]?.count || 0;
          
          const previousEntries = await PointRestockHistory.aggregate([
            { $match: { 
              timestamp: { $lte: previousWeek },
              event_type: 'entry' // Count spaces taken by entries
            }},
            { $group: { _id: null, count: { $sum: 1 } } }
          ]);
          
          const entriesCount = previousEntries[0]?.count || 0;
          previous = current + entriesCount - previousExits;
        } else {
          // Fallback to placeholder calculation
          current = 10 + Math.floor(Math.random() * 5);
          previous = current - Math.floor(Math.random() * 3);
        }
        break;
    }
    
    const change = current - previous;
    return change >= 0 ? `+${change}` : `${change}`;
  } catch (error) {
    console.error('Error calculating trend:', error);
    return '+0';
  }
}

// Helper function to get vehicle history
async function getVehicleHistory(startDate, endDate, period) {
  const matchStage = { created_at: { $gte: startDate, $lte: endDate } };
  const groupBy = getGroupByExpression(period);
  
  const history = await Vehicle.aggregate([
    { $match: matchStage },
    { $group: { _id: groupBy, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  
  return formatHistoryData(history, period);
}

// Helper function to get delivery history
async function getDeliveryHistory(startDate, endDate, period) {
  const matchStage = { 
    status: 'in_progress',
    created_at: { $gte: startDate, $lte: endDate } 
  };
  const groupBy = getGroupByExpression(period, 'created_at');
  
  const history = await LivraisonEncours.aggregate([
    { $match: matchStage },
    { $group: { _id: groupBy, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  
  return formatHistoryData(history, period);
}

// Helper function to get parking history
async function getParkingHistory(startDate, endDate, period) {
  const matchStage = { updated_at: { $gte: startDate, $lte: endDate } };
  const groupBy = getGroupByExpression(period, 'updated_at');
  
  const history = await ParkingLot.aggregate([
    { $match: matchStage },
    { $group: { 
      _id: groupBy, 
      available: { $sum: '$available_spaces' },
      total: { $sum: '$total_spaces' }
    }},
    { $sort: { _id: 1 } }
  ]);
  
  return formatHistoryData(history, period, 'available');
}

// Helper function to get point restock history (quais)
async function getPointRestockHistory(startDate, endDate, period) {
  try {
    // Try to use actual point restock history from the database
    const groupBy = getGroupByExpression(period, 'timestamp');
    
    // Get counts of entries and exits to calculate available spaces over time
    const history = await PointRestockHistory.aggregate([
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      { $group: { 
        _id: { 
          periodKey: groupBy, 
          eventType: '$event_type'
        },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.periodKey': 1 } }
    ]);
    
    // Also get total spaces from point_restock_lots
    const lotsData = await PointRestockLot.aggregate([
      { $group: { 
        _id: null, 
        totalSpaces: { $sum: '$total_spaces' },
        availableSpaces: { $sum: '$available_spaces' }
      }}
    ]);
    
    const totalSpaces = lotsData[0]?.totalSpaces || 0;
    const currentAvailable = lotsData[0]?.availableSpaces || 0;
    
    // Process the history to get available spaces over time
    const processedData = [];
    const maxEntries = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    
    for (let i = 1; i <= maxEntries; i++) {
      const entriesData = history.find(h => h._id.periodKey === i && h._id.eventType === 'entry');
      const exitsData = history.find(h => h._id.periodKey === i && h._id.eventType === 'exit');
      
      const entries = entriesData ? entriesData.count : 0;
      const exits = exitsData ? exitsData.count : 0;
      
      // Calculate available spaces
      const netChange = exits - entries; // Positive means more spaces freed up
      
      processedData.push({
        _id: i,
        count: currentAvailable - netChange // Current available minus the net change over time
      });
    }
    
    return formatHistoryData(processedData, period);
  } catch (error) {
    console.error('Error getting point restock history:', error);
    // Fallback to generating mock data if there's an error
    return getQuaisHistoryFallback(startDate, endDate, period);
  }
}

// Fallback function for quais history if real data isn't available
async function getQuaisHistoryFallback(startDate, endDate, period) {
  // Generate sample data
  const data = [];
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 12;
  
  for (let i = 1; i <= days; i++) {
    data.push({
      _id: i,
      count: 8 + Math.floor(Math.random() * 5)
    });
  }
  
  return formatHistoryData(data, period);
}

// Helper function to get group by expression for aggregation
function getGroupByExpression(period, dateField = 'created_at') {
  switch (period) {
    case 'week':
      return { $dayOfWeek: `$${dateField}` };
    case 'month':
      return { $dayOfMonth: `$${dateField}` };
    case 'year':
      return { $month: `$${dateField}` };
  }
}

// Helper function to format history data for frontend
function formatHistoryData(data, period, valueField = 'count') {
  const dayLabels = period === 'week' 
    ? ['L', 'M', 'M', 'J', 'V', 'S', 'D']
    : period === 'month' 
      ? Array(30).fill().map((_, i) => `${i+1}`)
      : Array(12).fill().map((_, i) => `${i+1}`);
  
  return dayLabels.map((day, index) => {
    const dayIndex = period === 'week' ? index + 1 : index + 1;
    const dataPoint = data.find(d => d._id === dayIndex);
    return {
      day,
      value: dataPoint ? dataPoint[valueField] : 0
    };
  });
}

module.exports = router;