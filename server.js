// server.js - Version avec gestion d'erreurs pour les routes
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
require('dotenv').config();

const app = express();

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vehicle Tracking API',
      version: '1.0.0',
      description: 'API documentation for Vehicle Tracking System',
      contact: {
        name: 'API Support',
        url: 'http://192.168.56.1:5000'
      }
    },
    servers: [
      {
        url: 'http://192.168.56.1:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

app.use(express.json());
app.use(cors({
  origin: 'http://192.168.56.1:3000'
}));

mongoose.connect('mongodb://localhost:27017/vehicles_tracking')
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.log('Erreur de connexion MongoDB:', err));

// Routes existantes avec gestion d'erreurs
const routesConfig = [
  { path: '/api/auth', module: './routes/auth' },
  { path: '/api/data', module: './routes/data' },
  { path: '/api/dashboard', module: './routes/dashboard' },
  { path: '/api/traffic', module: './routes/traffic' },
  { path: '/api/fleet', module: './routes/fleet' },
  { path: '/api/livraisons', module: './routes/livraison' },
  { path: '/api/parking', module: './routes/parking' },
  { path: '/api/personnel', module: './routes/personnel' },
  { path: '/api/point-restock', module: './routes/pointRestock' }, // Ajout de la route point-restock
  { path: '/api/diagnostique', module: './routes/diagnostique' }, // Ajout de la route diagnostique
  { path: '/api/driver', module: './routes/vehicleinfo' }, // Ajout de la nouvelle route driver
  { path: '/api/live-position', module: './routes/livePosition' } // Ajout de la route live-position
];
const diagnostiquesRoutes = require('./routes/diagnostiquecon');
app.use('/api/diagnostiques', diagnostiquesRoutes);
const livraisonRoutes = require('./routes/trip');
app.use('/api/livraison', livraisonRoutes);
// Charger les routes avec gestion d'erreurs
routesConfig.forEach(({ path, module }) => {
  try {
    const router = require(module);
    if (typeof router === 'function' || (router && typeof router === 'object')) {
      app.use(path, router);
      console.log(`✅ Route ${path} chargée depuis ${module}`);
    } else {
      console.error(`❌ Route ${path}: ${module} n'exporte pas un router valide`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors du chargement de ${path} depuis ${module}:`, error.message);
  }
});

// Route delivery avec gestion d'erreur spéciale
try {
  console.log('Chargement de la route delivery...');
  const deliveryRoutes = require('./routes/delivery');
  
  if (deliveryRoutes && (typeof deliveryRoutes === 'function' || typeof deliveryRoutes === 'object')) {
    app.use('/api/data', deliveryRoutes);
    console.log('✅ Routes delivery chargées avec succès');
  } else {
    console.error('❌ deliveryRoutes n\'est pas un router valide:', typeof deliveryRoutes);
  }
} catch (error) {
  console.error('❌ Erreur lors du chargement de delivery routes:', error);
  console.error('Stack trace:', error.stack);
}

// Ajouter les nouvelles routes si elles existent
try {
  const vehicleRoutes = require('./routes/vehicles');
  const positionRoutes = require('./routes/positions');
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/positions', positionRoutes);
  console.log('✅ Routes port-sec-map chargées avec succès');
} catch (error) {
  console.log('⚠️  Routes port-sec-map non trouvées:', error.message);
  console.log('   Créez les fichiers routes/vehicles.js et routes/positions.js si nécessaire');
}

// Ajout de la route pour les points de restock
try {
  console.log('Chargement des routes point-restock...');
  const pointRestockRoutes = require('./routes/pointRestock');
  
  if (pointRestockRoutes && (typeof pointRestockRoutes === 'function' || typeof pointRestockRoutes === 'object')) {
    app.use('/api/point-restock', pointRestockRoutes);
    console.log('✅ Routes point-restock chargées avec succès');
  } else {
    console.error('❌ pointRestockRoutes n\'est pas un router valide:', typeof pointRestockRoutes);
  }
} catch (error) {
  console.error('❌ Erreur lors du chargement des routes point-restock:', error);
  console.error('Stack trace:', error.stack);
  console.log('   Vérifiez que vous avez bien créé les modèles et le fichier routes/pointRestock.js');
}

// Ajout de la route pour les diagnostics
try {
  console.log('Chargement des routes diagnostique...');
  const diagnostiqueRoutes = require('./routes/diagnostique');
  
  if (diagnostiqueRoutes && (typeof diagnostiqueRoutes === 'function' || typeof diagnostiqueRoutes === 'object')) {
    app.use('/api/diagnostique', diagnostiqueRoutes);
    console.log('✅ Routes diagnostique chargées avec succès');
    
    // Vérifier l'état de la collection diagnostique
    setTimeout(async () => {
      try {
        const Diagnostique = require('./models/Diagnostic');
        const count = await Diagnostique.countDocuments();
        console.log(`✅ Collection diagnostique vérifiée: ${count} documents trouvés`);
      } catch(err) {
        console.error('⚠️ Erreur lors de la vérification de la collection diagnostique:', err.message);
      }
    }, 1000);
  } else {
    console.error('❌ diagnostiqueRoutes n\'est pas un router valide:', typeof diagnostiqueRoutes);
  }
} catch (error) {
  console.error('❌ Erreur lors du chargement des routes diagnostique:', error);
  console.error('Stack trace:', error.stack);
  console.log('   Vérifiez que vous avez bien créé le modèle Diagnostique.js et les routes diagnostique.js');
}

// Ajout de la route pour le dashboard conducteur
try {
  console.log('Chargement des routes driver...');
  const driverRoutes = require('./routes/vehicleinfo');
  
  if (driverRoutes && (typeof driverRoutes === 'function' || typeof driverRoutes === 'object')) {
    app.use('/api/driver', driverRoutes);
    console.log('✅ Routes driver chargées avec succès');
    
    // Vérifier si les routes driver sont correctement configurées
    setTimeout(async () => {
      try {
        // Vérification optionnelle si nécessaire
        console.log('✅ Routes driver vérifiées et prêtes');
      } catch(err) {
        console.error('⚠️ Erreur lors de la vérification des routes driver:', err.message);
      }
    }, 1000);
  } else {
    console.error('❌ driverRoutes n\'est pas un router valide:', typeof driverRoutes);
  }
} catch (error) {
  console.error('❌ Erreur lors du chargement des routes driver:', error);
  console.error('Stack trace:', error.stack);
  console.log('   Vérifiez que vous avez bien créé le fichier routes/driver.js');
}

// Ajout de la route pour les positions en temps réel
try {
  console.log('Chargement des routes live-position...');
  const livePositionRoutes = require('./routes/livePosition');
  
  if (livePositionRoutes && (typeof livePositionRoutes === 'function' || typeof livePositionRoutes === 'object')) {
    app.use('/api/live-position', livePositionRoutes);
    console.log('✅ Routes live-position chargées avec succès');
    
    // Vérifier l'état de la collection live_position
    setTimeout(async () => {
      try {
        const LivePosition = require('./models/LivePosition');
        const count = await LivePosition.countDocuments();
        console.log(`✅ Collection live_position vérifiée: ${count} documents trouvés`);
      } catch(err) {
        console.error('⚠️ Erreur lors de la vérification de la collection live_position:', err.message);
        console.log('   Si la collection existe déjà dans MongoDB, vous pouvez ignorer cette erreur');
      }
    }, 1000);
  } else {
    console.error('❌ livePositionRoutes n\'est pas un router valide:', typeof livePositionRoutes);
  }
} catch (error) {
  console.error('❌ Erreur lors du chargement des routes live-position:', error);
  console.error('Stack trace:', error.stack);
  console.log('   Vérifiez que vous avez bien créé le fichier routes/livePosition.js');
}

// Ajout de la route pour les trajets (utilisant la collection "historique")
try {
  console.log('Chargement des routes historique...');
  const historiqueRoutes = require('./routes/historique');
  
  if (historiqueRoutes && (typeof historiqueRoutes === 'function' || typeof historiqueRoutes === 'object')) {
    app.use('/api/historique', historiqueRoutes);
    console.log('✅ Routes historique chargées avec succès');
    
    // Vérifier l'état de la collection historique
    setTimeout(async () => {
      try {
        const Trip = require('./models/trip');
        const count = await Trip.countDocuments();
        console.log(`✅ Collection historique vérifiée: ${count} documents trouvés`);
      } catch(err) {
        console.error('⚠️ Erreur lors de la vérification de la collection historique:', err.message);
        console.log('   Si la collection n\'existe pas encore, elle sera créée lors de la première utilisation');
      }
    }, 1000);
  } else {
    console.error('❌ historiqueRoutes n\'est pas un router valide:', typeof historiqueRoutes);
  }
} catch (error) {
  console.error('❌ Erreur lors du chargement des routes historique:', error);
  console.error('Stack trace:', error.stack);
  console.log('   Vérifiez que vous avez bien créé le fichier routes/historique.js');
}
const parkingRoutes = require('./routes/parkingcon');
app.use('/api/parking', parkingRoutes);
// Route de test
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API fonctionnelle!', 
    timestamp: new Date(),
    routes: [
      '/api/auth',
      '/api/data',
      '/api/dashboard',
      '/api/traffic',
      '/api/fleet',
      '/api/livraisons',
      '/api/parking',
      '/api/personnel',
      '/api/delivery',
      '/api/vehicles',
      '/api/positions',
      '/api/point-restock',
      '/api/diagnostique',
      '/api/driver',
      '/api/live-position' // Ajout de la route live-position
    ]
  });
});

const deliveryRoutes = require('./routes/delivery');
app.use('/api/delivery', deliveryRoutes);
const pointRestockRoutes = require('./routes/pointrestockcon');
app.use('/api/pointRestock', pointRestockRoutes);
// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err);
  res.status(500).json({ message: 'Erreur serveur interne', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 API disponible sur http://192.168.56.1:${PORT}/api`);
  console.log(`🌐 CORS configuré pour http://192.168.56.1:3000`);
  console.log('\n📋 Pour utiliser les diagnostiques, vérifiez:');
  console.log('1. La collection "diagnostique" existe dans votre base MongoDB');
  console.log('2. Les documents dans la collection ont au moins les champs uid, license_plate, dtc_code');
  console.log('3. Testez avec http://192.168.56.1:5000/api/diagnostique/stats');
  console.log('\n📋 Pour le dashboard conducteur:');
  console.log('1. Un conducteur doit avoir un vehicleId assigné dans la collection users');
  console.log('2. Testez avec http://192.168.56.1:5000/api/driver/vehicle-info (avec un token JWT valide)');
  console.log('\n📋 Pour les positions en temps réel:');
  console.log('1. La collection "live_position" existe dans votre base MongoDB');
  console.log('2. Testez avec http://192.168.56.1:5000/api/live-position/current (avec un token JWT valide)');
});