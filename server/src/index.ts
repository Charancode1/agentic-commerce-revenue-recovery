import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import apiRouter from './routes/api';
import { seedDatabase } from './db/seed';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature']
}));

// Capture rawBody for Razorpay webhook verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    razorpayConfigured: ENV.IS_RAZORPAY_CONFIGURED,
    version: '1.0.0'
  });
});

// API Routes
app.use('/api', apiRouter);

// Initialize DB Seed
seedDatabase();

// Start Server
app.listen(ENV.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AI Commerce & Revenue Recovery Agent Server`);
  console.log(`📡 Port: http://localhost:${ENV.PORT}`);
  console.log(`⚡ Mode: ${ENV.NODE_ENV}`);
  console.log(`💳 Razorpay: ${ENV.IS_RAZORPAY_CONFIGURED ? 'Connected (Live Test API)' : 'Simulated Test Mode'}`);
  console.log(`====================================================`);
});
