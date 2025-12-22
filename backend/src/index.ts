import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import usersRouter from './routes/users.js';
import annotationsRouter from './routes/annotations.js';
import suggestionsRouter from './routes/suggestions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for drawing data

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/annotations', annotationsRouter);
app.use('/api/suggestions', suggestionsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// In production, serve the frontend static files
if (isProduction) {
  // Support both Docker (PUBLIC_DIR) and local development paths
  const frontendDist = process.env.PUBLIC_DIR || path.join(__dirname, '../../frontend/dist');
  
  // Serve static files
  app.use(express.static(frontendDist));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  
  console.log(`📦 Serving frontend from: ${frontendDist}`);
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`📡 API endpoints:`);
  console.log(`   POST   /api/users          - Create user`);
  console.log(`   GET    /api/users/:id      - Get user`);
  console.log(`   PATCH  /api/users/:id      - Update user`);
  console.log(`   GET    /api/annotations/video/:videoId - Get annotations`);
  console.log(`   POST   /api/annotations    - Create annotation`);
  console.log(`   DELETE /api/annotations/:id - Delete annotation`);
  console.log(`   GET    /api/annotations/export/:videoId - Export JSON`);
  console.log(`   POST   /api/annotations/import - Import JSON`);
  console.log(`   POST   /api/suggestions     - Get AI visual suggestions`);
  
  // Check if Gemini API key is configured
  if (process.env.GEMINI_API_KEY) {
    console.log(`✨ Gemini AI: Enabled (API key loaded)`);
  } else {
    console.log(`⚠️  Gemini AI: Disabled (GEMINI_API_KEY not set in .env)`);
  }
  
  if (isProduction) {
    console.log(`🌐 Frontend: http://localhost:${PORT}/`);
  }
});

