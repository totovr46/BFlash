const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  isUsernameSet: {
    type: Boolean,
    default: false
  },
  profile: {
    bio: String,
    avatar: String
  },
  decks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck'
  }],
  // --- Add Streak Fields ---
  lastLoginDate: {
    type: Date,
    default: null // Initialize as null
  },
  currentStreak: {
    type: Number,
    default: 0 // Initialize streak at 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('User', userSchema);