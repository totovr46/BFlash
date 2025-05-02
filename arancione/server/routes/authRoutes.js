const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Add helper function to check dates (outside the route handler)
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const isYesterday = (date1, date2) => {
  if (!date1 || !date2) return false;
  const yesterday = new Date(date2);
  yesterday.setDate(date2.getDate() - 1);
  return isSameDay(date1, yesterday);
};

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
// --- Inside the '/login' route ---
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    let user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password only if the user doesn't have a googleId or password exists
    if (user.password) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
    } else if (!user.googleId) {
        // User has neither password nor googleId - inconsistent state?
        return res.status(400).json({ message: 'Login method unclear' });
    } // If they have googleId but no password, login via password fails here implicitly

    // --- Streak Logic Start ---
    const today = new Date();
    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;

    if (lastLogin) {
      if (isYesterday(lastLogin, today)) {
        // Logged in yesterday, increment streak
        user.currentStreak += 1;
      } else if (!isSameDay(lastLogin, today)) {
        // Missed a day or more, reset streak to 1 (for today's login)
        user.currentStreak = 1;
      }
      // If isSameDay(lastLogin, today), do nothing to the streak
    } else {
      // First login ever (or first since implementing streak)
      user.currentStreak = 1;
    }

    user.lastLoginDate = today; // Update last login date
    await user.save(); // Save the updated user object
    // --- Streak Logic End ---


    // Genera JWT (existing logic)
    const payload = {
      user: {
        id: user.id
        // You might want to include username/email in payload if needed elsewhere
        // but be mindful of JWT size and security.
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }, // Consider a reasonable expiration
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: { // Return basic user info
            id: user.id,
            username: user.username,
            email: user.email
            // DO NOT return sensitive fields like password hash or full profile
          }
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err.message); // Log the specific error
    res.status(500).send('Server error');
  }
});

// --- Add the same Streak Logic to Google Callback ---
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login.html?error=google_auth_failed', // Add error param
    session: false // Ensure session is false if using JWT
  }),
  async (req, res) => { // Make the callback async
    try {
        // req.user should be populated by passport after successful Google auth
        if (!req.user) {
             console.error('Google callback: User not found after passport auth');
             return res.redirect('/login.html?error=google_user_not_found');
        }

        // Ensure we have the full user object with streak fields
        let user = await User.findById(req.user.id);
        if (!user) {
            console.error('Google callback: User not found in DB with ID:', req.user.id);
            return res.redirect('/login.html?error=google_user_not_in_db');
        }


        // --- Streak Logic (Copied from regular login) ---
        const today = new Date();
        const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;

        if (lastLogin) {
            if (isYesterday(lastLogin, today)) {
                user.currentStreak += 1;
            } else if (!isSameDay(lastLogin, today)) {
                user.currentStreak = 1;
            }
        } else {
            user.currentStreak = 1;
        }
        user.lastLoginDate = today;
        await user.save();
        // --- Streak Logic End ---

        // Generate JWT (existing logic)
        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error in Google callback:', err);
                    // Redirect to login with a generic error
                    return res.redirect('/login.html?error=jwt_sign_error');
                }

                 // Redirect logic (handle username setup or main app)
                if (!user.isUsernameSet) {
                     // Redirect to setup page with token
                    return res.redirect(`/setup-username.html?token=${token}`);
                } else {
                    // Redirect to main app page with token and user info
                    const userParam = encodeURIComponent(JSON.stringify({
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }));
                    return res.redirect(`/?token=${token}&user=${userParam}`);
                }
            }
        );
    } catch (err) {
        console.error('Error in Google callback:', err);
        res.redirect('/login.html?error=google_callback_server_error');
    }
});

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