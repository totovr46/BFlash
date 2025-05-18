require('dotenv').config(); // Importa dotenv

const express = require('express');
const router = express.Router();
const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY; // Legge la chiave API dal .env
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Endpoint corretto per generare flashcards
router.post('/generate', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        const payload = {
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'user',
                    content: `Leggi il seguente testo e genera un massimo di 10 flashcard in formato JSON valido. Ogni flashcard deve avere una domanda e una risposta breve (massimo 20 parole). 
                
                Regole:
                1. Rileva automaticamente la lingua del testo fornito.
                2. Genera le flashcard nella stessa lingua del testo.
                3. Rispondi esclusivamente con un array JSON valido.
                4. Non includere testo aggiuntivo prima o dopo il JSON.
                5. Ogni risposta deve essere breve e concisa.
                6. Genera massimo 10 flashcard.
        
                Testo:
                ${text.substring(0, 5000)}
                
                Formato richiesto (esempio in italiano):
                [
                    {"question": "Qual è la capitale della Francia?", "answer": "Parigi"},
                    {"question": "Chi ha scritto 'Il Piccolo Principe'?", "answer": "Antoine de Saint-Exupéry"}
                ]`
                }
            ],
            max_completion_tokens: 3000,
            temperature: 0.7
        };

        const response = await axios.post(GROQ_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            }
        });

        res.json({
            rawResponse: response.data.choices[0].message.content
        });
    } catch (error) {
        console.error('Errore nella richiesta a Groq:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Errore nella generazione delle flashcard',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router;