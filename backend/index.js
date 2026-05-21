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
const historyRouter = require('./routes/history');
const topicsRouter = require('./routes/topics');
const notificationsRouter = require('./routes/notifications');
const aiRouter = require('./routes/ai'); // New: Added AI router
const postsRouter = require('./routes/posts'); // New: Added Posts router
const facebookAuthRouter = require('./routes/auth/facebook'); // New: Added FB Auth router
const proxyRouter = require('./routes/proxy'); // New: Added Proxy router
const initScheduler = require('./services/scheduler');

const app = express();

// --- 1. SECURITY & UTILITY MIDDLEWARE ---
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Restrict to your React app
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); 
app.use(express.json());
app.use(morgan('dev')); // Log every request to the console for debugging

// Semi-Secure: Analytics (Allows AAL1 - standard login)
app.use('/api/analytics', authenticate(false), analyticsRouter);

// High-Security: These will trigger the 'isSensitive' check in your middleware
app.use('/api/automation', authenticate(false), automationRouter);
app.use('/api/topics', authenticate(false), topicsRouter);
app.use('/api/posts', authenticate(false), postsRouter); // Register posts route
app.use('/api/ai', authenticate(false), aiRouter); // New: AI utility routes
// app.use('/api/billing', authenticate(true), billingRouter);
app.use('/api/profile', authenticate(false), profileRouter); 
app.use('/api/history', authenticate(false), historyRouter); 
app.use('/api/notifications', authenticate(false), notificationsRouter);
app.use('/api/auth/facebook', authenticate(false), facebookAuthRouter); // New: Facebook Auth
app.use('/api/proxy', proxyRouter); // New: Proxy for images (unauthenticated for img tags)

// --- 3. GLOBAL ERROR HANDLER ---
// Professional servers never let a crash reveal the stack trace to the user
app.use((err, req, res, next) => {
  const errorStack = err.stack || 'No stack trace available';
  const errorMessage = err.message || (typeof err === 'string' ? err : 'Internal Server Error');
  
  console.error(`[Error] ${errorMessage}\n${errorStack}`);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: true,
    message: errorMessage,
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
  initScheduler();
});

// --- 5. GRACEFUL SHUTDOWN ---
// Ensures the DB connections close properly when the server stops
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => console.log('Process terminated.'));
});