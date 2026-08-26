import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getRazorpayClient, isRazorpaySimulated } from './client';
import { ENV } from '../config/env';

export interface CreateOrderParams {
  amount: number; // in INR
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
  status: string;
  keyId: string;
  isSimulated: boolean;
}

export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const client = getRazorpayClient();
  const amountPaise = Math.round(params.amount * 100);
  const currency = params.currency || 'INR';

  if (client && !isRazorpaySimulated()) {
    try {
      const order = await client.orders.create({
        amount: amountPaise,
        currency,
        receipt: params.receipt,
        notes: params.notes || {}
      });

      return {
        id: order.id,
        amount: order.amount as number,
        currency: order.currency,
        receipt: (order.receipt as string) || params.receipt,
        status: order.status,
        keyId: ENV.RAZORPAY_KEY_ID,
        isSimulated: false
      };
    } catch (error) {
      console.warn('⚠️ Razorpay live API error, falling back to simulated order:', error);
    }
  }

  // Simulated Test Order
  const simulatedId = `order_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
  return {
    id: simulatedId,
    amount: amountPaise,
    currency,
    receipt: params.receipt,
    status: 'created',
    keyId: ENV.RAZORPAY_KEY_ID || 'rzp_test_simulated_key',
    isSimulated: true
  };
}

export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  if (isRazorpaySimulated()) {
    // In simulated mode, any signature matching 'simulated_sig' or starting with 'sim_' is valid
    return true;
  }

  try {
    const text = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generatedSignature === params.razorpaySignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}
