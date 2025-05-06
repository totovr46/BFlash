const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const app = require('./app');

dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// Connessione MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connesso con successo');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

connectDB();

// Routes API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/decks', require('./routes/deckRoutes'));
app.use('/api/sets', require('./routes/setRoutes'));
app.use('/api/sets', require('./routes/cardRoutes'));
app.use('/api/flashcards', require('./routes/flashcardRoutes'));

// Servi file statici solo in sviluppo
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '../client')));
  
  // Routing lato client solo in sviluppo
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  });
  console.log('Modalità sviluppo: Node.js serve file statici');
} else {
  console.log('Modalità produzione: i file statici devono essere serviti da un web server (Apache/Nginx)');
}

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server in esecuzione sulla porta ${PORT}`);
});