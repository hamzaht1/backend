// routes/traffic.js
const express = require('express');
const router = express.Router();
const VehicleKm = require('../models/VehicleKm');
const Vehicle = require('../models/Vehicle');

// GET /api/traffic/current - Get current traffic data
router.get('/current', async (req, res) => {
  try {
    // Get total kilometers for all vehicles
    const totalKmResult = await VehicleKm.aggregate([
      {
        $group: {
          _id: null,
          totalKm: { $sum: "$total_km" },
          vehicleCount: { $sum: 1 }
        }
      }
    ]);
    
    const currentData = totalKmResult[0] || { totalKm: 0, vehicleCount: 0 };
    
    // Calculate average km per vehicle
    const averageKm = currentData.vehicleCount > 0 
      ? Math.round(currentData.totalKm / currentData.vehicleCount)
      : 0;
    
    // Calculate trend (comparison with last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const lastMonthData = await VehicleKm.aggregate([
      {
        $match: {
          last_updated: { $gte: lastMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalKm: { $sum: "$total_km" }
        }
      }
    ]);
    
    const lastMonthKm = lastMonthData[0]?.totalKm || currentData.totalKm;
    const trend = lastMonthKm > 0 
      ? Math.round(((currentData.totalKm - lastMonthKm) / lastMonthKm) * 100)
      : 0;
    
    res.json({
      totalKm: Math.round(currentData.totalKm),
      averageKm,
      trend: trend > 0 ? `+${trend}%` : `${trend}%`,
      vehicleCount: currentData.vehicleCount
    });
  } catch (error) {
    console.error('Error fetching current traffic data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/traffic/historical - Get historical traffic data
router.get('/historical', async (req, res) => {
  const { period } = req.query;
  
  if (!['30days', '3months', '6months', '1year'].includes(period)) {
    return res.status(400).json({ message: 'Invalid period. Use 30days, 3months, 6months, or 1year' });
  }
  
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '3months':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
    
    // Get historical data
    const historicalData = await getTrafficHistory(startDate, endDate, period);
    
    res.json({ 
      period,
      data: historicalData 
    });
  } catch (error) {
    console.error('Error fetching historical traffic data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to get traffic history
async function getTrafficHistory(startDate, endDate, period) {
  let groupBy;
  let dateFormat;
  
  // Determine grouping based on period
  switch (period) {
    case '30days':
      groupBy = {
        year: { $year: "$last_updated" },
        month: { $month: "$last_updated" },
        day: { $dayOfMonth: "$last_updated" }
      };
      dateFormat = 'day';
      break;
    case '3months':
    case '6months':
      groupBy = {
        year: { $year: "$last_updated" },
        month: { $month: "$last_updated" }
      };
      dateFormat = 'month';
      break;
    case '1year':
      groupBy = {
        year: { $year: "$last_updated" },
        month: { $month: "$last_updated" }
      };
      dateFormat = 'month';
      break;
  }
  
  // Aggregate data by time period
  const aggregatedData = await VehicleKm.aggregate([
    {
      $match: {
        last_updated: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: groupBy,
        totalKm: { $sum: "$total_km" },
        vehicleCount: { $sum: 1 }
      }
    },
    {
      $sort: { 
        "_id.year": 1, 
        "_id.month": 1, 
        "_id.day": 1 
      }
    }
  ]);
  
  // Format data for frontend
  return formatTrafficData(aggregatedData, period, startDate, endDate);
}

// Format traffic data for the frontend
function formatTrafficData(data, period, startDate, endDate) {
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  if (period === '30days') {
    // For 30 days, group by day and show last 30 days
    const result = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = current.getMonth() + 1;
      const day = current.getDate();
      
      const dataPoint = data.find(d => 
        d._id.year === year && 
        d._id.month === month && 
        d._id.day === day
      );
      
      result.push({
        month: `${day}/${month}`,
        traffic: dataPoint ? Math.round(dataPoint.totalKm / 1000) : 0 // Convert to thousands of km
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return result;
  } else {
    // For months, group by month
    const result = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = current.getMonth() + 1;
      
      const dataPoint = data.find(d => 
        d._id.year === year && 
        d._id.month === month
      );
      
      result.push({
        month: monthNames[month - 1],
        traffic: dataPoint ? Math.round(dataPoint.totalKm / 1000) : 0 // Convert to thousands of km
      });
      
      current.setMonth(current.getMonth() + 1);
    }
    
    return result;
  }
}

// GET /api/traffic/top-vehicles - Get top vehicles by kilometers
router.get('/top-vehicles', async (req, res) => {
  const { limit = 10 } = req.query;
  
  try {
    const topVehicles = await VehicleKm.aggregate([
      {
        $sort: { total_km: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'vehicules',
          localField: 'uid',
          foreignField: 'uid',
          as: 'vehicleInfo'
        }
      },
      {
        $unwind: {
          path: '$vehicleInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          uid: 1,
          total_km: 1,
          license_plate: '$vehicleInfo.license_plate',
          created_at: 1
        }
      }
    ]);
    
    res.json(topVehicles.map(vehicle => ({
      ...vehicle,
      total_km: Math.round(vehicle.total_km)
    })));
  } catch (error) {
    console.error('Error fetching top vehicles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;