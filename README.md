# CTG Trading Challenge Backend

A Node.js/Express backend API for the CTG Trading Challenge Platform with MongoDB database.

## Features

- **User Authentication**: JWT-based authentication with registration, login, and password reset
- **Challenge Management**: Create, join, and manage trading challenges
- **Leaderboard System**: Track user performance and rankings
- **User Management**: Profile management and statistics
- **Security**: Rate limiting, input validation, and security headers
- **MongoDB Integration**: Full CRUD operations with Mongoose ODM

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ctg-trading
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password
- `POST /api/auth/forgotpassword` - Forgot password
- `PUT /api/auth/resetpassword/:token` - Reset password

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/:id/stats` - Get user statistics

### Challenges
- `GET /api/challenges` - Get all challenges
- `GET /api/challenges/:id` - Get single challenge
- `POST /api/challenges` - Create challenge (Admin only)
- `PUT /api/challenges/:id` - Update challenge (Admin only)
- `DELETE /api/challenges/:id` - Delete challenge (Admin only)
- `POST /api/challenges/:id/join` - Join challenge
- `POST /api/challenges/:id/leave` - Leave challenge
- `PUT /api/challenges/:id/progress` - Update challenge progress

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard
- `GET /api/leaderboard/rank` - Get user rank

## Database Models

### User
- Personal information (username, email, firstName, lastName)
- Authentication (password, role, isActive)
- Trading statistics (totalChallenges, completedChallenges, totalProfit, winRate)
- Preferences (notifications, theme)

### Challenge
- Challenge details (title, description, type, difficulty)
- Trading parameters (initialBalance, targetProfit, maxDrawdown, timeLimit)
- Participants tracking with individual progress
- Statistics (totalParticipants, successRate, averageProfit)

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for secure password storage
- **Input Validation** - express-validator for request validation
- **Rate Limiting** - Prevent API abuse
- **Security Headers** - Helmet.js for security headers
- **CORS Protection** - Configured for frontend domain
- **MongoDB Injection Protection** - express-mongo-sanitize
- **XSS Protection** - xss-clean middleware

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint

### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── auth.js
│   │   ├── challenges.js
│   │   ├── leaderboard.js
│   │   └── users.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Challenge.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── challenges.js
│   │   ├── leaderboard.js
│   │   └── users.js
│   └── server.js
├── package.json
├── env.example
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/ctg-trading |
| JWT_SECRET | JWT secret key | - |
| JWT_EXPIRE | JWT expiration time | 7d |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:5173 |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
# CTG Trading Backend Server
