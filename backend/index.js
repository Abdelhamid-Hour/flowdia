require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // New: Added for security headers
const morgan = require('morgan'); // New: For professional request logging
const authenticate = require('./middleware/auth');


// Import your routers
const analyticsRouter = require('./routes/analytics');
const automationRouter = require('./routes/automation');
// const billingRouter = require('./routes/billing');
const profileRouter = require('./routes/profile');



const app = express();

// --- 1. SECURITY & UTILITY MIDDLEWARE ---
app.use(helmet()); // Protects against well-known web vulnerabilities (XSS, clickjacking)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Restrict to your React app
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev')); // Log every request to the console for debugging

// --- 2. ROUTES ---

// Public Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

// Semi-Secure: Analytics (Allows AAL1 - standard login)
app.use('/api/analytics', authenticate(false), analyticsRouter);

// High-Security: These will trigger the 'isSensitive' check in your middleware
app.use('/api/automation', authenticate(true), automationRouter);
// app.use('/api/billing', authenticate(true), billingRouter);
app.use('/api/profile', authenticate(true), profileRouter); 

// --- 3. GLOBAL ERROR HANDLER ---
// Professional servers never let a crash reveal the stack trace to the user
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.stack}`);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: true,
    message: statusCode === 500 ? 'Internal Server Error' : err.message,
  });
});

// --- 4. START SERVER ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
  🚀 Server Running: http://localhost:${PORT}
  🔒 MFA Protection Active
  🛡️  Helmet Security Enabled
  `);
});

// --- 5. GRACEFUL SHUTDOWN ---
// Ensures the DB connections close properly when the server stops
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => console.log('Process terminated.'));
});