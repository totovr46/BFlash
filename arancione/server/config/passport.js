const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const dotenv = require('dotenv');

// Carica le variabili d'ambiente
dotenv.config();
// Verifica che le variabili d'ambiente siano disponibili
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Errore: Variabili d\'ambiente mancanti per Google OAuth');
    process.exit(1);
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://bflash.org/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ 
        $or: [
          { googleId: profile.id },
          { email: profile.emails[0].value }
        ]
      });

      if (!user) {
        // Crea un nuovo utente con un username temporaneo
        const tempUsername = `user${Date.now()}`;
        user = new User({
          username: tempUsername,
          email: profile.emails[0].value,
          googleId: profile.id,
          password: 'google-oauth',
          isUsernameSet: false,
          profile: {
            avatar: profile.photos[0].value
          }
        });
        await user.save();
      } else if (!user.googleId) {
        // Collega l'account Google all'utente esistente
        user.googleId = profile.id;
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});