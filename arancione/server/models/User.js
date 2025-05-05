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

// Method to compare entered password with the hashed password in the database
userSchema.methods.comparePassword = async function(candidatePassword) {
  // 'this.password' refers to the password hash of the user document this method is called on.
  // Need to ensure the password was selected when fetching the user for this to work.
  if (!this.password) {
      // This might happen if the password field wasn't selected or doesn't exist (e.g., OAuth user)
      return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);