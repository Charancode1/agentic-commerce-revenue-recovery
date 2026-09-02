import { GoogleGenAI, Type } from '@google/genai';
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
import { ENV } from '../config/env';

interface GeminiRecoveryStrategyOutput {
  strategy: RecoveryStrategyType;
  proposedDiscountPercentage: number;
  recommendedPaymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'PAYMENT_LINK';
  headline: string;
  customerMessage: string;
  agentReasoning: string;
  confidenceScore: number;
}

export class RecoveryAgent {
  private static geminiClient: GoogleGenAI | null = null;

  /**
   * Initializes the Google GenAI SDK instance if an API key is available.
   */
  private static getGeminiClient(): GoogleGenAI | null {
    if (this.geminiClient) return this.geminiClient;
    if (ENV.GEMINI_API_KEY && ENV.GEMINI_API_KEY.trim().length > 0) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY.trim() });
        return this.geminiClient;
      } catch (err) {
        console.warn('⚠️ Failed to initialize GoogleGenAI client for RecoveryAgent, falling back to heuristics:', err);
        return null;
      }
    }
    return null;
  }

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

    // Formulate Strategy based on failure root cause via Gemini AI (with heuristic fallback)
    const proposal = await this.formulateStrategy(
      order,
      params.failureCategory,
      incidentId,
      params.rawErrorCode,
      params.rawDescription
    );

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
   * Primary entry point for formulating a recovery strategy.
   * Uses Gemini AI with structured schema, falling back gracefully to deterministic heuristics.
   */
  private static async formulateStrategy(
    order: Order,
    failureCategory: FailureCategory,
    incidentId: string,
    rawErrorCode?: string,
    rawDescription?: string
  ): Promise<RecoveryProposal> {
    const ai = this.getGeminiClient();
    if (ai) {
      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timed out after 25000ms')), 25000)
        );

        const geminiProposal = await Promise.race([
          this.formulateWithGemini(
            ai,
            order,
            failureCategory,
            incidentId,
            rawErrorCode,
            rawDescription
          ),
          timeoutPromise
        ]);

        if (geminiProposal) {
          return geminiProposal;
        }
      } catch (err) {
        console.warn('⚠️ Gemini recovery reasoning error, falling back to deterministic heuristics:', err);
      }
    }

    return this.formulateWithHeuristics(order, failureCategory, incidentId);
  }

  /**
   * Formulates recovery strategy using Gemini 3.6 Flash structured reasoning.
   */
  private static async formulateWithGemini(
    ai: GoogleGenAI,
    order: Order,
    failureCategory: FailureCategory,
    incidentId: string,
    rawErrorCode?: string,
    rawDescription?: string
  ): Promise<RecoveryProposal | null> {
    const categoryInfo = FAILURE_REASONS[failureCategory] || FAILURE_REASONS.NETWORK_GATEWAY_DROPOUT;

    const systemInstruction = `You are the Autonomous Revenue Defense & Recovery Decision Agent for RAZORDEFENSE.
Your job is to analyze a failed transaction or checkout drop-off and autonomously determine the optimal, bounded recovery strategy from the supported strategies.

SUPPORTED RECOVERY STRATEGIES:
- SWITCH_TO_UPI_INTENT: Best for Bank OTP/2FA delays or SMS timeouts. Bypasses bank SMS delays using 1-tap UPI (GPay/PhonePe). Proposed discount: 0%.
- BOUNDED_CONCESSION_DISCOUNT: Best for card declines (insufficient funds, daily spending limit ceiling). Propose a bounded concession percentage (e.g. 5% to 10%) to lower the barrier to re-purchase.
- INVENTORY_RESERVATION_REMINDER: Best for cart abandonment during checkout. Reassures shopper that high-demand inventory is reserved for 20 minutes with a quick checkout link. Proposed discount: 0% to 5%.
- ONE_CLICK_PAYMENT_LINK: Best for network glitches, gateway timeouts, or general interruptions. Issues direct 1-click Razorpay recovery payment link to resume instantly without re-adding items. Proposed discount: 0%.
- SPLIT_PAYMENT_OFFER: Best for high-value orders where single instrument limits were breached.

CRITICAL FINANCIAL & ARCHITECTURAL SAFETY RULES:
1. You must reason using ONLY the supplied order and failure context.
2. DO NOT invent fake order amounts, customer data, payment IDs, or fake discounts. The order amount is strictly immutable.
3. You may PROPOSE a concession percentage (0% to 12%), but it is strictly an advisory proposal. Every proposal is deterministically evaluated and clamped by the PolicyEngine (hard 12% ceiling, ₹500 cap, ₹1,000 basket threshold).
4. You cannot execute payments or create payment links directly. Payment link creation requires explicit customer consent and backend Razorpay API execution.
5. In "agentReasoning", clearly articulate WHY your chosen strategy and concession offer address the specific root cause.`;

    const failureContextPrompt = `Failed Order Details:
- Order Number: #${order.orderNumber}
- Order ID: ${order.id}
- Order Amount: ₹${order.amount} ${order.currency}
- Items: ${order.items.map(i => `${i.product.name} (Qty: ${i.quantity}, ₹${i.selectedPrice})`).join(', ')}
- Customer: ${order.customerName} (${order.customerEmail})

Failure Diagnostics:
- Category: ${failureCategory}
- Title: ${categoryInfo.title}
- Description: ${categoryInfo.description}
- Gateway Error Code: ${rawErrorCode || 'N/A'}
- Gateway Error Description: ${rawDescription || 'N/A'}

Analyze the failure diagnostics, select the most effective recovery strategy, determine the payment method, and propose an appropriate concession percentage.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: failureContextPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategy: {
              type: Type.STRING,
              description: 'One of: SWITCH_TO_UPI_INTENT, ONE_CLICK_PAYMENT_LINK, BOUNDED_CONCESSION_DISCOUNT, INVENTORY_RESERVATION_REMINDER, SPLIT_PAYMENT_OFFER'
            },
            proposedDiscountPercentage: {
              type: Type.NUMBER,
              description: 'Proposed discount percentage (0 to 12). 0 if no concession is needed.'
            },
            recommendedPaymentMethod: {
              type: Type.STRING,
              description: 'One of: UPI, CARD, NETBANKING, PAYMENT_LINK'
            },
            headline: {
              type: Type.STRING,
              description: 'Concise summary headline for merchant and shopper recovery.'
            },
            customerMessage: {
              type: Type.STRING,
              description: 'Empathetic explanation of the failure and solution for the customer.'
            },
            agentReasoning: {
              type: Type.STRING,
              description: 'Autonomous reasoning explaining why this strategy was chosen for this failure.'
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: 'Confidence in strategy suitability from 0.0 to 1.0.'
            }
          },
          required: [
            'strategy',
            'proposedDiscountPercentage',
            'recommendedPaymentMethod',
            'headline',
            'customerMessage',
            'agentReasoning',
            'confidenceScore'
          ]
        }
      }
    });

    const rawJson = response.text?.trim();
    if (!rawJson) return null;

    const parsed: GeminiRecoveryStrategyOutput = JSON.parse(rawJson);

    // Validate Strategy Enum
    const VALID_STRATEGIES: RecoveryStrategyType[] = [
      'SWITCH_TO_UPI_INTENT',
      'ONE_CLICK_PAYMENT_LINK',
      'BOUNDED_CONCESSION_DISCOUNT',
      'INVENTORY_RESERVATION_REMINDER',
      'SPLIT_PAYMENT_OFFER'
    ];
    if (!VALID_STRATEGIES.includes(parsed.strategy)) {
      console.warn(`⚠️ Gemini returned unsupported strategy "${parsed.strategy}", falling back.`);
      return null;
    }

    // Validate Payment Method Enum
    const VALID_PAYMENT_METHODS = ['UPI', 'CARD', 'NETBANKING', 'PAYMENT_LINK'] as const;
    const recommendedPaymentMethod = VALID_PAYMENT_METHODS.includes(parsed.recommendedPaymentMethod as any)
      ? (parsed.recommendedPaymentMethod as RecoveryProposal['recommendedPaymentMethod'])
      : 'PAYMENT_LINK';

    // Safe number extraction
    const proposedDiscount = typeof parsed.proposedDiscountPercentage === 'number' && !isNaN(parsed.proposedDiscountPercentage)
      ? Math.max(0, parsed.proposedDiscountPercentage)
      : 0;

    // Pass Gemini's proposed concession to PolicyEngine for authoritative bounds enforcement
    const policyResult = PolicyEngine.evaluateConcession({
      originalAmount: order.amount,
      requestedDiscountPercentage: proposedDiscount,
      orderId: order.id,
      incidentId
    });

    const confidenceScore = typeof parsed.confidenceScore === 'number' && !isNaN(parsed.confidenceScore)
      ? Math.min(1.0, Math.max(0.1, parsed.confidenceScore))
      : 0.92;

    const proposal: RecoveryProposal = {
      incidentId,
      orderId: order.id,
      failureCategory,
      detectedReason: categoryInfo.title || 'Payment Interrupted',
      strategy: parsed.strategy,
      headline: parsed.headline || categoryInfo.title,
      customerMessage: parsed.customerMessage,
      concession: policyResult.adjustedConcession,
      recommendedPaymentMethod,
      expiryTimestamp: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      requiresCustomerConsent: PolicyEngine.requiresCustomerConfirmation(),
      confidenceScore,
      agentReasoning: parsed.agentReasoning
    };

    auditLogger.record({
      actor: 'RECOVERY_AGENT',
      action: 'RECOVERY_STRATEGY_FORMULATED',
      orderId: order.id,
      incidentId,
      summary: `Strategy formulated via Gemini AI: ${proposal.strategy} (${Math.round(confidenceScore * 100)}% confidence). Reason: ${proposal.agentReasoning}`,
      metadata: {
        engine: 'GEMINI_3_5_FLASH',
        strategy: proposal.strategy,
        confidenceScore,
        proposedDiscountPercentage: proposedDiscount,
        concession: policyResult.adjustedConcession
      }
    });

    return proposal;
  }

  /**
   * Deterministic Heuristic Fallback Engine.
   * Runs seamlessly if GEMINI_API_KEY is not configured or if the Gemini API call fails.
   */
  private static formulateWithHeuristics(
    order: Order,
    failureCategory: FailureCategory,
    incidentId: string
  ): RecoveryProposal {
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
      summary: `Strategy formulated via Heuristic Fallback: ${strategy}. Reason: ${agentReasoning}`,
      metadata: {
        engine: 'HEURISTIC_FALLBACK',
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
