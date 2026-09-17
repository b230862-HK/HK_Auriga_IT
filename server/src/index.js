import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { seedInitialData } from './seed.js';
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import planRoutes from './routes/planRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Tiffin Subscription & Pro-rated Billing API',
    time: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/billing', billingRoutes);

// Centralized error handler
app.use(errorHandler);

// Connect DB, seed data, and start server
async function startServer() {
  try {
    await connectDB();
    await seedInitialData();

    app.listen(PORT, () => {
      console.log(`[Tiffin Server] Running smoothly on port ${PORT} (http://localhost:${PORT})`);
    });
  } catch (err) {
    console.error('[Tiffin Server] Startup failure:', err);
    process.exit(1);
  }
}

startServer();
