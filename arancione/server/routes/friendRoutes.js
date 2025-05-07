const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Friend = require('../models/Friend');
const Deck = require('../models/Deck');
const Card = require('../models/Card');

// Invia richiesta di amicizia
router.post('/send-request', auth, async (req, res) => {
    try {
        const { friendId } = req.body;
        
        // Verifica che l'utente non stia cercando di aggiungere se stesso
        if (req.user.id === friendId) {
            return res.status(400).json({ message: 'Cannot send friend request to yourself' });
        }

        // Verifica che non esista già una relazione di amicizia in entrambe le direzioni
        const existingFriendship = await Friend.findOne({
            $or: [
                { user: req.user.id, friend: friendId },
                { user: friendId, friend: req.user.id }
            ]
        });

        if (existingFriendship) {
            return res.status(400).json({ 
                message: existingFriendship.status === 'pending' ? 
                    'Friend request already pending' : 
                    'You are already friends with this user'
            });
        }

        // Crea la richiesta di amicizia
        const friendRequest = new Friend({
            user: req.user.id,
            friend: friendId,
            status: 'pending'
        });

        await friendRequest.save();

        // Aggiungi la richiesta all'utente destinatario
        await User.findByIdAndUpdate(friendId, {
            $push: { friendRequests: req.user.id }
        });

        res.status(201).json(friendRequest);
    } catch (err) {
        console.error('Error sending friend request:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Accetta richiesta di amicizia
router.post('/accept-request', auth, async (req, res) => {
  try {
    const { friendId } = req.body;

    // Trova e aggiorna la richiesta
    const friendRequest = await Friend.findOneAndUpdate(
      { 
        user: friendId,
        friend: req.user.id,
        status: 'pending'
      },
      { status: 'accepted' },
      { new: true }
    );

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Aggiungi gli amici a entrambi gli utenti
    await User.findByIdAndUpdate(req.user.id, {
      $push: { friends: friendId },
      $pull: { friendRequests: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $push: { friends: req.user.id }
    });

    res.json(friendRequest);
  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Rifiuta/rimuovi richiesta di amicizia
router.delete('/reject-request', auth, async (req, res) => {
  try {
    const { friendId } = req.body;

    // Elimina la richiesta
    await Friend.findOneAndDelete({
      user: friendId,
      friend: req.user.id,
      status: 'pending'
    });

    // Rimuovi la richiesta dall'utente
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { friendRequests: friendId }
    });

    res.json({ message: 'Friend request rejected' });
  } catch (err) {
    console.error('Error rejecting friend request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Rimuovi amico
router.delete('/remove-friend', auth, async (req, res) => {
  try {
    const { friendId } = req.body;

    // Elimina entrambe le relazioni di amicizia
    await Friend.deleteMany({
      $or: [
        { user: req.user.id, friend: friendId },
        { user: friendId, friend: req.user.id }
      ]
    });

    // Rimuovi gli amici da entrambi gli utenti
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { friends: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user.id }
    });

    res.json({ message: 'Friend removed successfully' });
  } catch (err) {
    console.error('Error removing friend:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Ottieni lista amici
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username profile.avatar decks')
      .populate('friendRequests', 'username profile.avatar');

    // Conta i deck e le card per ogni amico
    const friendsWithStats = await Promise.all(
      user.friends.map(async friend => {
        const deckCount = await Deck.countDocuments({ owner: friend._id });
        const cardCount = await Card.countDocuments({ deck: { $in: friend.decks } });
        
        return {
          ...friend.toObject(),
          deckCount,
          cardCount
        };
      })
    );

    res.json({
      friends: friendsWithStats,
      friendRequests: user.friendRequests
    });
  } catch (err) {
    console.error('Error getting friends list:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cerca utenti
router.get('/search', auth, async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.length < 3) {
            return res.status(400).json({ message: 'Search query must be at least 3 characters' });
        }

        // Trova tutte le relazioni di amicizia esistenti dell'utente corrente
        const existingFriendships = await Friend.find({
            $or: [
                { user: req.user.id },
                { friend: req.user.id }
            ]
        });

        // Estrai gli ID di tutti gli utenti coinvolti nelle relazioni
        const existingFriendIds = existingFriendships.map(friendship => 
            friendship.user.toString() === req.user.id ? 
            friendship.friend.toString() : 
            friendship.user.toString()
        );

        // Cerca gli utenti escludendo:
        // 1. L'utente corrente
        // 2. Gli utenti che sono già amici o hanno richieste pendenti
        const users = await User.find({
            $and: [
                { 
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                },
                { _id: { $ne: req.user.id } },
                { _id: { $nin: existingFriendIds } }
            ]
        }).select('username profile.avatar');

        res.json(users);
    } catch (err) {
        console.error('Error searching users:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;