const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  serverId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['WARNING', 'CRITICAL', 'BACKUP_FAILED', 'BACKUP_LATE'],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['WARNING', 'CRITICAL'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
    default: 'ACTIVE',
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
  message: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolvedAt: {
    type: Date,
    default: null  // Set when alert is resolved
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  },
  // Set when an admin acknowledges the alert (status -> ACKNOWLEDGED).
  // Previously the bulk-acknowledge route wrote acknowledged_at/
  // acknowledged_by — snake_case fields that don't exist on this schema —
  // silently dropped under strict:true, same bug family as resolved_at.
  acknowledgedAt: {
    type: Date,
    default: null
  },
  acknowledgedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'alerts',
  // Throw instead of silently dropping a write to an unknown field name
  // (document saves/updates) or silently ignoring an unknown filter key
  // (queries) — this is the third bug of this exact shape found in this
  // collection alone (resolved_at, server_id/created_at, and the
  // acknowledged_at/acknowledged_by above); a loud error at the call site
  // is far cheaper to fix than a query that silently returns nothing or a
  // write that silently loses data.
  strict: 'throw',
  strictQuery: 'throw'
});

// Index for efficient lookups
AlertSchema.index({ serverId: 1, type: 1, timestamp: -1 });
AlertSchema.index({ status: 1, severity: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', AlertSchema);
