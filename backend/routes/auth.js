const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const TOKEN_EXPIRES_IN = '24h';

/**
 * Login with email + password
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Champs requis',
        message: 'Email et mot de passe sont requis.'
      });
    }

    if (mongoose.connection.readyState !== 1) {
      console.error('[Auth API] MongoDB connection state is down:', mongoose.connection.readyState);
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'La base de données MongoDB est actuellement indisponible.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        error: 'Utilisateur non trouvé',
        message: 'Cet email n\'est pas enregistré.'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Mot de passe incorrect',
        message: 'Le mot de passe saisi est incorrect.'
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Authentification réussie',
      token,
      email: user.email,
      role: user.role,
      expiresIn: TOKEN_EXPIRES_IN
    });

  } catch (error) {
    console.error('[Auth API] Erreur de connexion:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de traiter la demande de connexion.'
    });
  }
});

/**
 * Return the currently authenticated user (used by the frontend to
 * validate a stored token on load).
 * GET /api/auth/me
 */
router.get('/me', verifyToken, (req, res) => {
  res.json({ success: true, email: req.user.email, role: req.user.role });
});

module.exports = router;
