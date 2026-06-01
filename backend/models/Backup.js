const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  serverId: {
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
    enum: ['OK', 'FAILED', 'LATE'],
    required: true,
    default: 'OK',
    index: true
  },
  duration: {
    type: Number,
    required: true,
    description: 'Duration in seconds'
  },
  size: {
    type: Number,
    required: true,
    description: 'Size in MB'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Compound index for efficient queries on serverId and date
BackupSchema.index({ serverId: 1, date: -1 });

// Index for status queries
BackupSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Backup', BackupSchema);
