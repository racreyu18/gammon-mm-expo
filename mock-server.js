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

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Mock authentication - accept any credentials for testing
  if (username && password) {
    res.json({
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      expiresIn: 3600,
      tokenType: 'Bearer',
      user: {
        id: 'user123',
        email: username,
        name: 'Test User',
        role: 'user',
        permissions: ['read', 'write']
      }
    });
  } else {
    res.status(401).json({
      error: 'Invalid credentials',
      message: 'Username and password are required'
    });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    res.json({
      accessToken: 'mock-access-token-refreshed-' + Date.now(),
      refreshToken: 'mock-refresh-token-refreshed-' + Date.now(),
      expiresIn: 3600,
      tokenType: 'Bearer'
    });
  } else {
    res.status(401).json({
      error: 'Invalid token',
      message: 'Valid refresh token required'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    res.json({
      id: 'user123',
      email: 'test@gammon.com',
      name: 'Test User',
      role: 'user',
      permissions: ['read', 'write'],
      functions: ['inventory.view', 'movements.create', 'approvals.view']
    });
  } else {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid access token required'
    });
  }
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