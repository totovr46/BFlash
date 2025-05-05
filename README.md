
# BFlash 🗃️

BFlash is a web application for creating and managing flashcards that helps students learn through spaced repetition.

![Flashcard App](https://bflash.org/preview.png)

## 🌟 Features

- **Deck Management**: Organize flashcards into thematic decks
- **Custom Sets**: Group flashcards into sets within decks
- **AI Generation**: Automatically create flashcards from text using AI
- **Study Modes**: Various modes for effective learning
- **Progress Tracking**: Detailed stats and achievement system
- **Light/Dark Theme**: Interface adapts to user preferences
- **Responsive Design**: Works perfectly on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone [https://github.com/toto/BFlash.git](https://github.com/totovr46/BFlash.git)
cd BFlash/arancione
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables  
Create a `.env` file in the `arancione` folder:
```
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret_key>
PORT=5050
```

4. Start the server
```bash
npm start
```

5. Open the app in your browser
```
http://localhost:5050
```

## 🏗️ Project Structure

```
arancione/
├── client/           # Frontend files
│   ├── deck.html     # Deck management
│   ├── index.html    # Main page
│   ├── flashcard.html# study page
│   ├── set.html      # Set management
│   ├── stats.html    # User statistics
│   └── style.css     # Global styles
├── server/           # Backend files
│   ├── models/       # Database models
│   ├── routes/       # API endpoints
│   └── app.js        # Express app
└── package.json
```

## 🔧 Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: JWT
- **API**: REST

## 📚 API Documentation

### Main Endpoints

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: User login
- `GET /api/decks`: Get user's deck list
- `POST /api/decks`: Create a new deck
- `GET /api/sets/:deckId`: Get sets within a deck
- `POST /api/flashcards/generate`: Generate flashcards with AI

## 👥 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 📧 Contact

Salvatore Musumeci - salvatore.musumeci@studbocconi.it
Lorenzo Galluzzi - lorezo.galluzzi@studbocconi.it

Project Link: [https://github.com/totovr46/BFlash](https://github.com/totovr46/BFlash)

## 🙏 Acknowledgments

- [Font Awesome](https://fontawesome.com)
- [Chart.js](https://www.chartjs.org)
- [Express](https://expressjs.com)
- [MongoDB](https://www.mongodb.com)
