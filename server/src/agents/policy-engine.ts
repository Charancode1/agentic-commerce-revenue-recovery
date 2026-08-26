import { POLICY_CONFIG } from '../config/constants';
import { BoundedConcession } from '../../../shared/types/recovery';
import { auditLogger } from '../db/audit-logger';

export interface PolicyCheckResult {
  isAllowed: boolean;
  adjustedConcession?: BoundedConcession;
  reason: string;
  violations: string[];
}

export class PolicyEngine {
  /**
   * Evaluates proposed concession to ensure it never breaches merchant-defined loss boundaries.
   */
  public static evaluateConcession(params: {
    originalAmount: number;
    requestedDiscountPercentage?: number;
    requestedDiscountAmount?: number;
    orderId?: string;
    incidentId?: string;
  }): PolicyCheckResult {
    const violations: string[] = [];
    const originalAmount = params.originalAmount;

    let calculatedDiscount = 0;

    if (params.requestedDiscountPercentage) {
      if (params.requestedDiscountPercentage > POLICY_CONFIG.MAX_DISCOUNT_PERCENTAGE) {
        violations.push(
          `Requested discount (${params.requestedDiscountPercentage}%) exceeds hard ceiling of ${POLICY_CONFIG.MAX_DISCOUNT_PERCENTAGE}%`
        );
      }
      calculatedDiscount = (originalAmount * Math.min(params.requestedDiscountPercentage, POLICY_CONFIG.MAX_DISCOUNT_PERCENTAGE)) / 100;
    } else if (params.requestedDiscountAmount) {
      if (params.requestedDiscountAmount > POLICY_CONFIG.MAX_DISCOUNT_AMOUNT_INR) {
        violations.push(
          `Requested discount amount (₹${params.requestedDiscountAmount}) exceeds maximum cap of ₹${POLICY_CONFIG.MAX_DISCOUNT_AMOUNT_INR}`
        );
      }
      calculatedDiscount = Math.min(params.requestedDiscountAmount, POLICY_CONFIG.MAX_DISCOUNT_AMOUNT_INR);
    }

    // Ensure discount does not exceed absolute rupee cap
    if (calculatedDiscount > POLICY_CONFIG.MAX_DISCOUNT_AMOUNT_INR) {
      calculatedDiscount = POLICY_CONFIG.MAX_DISCOUNT_AMOUNT_INR;
      violations.push(`Discount clamped to maximum cap of ₹${POLICY_CONFIG.MAX_DISCOUNT_AMOUNT_INR}`);
    }

    // Minimum basket check
    if (originalAmount < POLICY_CONFIG.MIN_BASKET_FOR_DISCOUNT_INR && calculatedDiscount > 0) {
      calculatedDiscount = 0;
      violations.push(`Basket size ₹${originalAmount} is below threshold of ₹${POLICY_CONFIG.MIN_BASKET_FOR_DISCOUNT_INR} for discounts.`);
    }

    calculatedDiscount = Math.round(calculatedDiscount);
    const finalAmount = Math.max(1, originalAmount - calculatedDiscount);

    const boundedConcession: BoundedConcession = {
      discountType: 'fixed',
      discountValue: calculatedDiscount,
      maxAllowedDiscount: POLICY_CONFIG.MAX_DISCOUNT_AMOUNT_INR,
      finalRecoveryAmount: finalAmount,
      promoCode: `RECOVER_${Math.round(calculatedDiscount)}_${Date.now().toString().slice(-4)}`,
      expiresInMinutes: POLICY_CONFIG.PAYMENT_LINK_EXPIRY_MINUTES
    };

    const isAllowed = violations.length === 0 || calculatedDiscount <= POLICY_CONFIG.MAX_DISCOUNT_AMOUNT_INR;

    auditLogger.record({
      actor: 'POLICY_ENGINE',
      action: 'POLICY_GUARDRAIL_APPLIED',
      orderId: params.orderId,
      incidentId: params.incidentId,
      summary: `Policy check evaluated: Concession of ₹${calculatedDiscount} applied on ₹${originalAmount}. (Approved: ${isAllowed})`,
      metadata: {
        originalAmount,
        finalAmount,
        calculatedDiscount,
        violations,
        isAllowed
      }
    });

    return {
      isAllowed,
      adjustedConcession: boundedConcession,
      reason: violations.length > 0 ? violations.join('; ') : 'Policy requirements met within safe margins.',
      violations
    };
  }

  /**
   * Validates if recovery action requires human customer consent
   */
  public static requiresCustomerConfirmation(): boolean {
    return POLICY_CONFIG.REQUIRE_CUSTOMER_CONSENT;
  }
}
