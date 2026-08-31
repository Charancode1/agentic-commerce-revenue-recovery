import { v4 as uuidv4 } from 'uuid';
import { db, liveEventBus } from '../db/db';
import {
  FailureCategory,
  RecoveryIncident,
  RecoveryProposal,
  RecoveryStrategyType
} from '../../../shared/types/recovery';
import { Order } from '../../../shared/types/commerce';
import { FAILURE_REASONS } from '../config/constants';
import { PolicyEngine } from './policy-engine';
import { createRecoveryPaymentLink } from '../razorpay/payment-links';
import { auditLogger } from '../db/audit-logger';

export class RecoveryAgent {
  /**
   * Registers a payment failure or checkout drop-off, classifies root cause, and computes bounded recovery strategy.
   */
  public static async handleFailureEvent(params: {
    orderId: string;
    failureCategory: FailureCategory;
    rawErrorCode?: string;
    rawDescription?: string;
  }): Promise<RecoveryIncident> {
    const order = db.getOrderById(params.orderId);
    if (!order) {
      throw new Error(`Order ${params.orderId} not found`);
    }

    // Mark order as failed if not already
    if (order.status !== 'failed' && order.status !== 'recovered') {
      order.status = 'failed';
      db.upsertOrder(order);
    }

    const incidentId = `inc_${uuidv4().substring(0, 8)}`;
    const categoryInfo = FAILURE_REASONS[params.failureCategory] || FAILURE_REASONS.NETWORK_GATEWAY_DROPOUT;

    // Log incident detection in audit trail
    auditLogger.record({
      actor: 'RAZORPAY_WEBHOOK',
      action: 'PAYMENT_FAILED_DETECTED',
      orderId: order.id,
      incidentId,
      summary: `Payment failed for order #${order.orderNumber} (₹${order.amount}). Reason: ${categoryInfo.title}`,
      metadata: {
        amountAtRisk: order.amount,
        failureCategory: params.failureCategory,
        rawErrorCode: params.rawErrorCode,
        rawDescription: params.rawDescription || categoryInfo.description
      }
    });

    auditLogger.record({
      actor: 'RECOVERY_AGENT',
      action: 'REVENUE_AT_RISK_REGISTERED',
      orderId: order.id,
      incidentId,
      summary: `Revenue at Risk registered: ₹${order.amount} on Order #${order.orderNumber}`,
      metadata: { amountAtRisk: order.amount }
    });

    // Formulate Strategy based on failure root cause
    const proposal = await this.formulateStrategy(order, params.failureCategory, incidentId);

    const incident: RecoveryIncident = {
      id: incidentId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      amountAtRisk: order.amount,
      failureCategory: params.failureCategory,
      failureCode: params.rawErrorCode || 'PAYMENT_FAILED',
      failureDescription: params.rawDescription || categoryInfo.description,
      status: 'CONSENT_PENDING',
      recoveryProposal: proposal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.upsertRecovery(incident);

    // Request customer consent log
    auditLogger.record({
      actor: 'RECOVERY_AGENT',
      action: 'CUSTOMER_CONSENT_REQUESTED',
      orderId: order.id,
      incidentId,
      summary: `Autonomous Recovery Proposal formulated. Awaiting explicit customer confirmation.`,
      metadata: {
        strategy: proposal.strategy,
        concession: proposal.concession,
        recommendedPaymentMethod: proposal.recommendedPaymentMethod
      }
    });

    return incident;
  }

  /**
   * Formulates a bounded recovery strategy for an order based on failure taxonomy.
   */
  private static async formulateStrategy(
    order: Order,
    failureCategory: FailureCategory,
    incidentId: string
  ): Promise<RecoveryProposal> {
    let strategy: RecoveryStrategyType = 'SWITCH_TO_UPI_INTENT';
    let headline = '';
    let customerMessage = '';
    let recommendedMethod: RecoveryProposal['recommendedPaymentMethod'] = 'UPI';
    let discountPercent = 0;
    let agentReasoning = '';

    switch (failureCategory) {
      case 'BANK_OTP_TIMEOUT':
      case 'AUTHENTICATION_FAILED':
        strategy = 'SWITCH_TO_UPI_INTENT';
        recommendedMethod = 'UPI';
        headline = 'Bank OTP Delay Detected';
        customerMessage = `We noticed your bank 2FA timed out. We have reserved your items! Switch to instant 1-tap UPI (GPay / PhonePe / Paytm) with a 1-click Razorpay payment link.`;
        agentReasoning = 'High probability of bank SMS delay. Switching to UPI intent bypasses bank OTP infrastructure with >92% success rate.';
        discountPercent = 0; // No discount needed for simple bank delays
        break;

      case 'CARD_DECLINED_INSUFFICIENT_FUNDS':
        strategy = 'BOUNDED_CONCESSION_DISCOUNT';
        recommendedMethod = 'PAYMENT_LINK';
        discountPercent = 8; // 8% dynamic concession
        headline = 'Card Declined / Limit Notice';
        customerMessage = `Your card issuer declined the transaction. To help you complete your purchase, we've applied a time-sensitive concession to your cart!`;
        agentReasoning = 'Shopper encountered card ceiling. Providing a bounded 8% concession with alternative payment modes increases conversion by 38%.';
        break;

      case 'CART_ABANDONMENT_AT_CHECKOUT':
        strategy = 'INVENTORY_RESERVATION_REMINDER';
        recommendedMethod = 'PAYMENT_LINK';
        headline = 'Cart Reserved for You';
        customerMessage = `We saw you were checking out! Your selected items are on high demand, but we have reserved your cart for 20 minutes with a quick checkout link.`;
        agentReasoning = 'Cart abandonment during checkout. Reassuring stock reservation prompts immediate return.';
        discountPercent = 5;
        break;

      case 'UPI_INTENT_REJECTED':
      case 'NETWORK_GATEWAY_DROPOUT':
      default:
        strategy = 'ONE_CLICK_PAYMENT_LINK';
        recommendedMethod = 'PAYMENT_LINK';
        headline = 'Payment Interrupted — Retry with 1 Click';
        customerMessage = `A network glitch interrupted your payment. Don't worry, your cart is intact. Use this direct Razorpay recovery link to complete it securely.`;
        agentReasoning = 'Network interruption detected. Direct smart payment link provides fastest re-entry without re-adding cart items.';
        discountPercent = 0;
        break;
    }

    // Policy check & bounded concession
    const policyResult = PolicyEngine.evaluateConcession({
      originalAmount: order.amount,
      requestedDiscountPercentage: discountPercent,
      orderId: order.id,
      incidentId
    });

    const proposal: RecoveryProposal = {
      incidentId,
      orderId: order.id,
      failureCategory,
      detectedReason: FAILURE_REASONS[failureCategory]?.title || 'Payment Interrupted',
      strategy,
      headline,
      customerMessage,
      concession: policyResult.adjustedConcession,
      recommendedPaymentMethod: recommendedMethod,
      expiryTimestamp: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      requiresCustomerConsent: PolicyEngine.requiresCustomerConfirmation(),
      confidenceScore: 0.94,
      agentReasoning
    };

    auditLogger.record({
      actor: 'RECOVERY_AGENT',
      action: 'RECOVERY_STRATEGY_FORMULATED',
      orderId: order.id,
      incidentId,
      summary: `Strategy formulated: ${strategy}. Reason: ${agentReasoning}`,
      metadata: {
        strategy,
        confidenceScore: 0.94,
        concession: policyResult.adjustedConcession
      }
    });

    return proposal;
  }

  /**
   * Executes the recovery action after the customer provides explicit consent.
   */
  public static async executeConfirmedRecovery(params: {
    incidentId: string;
    accepted: boolean;
    customerFeedback?: string;
  }): Promise<RecoveryIncident> {
    const incident = db.getRecoveryById(params.incidentId);
    if (!incident) {
      throw new Error(`Incident ${params.incidentId} not found`);
    }

    const order = db.getOrderById(incident.orderId);
    if (!order) {
      throw new Error(`Order ${incident.orderId} not found`);
    }

    if (!params.accepted) {
      incident.status = 'DECLINED_BY_CUSTOMER';
      db.upsertRecovery(incident);

      auditLogger.record({
        actor: 'CUSTOMER',
        action: 'CUSTOMER_CONSENT_REJECTED',
        orderId: order.id,
        incidentId: incident.id,
        summary: `Shopper declined recovery offer for Order #${order.orderNumber}. Feedback: "${params.customerFeedback || 'No feedback'}"`,
        metadata: { feedback: params.customerFeedback }
      });

      return incident;
    }

    // Customer Accepted!
    incident.status = 'ACCEPTED_BY_CUSTOMER';

    auditLogger.record({
      actor: 'CUSTOMER',
      action: 'CUSTOMER_CONSENT_GRANTED',
      orderId: order.id,
      incidentId: incident.id,
      summary: `Shopper accepted recovery proposal for Order #${order.orderNumber}. Generating Razorpay Smart Link.`,
      metadata: { strategy: incident.recoveryProposal?.strategy }
    });

    // Create dynamic Razorpay Payment Link
    const finalAmount = incident.recoveryProposal?.concession?.finalRecoveryAmount || order.amount;

    const paymentLinkResult = await createRecoveryPaymentLink({
      amount: finalAmount,
      currency: order.currency,
      description: `Recovery Checkout for Order #${order.orderNumber}`,
      customer: {
        email: order.customerEmail,
        contact: order.customerPhone,
        name: order.customerName
      },
      referenceId: incident.id,
      notes: {
        orderId: order.id,
        incidentId: incident.id,
        strategy: incident.recoveryProposal?.strategy || 'RECOVERY'
      },
      expireByMinutes: 20
    });

    incident.status = 'EXECUTED';
    incident.razorpayPaymentLinkId = paymentLinkResult.id;
    if (incident.recoveryProposal) {
      incident.recoveryProposal.razorpayPaymentLinkId = paymentLinkResult.id;
      incident.recoveryProposal.razorpayPaymentLinkUrl = paymentLinkResult.shortUrl;
    }

    db.upsertRecovery(incident);

    auditLogger.record({
      actor: 'RECOVERY_AGENT',
      action: 'RAZORPAY_PAYMENT_LINK_ISSUED',
      orderId: order.id,
      incidentId: incident.id,
      summary: `Razorpay Recovery Payment Link issued: ${paymentLinkResult.id} (Amount: ₹${finalAmount})`,
      metadata: {
        paymentLinkId: paymentLinkResult.id,
        paymentLinkUrl: paymentLinkResult.shortUrl,
        finalAmount,
        isSimulated: paymentLinkResult.isSimulated
      }
    });

    return incident;
  }

  /**
   * Confirms payment success and finalizes revenue recovery
   */
  public static async finalizeSuccessfulRecovery(params: {
    incidentId: string;
    razorpayPaymentId: string;
  }): Promise<RecoveryIncident> {
    const incident = db.getRecoveryById(params.incidentId);
    if (!incident) {
      throw new Error(`Incident ${params.incidentId} not found`);
    }

    if (incident.status === 'RECOVERED') {
      console.log(`ℹ️ Incident ${params.incidentId} is already marked RECOVERED (Idempotent call ignored).`);
      return incident;
    }

    const order = db.getOrderById(incident.orderId);
    const finalAmount = incident.recoveryProposal?.concession?.finalRecoveryAmount || incident.amountAtRisk;

    incident.status = 'RECOVERED';
    incident.recoveredAmount = finalAmount;
    incident.razorpayPaymentId = params.razorpayPaymentId;
    db.upsertRecovery(incident);

    if (order) {
      order.status = 'recovered';
      db.upsertOrder(order);
    }

    auditLogger.record({
      actor: 'RAZORPAY_WEBHOOK',
      action: 'PAYMENT_LINK_PAID',
      orderId: order?.id,
      incidentId: incident.id,
      summary: `Payment captured via Razorpay for recovery link! Payment ID: ${params.razorpayPaymentId}`,
      metadata: {
        razorpayPaymentId: params.razorpayPaymentId,
        recoveredAmount: finalAmount
      }
    });

    auditLogger.record({
      actor: 'RECOVERY_AGENT',
      action: 'REVENUE_RECOVERED_CONFIRMED',
      orderId: order?.id,
      incidentId: incident.id,
      summary: `🎉 Successfully recovered ₹${finalAmount} of ₹${incident.amountAtRisk} at risk!`,
      metadata: {
        recoveredAmount: finalAmount,
        originalRisk: incident.amountAtRisk,
        razorpayPaymentId: params.razorpayPaymentId
      }
    });

    return incident;
  }
}
