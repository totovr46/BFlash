const mongoose = require('mongoose');

const SetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true
  },
  cards: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card'
    }
  ]
}, { timestamps: true }); // Aggiunge automaticamente createdAt e updatedAt

// Controlla se il modello è già stato definito
module.exports = mongoose.models.Set || mongoose.model('Set', SetSchema);