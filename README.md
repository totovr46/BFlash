# BFlash - Flashcard App

 Available at https://bflash.org

## Project Structure
- **Frontend**: HTML, CSS, and JavaScript.
- **Backend**: Node.js with Express for REST API management.
- **Database**: MongoDB for data persistence.

### Main Directories
- `client/`: Contains frontend files, including HTML, CSS, and JavaScript.
- `server/`: Contains the backend, with models, middleware, and API routes.
- `routes/`: Defines APIs for users, decks, sets, and flashcards.
- `models/`: Mongoose models for data management.

## Getting Started
1. Clone the repository:
   ```bash
   git clone https://github.com/totovr46/BFlash.git   
   cd BFlash
   ```
2. Install dependencies:
   ```bash
   cd arancione
   npm install
   ```
3. Configure environment variables:  
   Create a `.env` file in the root directory and add:  
   ```
   MONGODB_URI=<ask_totò_for_this_string>
   JWT_SECRET=<ask_totò_for_this_secret_string>
   PORT=5050
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open the frontend:  
   Visit http://localhost:5050.

## Explanation of Key Files

### `.env`
File containing sensitive environment variables such as:
- Database credentials
- Secret key for JWT token generation
- Database URL
- Other configurations that should not be shared publicly

*Note: This file is not uploaded to Git for security reasons. Ask salvatore musumeci when needed.*

### `.gitignore`
Specifies which files and folders Git should ignore during version control, including:
- `.env` (to avoid exposing sensitive data)
- `node_modules` (installed libraries, which would take up too much space)

### `package.json`
Node.js project configuration file that includes:
- General project information (name, version, description)
- List of required dependencies
- Application startup scripts (`start`, `dev`)
- Other project configurations

## `client/` Folder (Frontend)

Contains all files related to the application's user interface.

### `index.html`
The main page of the application, displaying:
- User's deck list
- Options to create new decks
- Main navigation menu to access: stats.html, friends.html, settings.html
- Section for accessing games

### `indexlight.html`
Alternative version of the main page with a light theme, offering:
- The same functionality as `index.html`
- An interface with lighter colors for those who prefer this visual style

### `login.html`
User authentication page that allows:
- Login with credentials (email and password)
- Registration of new accounts
- Password recovery (if applicable)

### `deck.html`
Page dedicated to viewing and managing a single deck, with functions to:
- View the flashcard sets contained in the deck
- Add new sets to the deck
- Edit or delete existing sets
- Modify deck information

### `set.html`
Page for managing a specific flashcard set, offering:
- Display of all flashcards in the set
- Adding new flashcards
- Editing or deleting existing flashcards

### `style.css`
File defining the visual style of the entire application, handling:
- Page layouts
- Colors, fonts, and spacing
- Animations and transitions
- Adaptation to different screen sizes (responsive design)

## `server/` Folder (Backend)

Contains the code that manages the application logic and database interactions.

### `app.js`
Main file configuring the Express server, including:
- Importing and configuring necessary middleware
- Linking to API routes

### `server.js`
File that actually starts the server, handling:
- Connection to the MongoDB database
- Starting the server on the specified port
- Managing startup/shutdown events

### `middleware/` Subfolder

#### `auth.js`
Middleware for API protection that:
- Verifies the validity of JWT tokens in requests
- Authorizes or blocks access to protected resources
- Extracts user information from the token

### `models/` Subfolder

Contains database schemas defining the data structure.

#### `User.js`
Model for application users, with fields such as:
- Username
- Email
- Password (encrypted)
- Registration date
- References to decks created by the user

#### `Deck.js`
Model for flashcard decks, including:
- Deck name/title
- Subject or topic
- Reference to the owner user
- List of sets contained in the deck
- Creation and modification dates

#### `Set.js`
Model for flashcard sets within a deck, with:
- Set name
- Description
- Reference to the parent deck
- List of contained flashcards

#### `Card.js`
Model for individual flashcards, containing:
- Front content (question)
- Back content (answer)
- References to the parent set and deck

### `routes/` Subfolder

Contains files defining REST APIs to interact with data.

#### `authRoutes.js`
Handles authentication-related operations:
- Registration of new users
- Login and JWT token generation
- Logout
- Email verification or password recovery (if applicable)

#### `userRoutes.js`
APIs for user profile management:
- Retrieving user data
- Updating profile information
- Account deletion
- Preference management

#### `deckRoutes.js`
APIs for deck management:
- Creating new decks
- Retrieving the user's deck list
- Modifying deck information
- Deleting decks

#### `setRoutes.js`
APIs for managing sets within decks:
- Creating new sets
- Retrieving sets in a deck
- Modifying set information
- Deleting sets

#### `cardRoutes.js`
APIs for flashcard management:
- Creating new flashcards
- Retrieving flashcards in a set
- Modifying flashcard content
- Deleting flashcards
- Updating study data
