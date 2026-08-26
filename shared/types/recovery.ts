export type FailureCategory =
  | 'BANK_OTP_TIMEOUT'
  | 'CARD_DECLINED_INSUFFICIENT_FUNDS'
  | 'NETWORK_GATEWAY_DROPOUT'
  | 'CART_ABANDONMENT_AT_CHECKOUT'
  | 'UPI_INTENT_REJECTED'
  | 'AUTHENTICATION_FAILED';

export type RecoveryStrategyType =
  | 'SWITCH_TO_UPI_INTENT'
  | 'ONE_CLICK_PAYMENT_LINK'
  | 'BOUNDED_CONCESSION_DISCOUNT'
  | 'INVENTORY_RESERVATION_REMINDER'
  | 'SPLIT_PAYMENT_OFFER';

export type RecoveryStatus =
  | 'DETECTED'
  | 'EVALUATED'
  | 'CONSENT_PENDING'
  | 'ACCEPTED_BY_CUSTOMER'
  | 'DECLINED_BY_CUSTOMER'
  | 'EXECUTED'
  | 'RECOVERED'
  | 'EXPIRED';

export interface BoundedConcession {
  discountType: 'percentage' | 'fixed';
  discountValue: number; // e.g. 5% or 150 INR
  maxAllowedDiscount: number; // Hard ceiling policy
  finalRecoveryAmount: number;
  promoCode: string;
  expiresInMinutes: number;
}

export interface RecoveryProposal {
  incidentId: string;
  orderId: string;
  failureCategory: FailureCategory;
  detectedReason: string;
  strategy: RecoveryStrategyType;
  headline: string;
  customerMessage: string;
  concession?: BoundedConcession;
  recommendedPaymentMethod: 'UPI' | 'CARD' | 'NETBANKING' | 'PAYMENT_LINK';
  razorpayPaymentLinkId?: string;
  razorpayPaymentLinkUrl?: string;
  expiryTimestamp: string;
  requiresCustomerConsent: boolean;
  confidenceScore: number; // 0.0 - 1.0
  agentReasoning: string;
}

export interface RecoveryIncident {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerPhone: string;
  amountAtRisk: number; // In INR
  failureCategory: FailureCategory;
  failureCode?: string;
  failureDescription: string;
  status: RecoveryStatus;
  recoveryProposal?: RecoveryProposal;
  recoveredAmount?: number;
  razorpayPaymentId?: string;
  razorpayPaymentLinkId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalRevenueAtRisk: number;
  totalRecoveredRevenue: number;
  recoveryRatePercentage: number;
  activeIncidentsCount: number;
  totalIncidentsCount: number;
  averageRecoveryTimeSeconds: number;
  topFailureReasons: { category: FailureCategory; count: number; amount: number }[];
  strategyPerformance: { strategy: RecoveryStrategyType; converted: number; attempted: number }[];
}
