const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  server_id: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'missing'],
    required: true,
    index: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Compound index for efficient server + date queries
BackupSchema.index({ server_id: 1, date: -1 });

// Compound index for efficient status queries
BackupSchema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('Backup', BackupSchema);
