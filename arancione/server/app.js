const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const userRoutes = require('./routes/userRoutes');
const deckRoutes = require('./routes/deckRoutes');
const authRoutes = require('./routes/authRoutes');
const cardRoutes = require('./routes/cardRoutes');
const setRoutes = require('./routes/setRoutes'); 
const searchRoutes = require('./routes/searchRoutes');
const friendRoutes = require('./routes/friendRoutes');
require('./config/passport'); // Importa la configurazione di Passport


const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
// Routes
app.use('/api/users', userRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/sets', setRoutes); 
app.use('/api/search', searchRoutes);
app.use('/api/friends', friendRoutes);



// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to NomeApp API' });
});

module.exports = app;