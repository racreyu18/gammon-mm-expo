const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Gammon MM Expo API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Basic endpoints for testing
app.get('/api/projects', (req, res) => {
  res.json([
    {
      id: 'PRJ001',
      name: 'Test Project',
      code: 'TP',
      status: 'Active'
    }
  ]);
});

app.get('/api/inventory/items', (req, res) => {
  res.json([
    {
      id: 'ITM001',
      name: 'Test Item',
      code: 'TI',
      quantity: 100
    }
  ]);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock API server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;