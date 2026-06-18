const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * Authenticate administrator
 * POST /api/auth/admin
 */
router.post('/admin', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email requis',
        message: 'L\'adresse email est requise.'
      });
    }

    // Query user from MongoDB
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        error: 'Utilisateur non trouvé',
        message: 'Cet email n\'est pas enregistré dans la base de données.'
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Accès interdit',
        message: 'Vous n\'avez pas les permissions d\'administrateur.'
      });
    }

    res.json({
      success: true,
      message: 'Authentification réussie',
      email: user.email,
      role: user.role
    });

  } catch (error) {
    console.error('[Auth API] Erreur d\'authentification:', error);
    res.status(500).json({
      error: 'Erreur serveur/base de données',
      message: 'Impossible de vérifier les identifiants avec la base de données.'
    });
  }
});

module.exports = router;
