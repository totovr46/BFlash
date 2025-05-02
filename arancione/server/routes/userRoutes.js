// filepath: /workspaces/BFlash/arancione/server/routes/userRoutes.js
const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Ottieni profilo utente corrente
router.get('/me', auth, async (req, res) => {
  try {
    console.log('GET /users/me - ID utente:', req.user);
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      console.log('Utente non trovato con ID:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('Utente trovato:', user.username);
    res.json(user);
  } catch (err) {
    console.error('Errore in /users/me:', err.message);
    res.status(500).send('Server error');
  }
});

// Aggiorna profilo utente
router.put('/me', auth, async (req, res) => {
  try {
    const { username, bio } = req.body;
    
    // Costruisci l'oggetto di aggiornamento
    const updateObject = {};
    if (username) updateObject.username = username;
    if (bio) updateObject['profile.bio'] = bio;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateObject },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// --- Add New Route for Streak ---
// Helper function (can be shared with authRoutes)
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

// GET current user's streak
router.get('/me/streak', auth, async (req, res) => {
  try {
    // Fetch user fresh from DB using ID from auth token
    const user = await User.findById(req.user.id).select('currentStreak lastLoginDate'); // Only select needed fields

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the streak is valid *today*
    const today = new Date();
    let validStreak = 1; // Default to 0

    if (user.lastLoginDate) {
        const lastLogin = new Date(user.lastLoginDate);
        // Streak is valid if the last login was today OR yesterday
        if (isSameDay(lastLogin, today) || isYesterday(lastLogin, today)) {
             validStreak = user.currentStreak;
        }
        // If last login was before yesterday, validStreak remains 0
    }
     // If lastLoginDate is null, validStreak remains 0

    console.log(`Streak check for user ${user._id}: Stored=${user.currentStreak}, LastLogin=${user.lastLoginDate}, ValidToday=${validStreak}`);

    res.json({ currentStreak: validStreak });

  } catch (err) {
    console.error('Error fetching streak:', err.message);
    res.status(500).send('Server Error');
  }
});

// Helper function needed for the check above
const isYesterday = (date1, date2) => {
  if (!date1 || !date2) return false;
  const yesterday = new Date(date2);
  yesterday.setDate(date2.getDate() - 1);
  return isSameDay(date1, yesterday);
};
// --- End New Route ---


module.exports = router;