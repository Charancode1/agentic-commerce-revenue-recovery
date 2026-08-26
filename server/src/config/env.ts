import dotenv from 'dotenv';
import path from 'path';

// Load from workspace root .env if present, otherwise server .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKey123',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'mock_secret_456',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret_789',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  IS_RAZORPAY_CONFIGURED: Boolean(
    process.env.RAZORPAY_KEY_ID &&
    !process.env.RAZORPAY_KEY_ID.includes('sample') &&
    !process.env.RAZORPAY_KEY_ID.includes('mock')
  )
};
