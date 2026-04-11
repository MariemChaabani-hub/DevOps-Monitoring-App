const mongoose = require('mongoose');

const ThresholdSchema = new mongoose.Schema({
  metric_name: {
    type: String,
    required: true,
    enum: ['cpu', 'ram', 'disk'],
    unique: true
  },
  warning_level: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  critical_level: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  description: {
    type: String,
    default: ''
  },
  enabled: {
    type: Boolean,
    default: true
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
  collection: 'thresholds'
});

module.exports = mongoose.model('Threshold', ThresholdSchema);
