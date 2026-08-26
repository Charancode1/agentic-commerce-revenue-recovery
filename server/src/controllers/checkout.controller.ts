import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import { Order, CartItem } from '../../../shared/types/commerce';
import { createRazorpayOrder, verifyPaymentSignature } from '../razorpay/orders';
import { auditLogger } from '../db/audit-logger';
import { RecoveryAgent } from '../agents/recovery-agent';
import { FailureCategory } from '../../../shared/types/recovery';

export class CheckoutController {
  public static async createOrder(req: Request, res: Response) {
    try {
      const { items, customerName, customerEmail, customerPhone, promoCode } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Cart items cannot be empty' });
      }

      // Calculate total
      let calculatedTotal = 0;
      for (const item of items as CartItem[]) {
        calculatedTotal += item.product.price * item.quantity;
      }

      const orderId = `ord_${uuidv4().substring(0, 8)}`;
      const orderNumber = `RZP-${Math.floor(100000 + Math.random() * 900000)}`;

      // Create Razorpay Order
      const rzpResult = await createRazorpayOrder({
        amount: calculatedTotal,
        receipt: `rcpt_${orderNumber}`,
        notes: {
          orderId,
          orderNumber,
          customerEmail: customerEmail || 'customer@example.com'
        }
      });

      const order: Order = {
        id: orderId,
        orderNumber,
        razorpayOrderId: rzpResult.id,
        customerName: customerName || 'Valued Customer',
        customerEmail: customerEmail || 'shopper@example.com',
        customerPhone: customerPhone || '+919876543210',
        items,
        amount: calculatedTotal,
        currency: 'INR',
        status: 'created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.upsertOrder(order);

      auditLogger.record({
        actor: 'COMMERCE_AGENT',
        action: 'ORDER_CREATED',
        orderId: order.id,
        summary: `Created Order #${order.orderNumber} for ₹${order.amount} with Razorpay Order ID: ${rzpResult.id}`,
        metadata: {
          amount: order.amount,
          razorpayOrderId: rzpResult.id,
          isSimulated: rzpResult.isSimulated,
          itemCount: items.length
        }
      });

      return res.json({
        success: true,
        order,
        razorpay: {
          orderId: rzpResult.id,
          amount: rzpResult.amount,
          currency: rzpResult.currency,
          keyId: rzpResult.keyId,
          isSimulated: rzpResult.isSimulated
        }
      });
    } catch (e: any) {
      console.error('Create order error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  public static async verifyPayment(req: Request, res: Response) {
    try {
      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      const order = db.getOrderById(orderId) || db.getOrderByRazorpayId(razorpayOrderId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const isValid = verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      });

      if (!isValid) {
        auditLogger.record({
          actor: 'RAZORPAY_WEBHOOK',
          action: 'PAYMENT_FAILED_DETECTED',
          orderId: order.id,
          summary: `Payment signature verification failed for Order #${order.orderNumber}`,
          metadata: { razorpayOrderId, razorpayPaymentId }
        });
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }

      order.status = 'paid';
      db.upsertOrder(order);

      auditLogger.record({
        actor: 'CUSTOMER',
        action: 'PAYMENT_ATTEMPTED',
        orderId: order.id,
        summary: `Payment verified successfully for Order #${order.orderNumber} (₹${order.amount}) via Razorpay ID: ${razorpayPaymentId}`,
        metadata: { razorpayPaymentId, razorpayOrderId }
      });

      return res.json({
        success: true,
        message: 'Payment verified successfully',
        order
      });
    } catch (e: any) {
      console.error('Verify payment error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * Simulates a payment failure (Bank OTP, Card Declined, Network Glitch, Abandonment)
   * This is a core interactive feature for testing and judging the AI Recovery Agent.
   */
  public static async simulateFailure(req: Request, res: Response) {
    try {
      const { orderId, failureCategory, rawErrorCode, rawDescription } = req.body;

      let targetOrder = orderId ? db.getOrderById(orderId) : null;

      if (!targetOrder) {
        // Pick the latest created order or create a dummy one for simulation
        const orders = db.getOrders();
        targetOrder = orders.length > 0 ? orders[0] : null;
      }

      if (!targetOrder) {
        return res.status(400).json({
          success: false,
          error: 'No order found. Please add a product to cart and click checkout first!'
        });
      }

      const validCategory: FailureCategory = failureCategory || 'BANK_OTP_TIMEOUT';

      const incident = await RecoveryAgent.handleFailureEvent({
        orderId: targetOrder.id,
        failureCategory: validCategory,
        rawErrorCode: rawErrorCode || 'SIMULATED_FAIL_CODE',
        rawDescription: rawDescription
      });

      return res.json({
        success: true,
        message: `Failure event simulated: ${validCategory}`,
        incident
      });
    } catch (e: any) {
      console.error('Simulate failure error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }
}
