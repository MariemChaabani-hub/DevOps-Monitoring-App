const mongoose = require('mongoose');

const ServerSchema = new mongoose.Schema({
  server_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'Unknown'
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['OK', 'WARNING', 'CRITICAL', 'OFFLINE'],
    default: 'OK',
    index: true
  },
  last_metric_time: {
    type: Date,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  alert_email: {
    type: String,
    default: null
  },
  current_metrics: {
    cpu_percent: {
      type: Number,
      default: 0
    },
    ram_percent: {
      type: Number,
      default: 0
    },
    disk_percent: {
      type: Number,
      default: 0
    }
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
  collection: 'servers'
});

// Update updated_at on save
ServerSchema.pre('save', async function() {
  this.updated_at = Date.now();
});

module.exports = mongoose.model('Server', ServerSchema);
