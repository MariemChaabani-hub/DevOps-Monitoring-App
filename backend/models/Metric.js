const mongoose = require('mongoose');

const MetricSchema = new mongoose.Schema({
  server_id: {
    type: String,
    required: true,
    index: true
  },
  serverId: {
    type: String,
    index: true
  },
  server_name: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  cpu_percent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  ram_percent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  memory_percent: {
    type: Number,
    min: 0,
    max: 100
  },
  ram_used_gb: {
    type: Number,
    required: false
  },
  ram_total_gb: {
    type: Number,
    required: false
  },
  disk_percent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  disk_used_gb: {
    type: Number,
    required: false
  },
  disk_total_gb: {
    type: Number,
    required: false
  },
  network_io: {
    bytes_sent: Number,
    bytes_recv: Number,
    packets_sent: Number,
    packets_recv: Number,
    errors_in: Number,
    errors_out: Number,
    dropped_in: Number,
    dropped_out: Number
  },
  network_in: {
    type: Number
  },
  network_out: {
    type: Number
  },
  uptime: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  uptime_seconds: {
    type: Number
  },
  uptime_days: {
    type: Number
  },
  boot_time: {
    type: String
  },
  status: {
    type: String,
    enum: ['OK', 'WARNING', 'CRITICAL'],
    default: 'OK'
  },
  location: {
    type: String,
    default: 'Unknown'
  }
}, { 
  timestamps: true,
  collection: 'metrics'
});

// Indexes for performance
MetricSchema.index({ server_id: 1, timestamp: -1 });
MetricSchema.index({ serverId: 1, timestamp: -1 });
MetricSchema.index({ timestamp: -1 });
MetricSchema.index({ status: 1 });

// Pre-save hook to ensure serverId matches server_id
MetricSchema.pre('save', async function() {
  if (!this.serverId && this.server_id) {
    this.serverId = this.server_id;
  }
});

module.exports = mongoose.model('Metric', MetricSchema);
