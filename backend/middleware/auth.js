const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT sent in the Authorization: Bearer <token> header.
 * Attaches the decoded payload ({ id, email, role }) to req.user.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Token manquant',
      message: 'Authentification requise. Veuillez vous connecter.'
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError'
      ? 'Votre session a expiré. Veuillez vous reconnecter.'
      : 'Token invalide.';
    return res.status(401).json({ error: 'Non autorisé', message });
  }
}

/**
 * Restricts access to users whose JWT role is in `roles`.
 * Must run after verifyToken.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Accès interdit',
        message: 'Vous n\'avez pas les permissions nécessaires.'
      });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
