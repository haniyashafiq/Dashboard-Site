const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectMasterDB } = require('./config/database');
const authRoutes = require('./routes/auth');
const patientsRoutes = require('./routes/patients');
const appointmentsRoutes = require('./routes/appointments');
const staffRoutes = require('./routes/staff');
const pharmacyRoutes = require('./routes/pharmacy');
const accountingRoutes = require('./routes/accounting');

// Initialize Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      'https://dashboard-site-qbgb.onrender.com', // Production frontend
      'http://localhost:3000', // Local development
      'http://127.0.0.1:3000', // Local development alternative
      'http://localhost:5500', // Live Server default port
      'http://127.0.0.1:5500', // Live Server alternative
      'null', // Opening HTML files directly (file://)
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (API routes MUST come before static files)
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/accounting', accountingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PMS Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// Serve static files from Frontend directory only (security: don't expose root)
// IMPORTANT: This must come AFTER API routes to avoid conflicts
app.use(express.static(path.join(__dirname, '../Frontend')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Connect to database and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to master database
    await connectMasterDB();

    // Start server
    app.listen(PORT, () => {
      console.log(`\n✓ Server is running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
