const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Set = require('../models/Set');
const Deck = require('../models/Deck');
const Card = require('../models/Card');

// Crea un nuovo set in un deck
router.post('/:deckId/sets', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const deck = await Deck.findById(req.params.deckId);

    if (!deck || deck.owner.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck not found or unauthorized' });
    }

    const newSet = new Set({ name, deck: deck._id });
    await newSet.save();

    // Aggiorna il deck con il nuovo set
    deck.sets.push(newSet._id);
    await deck.save();

    res.status(201).json(newSet);

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Ottieni tutti i set di un deck
router.get('/:deckId/sets', auth, async (req, res) => {
  try {
    // Trova tutti i set del deck
    const sets = await Set.find({ deck: req.params.deckId });
    
    // Recupera le statistiche per tutti i set in una singola query aggregate
    const setIds = sets.map(set => set._id);
    const cardStats = await Card.aggregate([
      { $match: { set: { $in: setIds } } },
      { 
        $group: {
          _id: '$set',
          knownCount: {
            $sum: { $cond: [{ $eq: ['$known', 'yes'] }, 1, 0] }
          },
          unknownCount: {
            $sum: { $cond: [{ $eq: ['$known', 'no'] }, 1, 0] }
          }
        }
      }
    ]);

    // Mappa le statistiche sui set
    const setsWithStats = sets.map(set => {
      const stats = cardStats.find(c => c._id.toString() === set._id.toString()) || 
                   { knownCount: 0, unknownCount: 0 };
      return {
        ...set.toObject(),
        stats: {
          known: stats.knownCount,
          unknown: stats.unknownCount
        }
      };
    });

    res.json(setsWithStats);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific set by ID
router.get('/:deckId/sets/:setId', auth, async (req, res) => {
  try {
    const { deckId, setId } = req.params;
    const deck = await Deck.findById(deckId);

    if (!deck || deck.owner.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck not found or unauthorized' });
    }

    const set = await Set.findById(setId);
    if (!set || set.deck.toString() !== deckId) {
      return res.status(404).json({ message: 'Set not found or unauthorized' });
    }

    res.json(set);
  } catch (err) {
    console.error('Errore nel caricamento del set:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Elimina un set da un deck
router.delete('/:deckId/sets/:setId', auth, async (req, res) => {
  try {
    const { deckId, setId } = req.params;

    const deck = await Deck.findById(deckId);
    if (!deck || deck.owner.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck not found or unauthorized' });
    }

    const set = await Set.findById(setId);
    if (!set || set.deck.toString() !== deckId) {
      return res.status(404).json({ message: 'Set not found or unauthorized' });
    }

    // Elimina tutte le flashcard associate al set
    await Card.deleteMany({ set: setId });

    // Elimina il set
    await Set.findByIdAndDelete(setId);

    // Rimuovi il set dall'elenco dei set del deck
    deck.sets = deck.sets.filter(id => id.toString() !== setId);
    await deck.save();

    res.json({ message: 'Set e flashcard eliminati con successo' });
  } catch (err) {
    console.error('Errore del server:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});
// Modifica un set in un deck
router.put('/:deckId/sets/:setId', auth, async (req, res) => {
  try {
    const { deckId, setId } = req.params;
    const { name } = req.body;

    const deck = await Deck.findById(deckId);
    if (!deck || deck.owner.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck not found or unauthorized' });
    }

    const set = await Set.findById(setId);
    if (!set || set.deck.toString() !== deckId) {
      return res.status(404).json({ message: 'Set not found or unauthorized' });
    }

    set.name = name || set.name;
    await set.save(); 

    res.json(set);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
// Aggiungi questa route a setRoutes.js
router.get('/:deckId/sets/:setId/stats', auth, async (req, res) => {
  try {
    const { deckId, setId } = req.params;

    // Verifica che il deck esista e che l'utente sia autorizzato
    const deck = await Deck.findById(deckId);
    if (!deck || deck.owner.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck not found or unauthorized' });
    }

    // Verifica che il set esista e appartenga al deck
    const set = await Set.findById(setId);
    if (!set || set.deck.toString() !== deckId) {
      return res.status(404).json({ message: 'Set not found or unauthorized' });
    }

    // Calcola le statistiche
    const knownCount = await Card.countDocuments({ 
      set: setId, 
      known: 'yes' 
    });
    
    const unknownCount = await Card.countDocuments({ 
      set: setId, 
      known: 'no' 
    });

    res.json({
      known: knownCount,
      unknown: unknownCount
    });

  } catch (err) {
    console.error('Errore nel caricamento delle statistiche:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});
// Modifica la route esistente o aggiungila se non esiste
router.put('/:deckId/sets/:setId/move', auth, async (req, res) => {
  try {
    const { deckId, setId } = req.params;
    const { targetDeckId } = req.body;

    // Verifica che il deck di origine e il set esistano
    const sourceDeck = await Deck.findById(deckId);
    if (!sourceDeck || sourceDeck.owner.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Source deck not found or unauthorized' });
    }

    const set = await Set.findById(setId);
    if (!set || set.deck.toString() !== deckId) {
      return res.status(404).json({ message: 'Set not found or unauthorized' });
    }

    // Verifica che il deck di destinazione esista
    const targetDeck = await Deck.findById(targetDeckId);
    if (!targetDeck || targetDeck.owner.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Target deck not found or unauthorized' });
    }

    // Aggiorna il riferimento del deck nel set
    set.deck = targetDeckId;
    await set.save();

    // Aggiorna tutte le card associate al set
    await Card.updateMany(
      { set: setId },
      { deck: targetDeckId }
    );

    // Rimuovi il set dal deck di origine
    sourceDeck.sets = sourceDeck.sets.filter(id => id.toString() !== setId);
    await sourceDeck.save();

    // Aggiungi il set al deck di destinazione
    targetDeck.sets.push(setId);
    await targetDeck.save();

    res.json({ message: 'Set moved successfully' });

  } catch (err) {
    console.error('Error moving set:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;