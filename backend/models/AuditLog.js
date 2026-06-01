/**
 * Audit Log Model
 * Journalisation des actions d'administration à distance
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Informations sur l'action
  action: {
    type: String,
    required: true,
    enum: [
      'RESTART_SERVICE',
      'START_SERVICE', 
      'STOP_SERVICE',
      'RESTART_SERVER',
      'SHUTDOWN_SERVER'
    ]
  },
  
  // Cible de l'action (SERVICE ou SERVER)
  target: {
    type: String,
    required: true,
    enum: ['SERVICE', 'SERVER']
  },
  
  // Identifiant du serveur concerné
  server_id: {
    type: String,
    required: true
  },
  
  // Administrateur qui a effectué l'action
  admin_email: {
    type: String,
    required: true
  },
  
  // Résultat de l'action
  result: {
    type: String,
    required: true,
    enum: ['SUCCESS', 'FAILED']
  },
  
  // Détails supplémentaires
  details: {
    type: String,
    default: null
  },
  
  // Informations de sécurité
  ip_address: {
    type: String,
    required: true
  },
  user_agent: {
    type: String,
    required: true
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  // Métadonnées spécifiques
  metadata: {
    service_name: String,
    command: String,
    delay_seconds: Number,
    reason: String
  }
}, {
  timestamps: true
});

// Index pour les requêtes rapides
auditLogSchema.index({ server_id: 1, timestamp: -1 });
auditLogSchema.index({ admin_email: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ result: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
