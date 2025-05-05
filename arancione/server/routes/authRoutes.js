const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Registrazione
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Verifica se l'email esiste già
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Verifica se lo username esiste già
    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Crea nuovo utente
    user = new User({
      username,
      email,
      password
    });

 
    await user.save();

    // Genera JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          } 
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// --- Modified Login Route ---
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    let user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    }).select('+password'); // Make sure to select password if needed for comparison

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials (user not found)' });
    }

    // Check if user registered via Google without setting a password
    if (!user.password) {
         return res.status(400).json({ message: 'Please log in using Google or set a password for your account.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials (password mismatch)' });
    }

    // --- Calculate and Update Streak ---
    await calculateAndUpdateStreak(user.id);
    // --- End Streak Logic ---

    // Generate JWT
    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
            // DO NOT send back streak/lastLoginDate here unless needed by client immediately
          }
        });
      }
    );
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).send('Server error');
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// --- Modified Google Callback Route ---
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login.html?error=google_auth_failed', // Add error param
    session: false
  }),
  async (req, res) => { // Make the handler async
    // req.user should be populated by passport's findOrCreate logic
    if (!req.user) {
        console.error('Google callback: req.user not found after passport authenticate.');
        return res.redirect('/login.html?error=google_user_not_found');
    }

    console.log('Google callback successful, User:', req.user); // Log user from passport

    try {
        // --- Calculate and Update Streak ---
        await calculateAndUpdateStreak(req.user.id);
        // --- End Streak Logic ---

        // Generate JWT
        const payload = { user: { id: req.user.id } };
        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: '7d' },
          (err, token) => {
            if (err) {
              console.error('JWT signing error after Google auth:', err);
              return res.redirect('/login.html?error=jwt_signing_error');
            }

            // Fetch fresh user data *after* potential streak update if needed for redirect logic
            // Or rely on req.user potentially modified by calculateAndUpdateStreak if it returns user
            const userForRedirect = {
                 id: req.user.id,
                 username: req.user.username, // Use potentially updated username
                 email: req.user.email,
                 isUsernameSet: req.user.isUsernameSet // Check if username needs setup
             };

            // Redirect logic
            if (!userForRedirect.isUsernameSet) {
              // Pass necessary info for username setup page
              console.log(`Redirecting Google user ${userForRedirect.id} to setup username`);
              return res.redirect(`/setup-username.html?token=${token}&email=${encodeURIComponent(userForRedirect.email)}`);
            } else {
              // Redirect to main app page, passing token and basic user info
              console.log(`Redirecting Google user ${userForRedirect.id} to index`);
              const userParam = encodeURIComponent(JSON.stringify({
                 id: userForRedirect.id,
                 username: userForRedirect.username,
                 // Do not include sensitive info like email here unless necessary
               }));
              return res.redirect(`/?token=${token}&user=${userParam}`);
            }
          }
        );
    } catch (error) {
        console.error('Error during Google callback processing (streak/jwt):', error);
        return res.redirect('/login.html?error=google_callback_processing_error');
    }
  }
);



// Nuova route per impostare l'username
router.post('/set-username', async (req, res) => {
  try {
    const { username, token } = req.body;

    // Verifica token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verifica se username è già in uso
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Aggiorna l'utente
    const user = await User.findByIdAndUpdate(
      decoded.user.id,
      { 
        username,
        isUsernameSet: true 
      },
      { new: true }
    ).select('-password');

    // Genera un nuovo token JWT
    const newPayload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      newPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, newToken) => {
        if (err) throw err;
        res.json({
          token: newToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;