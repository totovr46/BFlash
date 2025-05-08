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
    required: function() { return !this.googleId; },
    minlength: 6,
    //select: false // Prevents the password hash from being returned by default in queries --> suggested by AI but creates bugs
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
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // --- Add Streak Fields ---
  lastLoginDate: {
    type: Date,
    default: null
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  // --- End Streak Fields ---
  createdAt: {
    type: Date,
    default: Date.now
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
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

// Hash password before saving (only if modified and exists)
userSchema.pre('save', async function(next) {
  // Only hash if password is provided and modified
  if (!this.password || !this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare entered password with the hashed password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false; // Cannot compare if no password hash exists (e.g., Google-only user)
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);