import { v4 as uuidv4 } from 'uuid';
import { getRazorpayClient, isRazorpaySimulated } from './client';
import { ENV } from '../config/env';

export interface CreatePaymentLinkParams {
  amount: number; // In INR
  currency?: string;
  description: string;
  customer: {
    name?: string;
    email?: string;
    contact?: string;
  };
  referenceId: string;
  notes?: Record<string, string>;
  expireByMinutes?: number;
}

export interface RazorpayPaymentLinkResult {
  id: string;
  shortUrl: string;
  amount: number; // In paise
  currency: string;
  status: string;
  isSimulated: boolean;
  referenceId: string;
}

export async function createRecoveryPaymentLink(params: CreatePaymentLinkParams): Promise<RazorpayPaymentLinkResult> {
  const client = getRazorpayClient();
  const amountPaise = Math.round(params.amount * 100);
  const currency = params.currency || 'INR';
  const expireBy = Math.floor(Date.now() / 1000) + (params.expireByMinutes || 20) * 60;

  if (client && !isRazorpaySimulated()) {
    try {
      const paymentLink = await client.paymentLink.create({
        amount: amountPaise,
        currency,
        accept_partial: false,
        description: params.description,
        customer: {
          name: params.customer.name || 'Shopper',
          email: params.customer.email || 'customer@example.com',
          contact: params.customer.contact || '+919876543210'
        },
        notify: {
          sms: false,
          email: false
        },
        reminder_enable: false,
        notes: params.notes || {},
        reference_id: params.referenceId,
        expire_by: expireBy
      });

      return {
        id: paymentLink.id,
        shortUrl: (paymentLink.short_url as string) || '',
        amount: (paymentLink.amount as number) || amountPaise,
        currency: (paymentLink.currency as string) || currency,
        status: (paymentLink.status as string) || 'created',
        isSimulated: false,
        referenceId: params.referenceId
      };
    } catch (error) {
      console.warn('⚠️ Razorpay live paymentLink.create failed, falling back to simulated link:', error);
    }
  }

  // Simulated Test Payment Link
  const simulatedPlinkId = `plink_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
  const simulatedUrl = `${ENV.CLIENT_URL}/?recovery_plink=${simulatedPlinkId}&ref=${encodeURIComponent(params.referenceId)}`;

  return {
    id: simulatedPlinkId,
    shortUrl: simulatedUrl,
    amount: amountPaise,
    currency,
    status: 'created',
    isSimulated: true,
    referenceId: params.referenceId
  };
}
