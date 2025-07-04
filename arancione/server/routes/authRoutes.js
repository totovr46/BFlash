const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();
const { calculateAndUpdateStreak } = require('../utils/streakUtils');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Make sure environment variables are loaded in this file
dotenv.config();

// Registrazione
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (username.length < 3) {
      return res.status(400).json({ 
        message: 'Username must be at least 3 characters long',
        field: 'username'
      });
    }
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
    const streak = await calculateAndUpdateStreak(user.id);
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
        const streak = await calculateAndUpdateStreak(req.user.id);
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
// Configura Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Aggiungi questa funzione di verifica dopo la configurazione
transporter.verify(function(error, success) {
  if (error) {
    console.error('Errore nella configurazione di Nodemailer:', error);
  } else {
    console.log('Server Nodemailer pronto per inviare email');
  }
});
// Generate random 6-digit code
function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Temporary storage for reset codes (in production use Redis or DB)
const resetCodes = new Map();

// Request reset code
router.post('/request-reset-code', async (req, res) => {
  try {
      const { email } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(200).json({ message: 'If this email is registered, you will receive a reset code' });
      }
      
      // Generate code and token
      const resetCode = generateResetCode();
      const resetToken = crypto.randomBytes(20).toString('hex');
      
      // Store code temporarily (valid for 15 minutes)
      resetCodes.set(resetToken, {
          email,
          code: resetCode,
          expiresAt: Date.now() + 900000 // 15 minutes
      });
      
      // Send email with code
      const mailOptions = {
          to: email,
          from: process.env.GMAIL_USER,
          subject: 'Your Password Reset Code',
          html: `
              <p>You requested a password reset for your Bflash account.</p>
              <p>Your reset code is: <strong>${resetCode}</strong></p>
              <p>This code will expire in 15 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
          `
      };
      
      await transporter.sendMail(mailOptions);
      
      res.json({ 
          message: 'Reset code sent to your email',
          resetToken // Send back to client for verification
      });
      
  } catch (err) {
      console.error('Request reset code error:', err);
      res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with code

router.post('/reset-password', async (req, res) => {
  try {
      const { email, code, newPassword, resetToken } = req.body;
      
      // Verifica del codice di reset
      const resetData = resetCodes.get(resetToken);
      
      if (!resetData || 
          resetData.email !== email || 
          resetData.code !== code || 
          resetData.expiresAt < Date.now()) {
          return res.status(400).json({ message: 'Codice di reset non valido o scaduto' });
      }
      
      // Trova l'utente
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(400).json({ message: 'Utente non trovato' });
      }
      
      // Genera il salt e hash manualmente
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Aggiorna la password direttamente usando findOneAndUpdate
      await User.findOneAndUpdate(
          { email },
          { 
              $set: { 
                  password: hashedPassword 
              }
          }
      );
      
      // Elimina il codice di reset utilizzato
      resetCodes.delete(resetToken);
      
      
      res.json({ message: 'Password aggiornata con successo' });
      
  } catch (err) {
      console.error('Errore nel reset della password:', err);
      res.status(500).json({ message: 'Errore del server' });
  }
});

module.exports = router;