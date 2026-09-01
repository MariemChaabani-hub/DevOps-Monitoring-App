const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  server_id: {
    type: String,
    required: true,
    index: true
  },
  // Free-form systemd unit name (or 'pm2') — any service the agent
  // actually detects can be restarted and logged here, not just the
  // handful known ahead of time.
  service_name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['running', 'stopped', 'error', 'unknown'],
    default: 'unknown'
  },
  uptime: {
    type: String,
    default: 'N/A'
  },
  process_id: {
    type: Number,
    default: null
  },
  memory_usage: {
    type: Number,
    default: 0
  },
  cpu_usage: {
    type: Number,
    default: 0
  },
  last_restart: {
    type: Date,
    default: null
  },
  restart_count: {
    type: Number,
    default: 0
  },
  last_health_check: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'services'
});

// Index composite pour recherche rapide
ServiceSchema.index({ server_id: 1, service_name: 1 }, { unique: true });

// Update updated_at on save
ServiceSchema.pre('save', async function() {
  this.updated_at = Date.now();
});

module.exports = mongoose.model('Service', ServiceSchema);
