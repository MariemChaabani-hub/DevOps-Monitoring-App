const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  serverId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['WARNING', 'CRITICAL'],
    required: true,
    index: true
  },
  metric: {
    type: String,
    required: true,
    default: 'cpu_percent'
  },
  value: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  message: {
    type: String,
    required: false
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'alerts'
});

// Index for efficient lookups
AlertSchema.index({ serverId: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', AlertSchema);
