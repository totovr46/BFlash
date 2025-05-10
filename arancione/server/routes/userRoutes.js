// filepath: /workspaces/BFlash/arancione/server/routes/userRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs'); // Needed for password comparison
const User = require('../models/User');
const Deck = require('../models/Deck'); // Needed if implementing cascade delete
const SetModel = require('../models/Set'); // Renamed Set to SetModel to avoid conflict
const Card = require('../models/Card'); // Needed if implementing cascade delete
const auth = require('../middleware/auth');
const { set } = require('mongoose');
const router = express.Router();

/**
 * @route   GET /api/users/me/stats
 * @desc    Get statistics for the logged-in user
 * @access  Private
 */
router.get('/me/stats', auth, async (req, res) => {
  try {
      const userId = req.user.id;

      // --- Fetch User Data (including streak) ---
      const user = await User.findById(userId).select('currentStreak'); // Select only the streak field
      if (!user) {
          // This case should ideally not happen if auth middleware works
           return res.status(404).json({ message: 'User not found for stats' });
      }
      const currentStreak = user.currentStreak || 0; // Get streak from user doc

      // --- Fetch Decks ---
      // ... (rest of the deck, set, card fetching logic remains the same) ...
      const userDecks = await Deck.find({ owner: userId });
      const totalDecks = userDecks.length;
      const deckIds = userDecks.map(deck => deck._id);

      if (totalDecks === 0) {
          return res.json({
              totalDecks: 0, totalSets: 0, totalCards: 0,
              knownCards: 0, unknownCards: 0,
              currentStreak: currentStreak, // Return fetched streak
              masteredSetsCount: 0
          });
      }

      // --- Fetch Sets ---
      const userSets = await SetModel.find({ deck: { $in: deckIds } });
      const totalSets = userSets.length;
      const setIds = userSets.map(set => set._id);

      if (totalSets === 0) {
           return res.json({
              totalDecks: totalDecks, totalSets: 0, totalCards: 0,
              knownCards: 0, unknownCards: 0,
              currentStreak: currentStreak, // Return fetched streak
              masteredSetsCount: 0
          });
      }

      // --- Fetch Cards ---
      const userCards = await Card.find({ set: { $in: setIds } });
      const totalCards = userCards.length;

      // --- Calculate Card Knowledge ---
      let knownCards = 0;
      let unknownCards = 0;
      userCards.forEach(card => {
          if (card.known === 'yes') knownCards++;
          else unknownCards++;
      });

      // --- Calculate Mastered Sets ---
      const MIN_CARDS_FOR_MASTERY = 5;
      let masteredSetsCount = 0;
      const cardsBySet = userCards.reduce((acc, card) => {
           const setId = card.set.toString();
           if (!acc[setId]) acc[setId] = [];
           acc[setId].push(card);
           return acc;
       }, {});

      for (const setId of setIds) {
          const cardsInSet = cardsBySet[setId.toString()] || [];
          if (cardsInSet.length >= MIN_CARDS_FOR_MASTERY) {
              if (cardsInSet.every(card => card.known === 'yes')) {
                  masteredSetsCount++;
              }
          }
      }

      // --- Construct Response ---
      res.json({
          totalDecks, totalSets, totalCards,
          knownCards, unknownCards,
          currentStreak, // Return the actual streak
          masteredSetsCount
      });

  } catch (err) {
      console.error("Error in /api/users/me/stats:", err.message);
      res.status(500).json({ message: 'Server Error retrieving stats' });
  }
});

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

// PUT /me (Update Profile - Enhanced)
router.put('/me', auth, async (req, res) => {
  try {
    const { username, bio } = req.body; // Add other fields like theme preference here if needed

    // Validate username if provided (e.g., check uniqueness if different from current)
    if (username) {
        const currentUser = await User.findById(req.user.id);
        if (username !== currentUser.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ message: 'Username already taken' });
            }
        }
    }

    // Build the update object dynamically
    const updateObject = {};
    if (username) updateObject.username = username;
    // Use dot notation for nested fields like bio
    if (bio !== undefined) updateObject['profile.bio'] = bio; // Check for undefined to allow clearing bio

    // Add other updatable fields here (e.g., theme/mode preferences)
    // if (req.body.preferredTheme) updateObject.preferredTheme = req.body.preferredTheme;
    // if (req.body.prefersDarkMode !== undefined) updateObject.prefersDarkMode = req.body.prefersDarkMode;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateObject },
      { new: true, runValidators: true } // Ensure validators run
    ).select('-password'); // Exclude password from response

    if (!updatedUser) {
        return res.status(404).json({ message: 'User not found during update' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating profile:", err.message);
     if (err.code === 11000 || err.message.includes('duplicate key')) { // Handle potential duplicate username error
         return res.status(400).json({ message: 'Username already taken.' });
     }
    res.status(500).send('Server error');
  }
});


// --- Add Password Change Route ---
router.put('/me/password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Please provide current and new passwords.' });
    }
     if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    try {
        // Fetch user WITH password selected
        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if the user has a password set (might not if only used OAuth)
        if (!user.password) {
             return res.status(400).json({ message: 'Password cannot be changed for accounts created via social login without a password set.' });
        }

        // Compare current password
        const isMatch = await user.comparePassword(currentPassword); // Use the method from User model
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        // Set new password (pre-save hook in User.js will hash it)
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully.' });

    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).send('Server Error');
    }
});

// --- Add Delete Account Route ---
router.delete('/me', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);

        if (!user) {
             return res.status(404).json({ message: 'User not found.' });
        }

        // // ** IMPORTANT: Decide on Cascade Delete Strategy **
        // // Option 1: Simple User Delete (Orphans data) - EASIER
        // await User.findByIdAndDelete(userId);
        // console.log(`User deleted: ${userId}`);

        // Option 2: Cascade Delete (More Complex, Safer Data Management) - HARDER
        // Find all decks owned by the user
        const userDecks = await Deck.find({ owner: userId });
        const deckIds = userDecks.map(deck => deck._id);
        // Find all sets within those decks
        const userSets = await SetModel.find({ deck: { $in: deckIds } });
        const setIds = userSets.map(set => set._id);
        // Delete Cards, then Sets, then Decks, then User
        console.log(`Deleting data for user: ${userId}`);
        await Card.deleteMany({ deck: { $in: deckIds } });
        console.log(`Deleted cards for user: ${userId}`);
        await SetModel.deleteMany({ deck: { $in: deckIds } });
        console.log(`Deleted sets for user: ${userId}`);
        await Deck.deleteMany({ owner: userId });
        console.log(`Deleted decks for user: ${userId}`);
        await User.findByIdAndDelete(userId);
        console.log(`User deleted: ${userId}`);
        // ** END Option 2 **

        res.json({ message: 'Account deleted successfully.' });

    } catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).send('Server Error');
    }
});


module.exports = router;