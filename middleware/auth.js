const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète';

module.exports = function(req, res, next) {
  // Récupération du token depuis l'en-tête
  const token = req.header('x-auth-token');

  // Vérification de la présence du token
  if (!token) {
    return res.status(401).json({ message: 'Pas de token, autorisation refusée' });
  }

  try {
    // Vérification du token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token non valide' });
  }
};

// Middleware pour vérifier les rôles
module.exports.checkRole = function(roles) {
  return (req, res, next) => {
    // Vérifie si le rôle de l'utilisateur est dans la liste des rôles autorisés
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    next();
  };
};