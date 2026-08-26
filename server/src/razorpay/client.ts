import Razorpay from 'razorpay';
import { ENV } from '../config/env';

let razorpayInstance: Razorpay | null = null;

if (ENV.IS_RAZORPAY_CONFIGURED) {
  try {
    razorpayInstance = new Razorpay({
      key_id: ENV.RAZORPAY_KEY_ID,
      key_secret: ENV.RAZORPAY_KEY_SECRET
    });
    console.log('⚡ Razorpay SDK initialized in Live/Test API mode with Key:', ENV.RAZORPAY_KEY_ID);
  } catch (error) {
    console.warn('⚠️ Razorpay initialization failed, falling back to simulated mode:', error);
    razorpayInstance = null;
  }
} else {
  console.log('ℹ️ Running in simulated Razorpay Test Mode. (Set RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in .env for direct Razorpay API calls)');
}

export function getRazorpayClient(): Razorpay | null {
  return razorpayInstance;
}

export function isRazorpaySimulated(): boolean {
  return !razorpayInstance;
}
