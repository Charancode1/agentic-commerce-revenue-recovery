export type AuditActorType = 'CUSTOMER' | 'COMMERCE_AGENT' | 'RECOVERY_AGENT' | 'POLICY_ENGINE' | 'RAZORPAY_WEBHOOK' | 'MERCHANT_ADMIN';

export type AuditActionType =
  | 'PRODUCT_SEARCH'
  | 'CART_MODIFIED'
  | 'ORDER_CREATED'
  | 'PAYMENT_ATTEMPTED'
  | 'PAYMENT_FAILED_DETECTED'
  | 'REVENUE_AT_RISK_REGISTERED'
  | 'RECOVERY_STRATEGY_FORMULATED'
  | 'POLICY_GUARDRAIL_APPLIED'
  | 'CUSTOMER_CONSENT_REQUESTED'
  | 'CUSTOMER_CONSENT_GRANTED'
  | 'CUSTOMER_CONSENT_REJECTED'
  | 'RAZORPAY_PAYMENT_LINK_ISSUED'
  | 'PAYMENT_LINK_PAID'
  | 'REVENUE_RECOVERED_CONFIRMED'
  | 'RECOVERY_TIMED_OUT';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  incidentId?: string;
  orderId?: string;
  actor: AuditActorType;
  action: AuditActionType;
  summary: string;
  metadata: {
    amount?: number;
    currency?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpayPaymentLinkId?: string;
    concessionApplied?: number;
    failureCategory?: string;
    policyCheckPassed?: boolean;
    ipAddress?: string;
    extra?: Record<string, any>;
  };
  hash?: string; // Cryptographic integrity hash placeholder
}
