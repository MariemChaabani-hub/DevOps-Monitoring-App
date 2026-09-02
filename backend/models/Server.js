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
  // Services detected by the agent's systemctl-based scan, normalized to
  // {name, active_state, sub_state, description} by the /metrics ingestion
  // handler. Stored as Mixed (not a strict sub-schema) so a document
  // written by an older agent (plain string array) or one written before
  // this rollout never fails Mongoose casting on read.
  services: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  // Set when the agent's most recent metrics payload explicitly signaled
  // that service detection failed this cycle (systemctl unavailable,
  // timed out, etc.) — lets the UI show "detection unavailable" instead
  // of silently showing an empty or stale list. Cleared on the next
  // successful detection.
  services_detection_failed_at: {
    type: Date,
    default: null
  },
  // Version string reported by the agent with each metrics payload — lets
  // the UI flag a server running stale agent code instead of that looking
  // like a detection bug (see agent/collector.py AGENT_VERSION).
  agent_version: {
    type: String,
    default: null
  },
  // Seconds between this agent's metric collection cycles, as it reports
  // itself — used to size the OFFLINE-detection threshold to this agent's
  // actual cadence instead of one hardcoded value for every agent.
  collection_interval: {
    type: Number,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  ip_address: {
    type: String,
    default: null
  },
  ssh_username: {
    type: String,
    default: 'root'
  },
  ssh_password: {
    type: String,
    default: null
  },
  ssh_port: {
    type: Number,
    default: 22
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
