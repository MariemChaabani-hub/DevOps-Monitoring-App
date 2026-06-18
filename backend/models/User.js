const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'user'],
    default: 'admin'
  }
}, {
  timestamps: true,
  collection: 'users'
});

module.exports = mongoose.model('User', UserSchema);
