export const POLICY_CONFIG = {
  // Maximum discount percentage an autonomous recovery agent can grant
  MAX_DISCOUNT_PERCENTAGE: 12, // 12% max
  // Maximum absolute discount amount in INR
  MAX_DISCOUNT_AMOUNT_INR: 500, // ₹500 max
  // Maximum autonomous recovery attempts per incident
  MAX_RECOVERY_ATTEMPTS: 2,
  // Payment link expiry duration in minutes
  PAYMENT_LINK_EXPIRY_MINUTES: 20,
  // Minimum basket size for discount eligibility
  MIN_BASKET_FOR_DISCOUNT_INR: 1000,
  // Guardrail: Always require explicit human confirmation for financial modifications
  REQUIRE_CUSTOMER_CONSENT: true
};

export const FAILURE_REASONS = {
  BANK_OTP_TIMEOUT: {
    title: 'Bank OTP Timeout / SMS Delay',
    description: 'Customer did not receive OTP in time or bank 2FA portal timed out.',
    defaultStrategy: 'SWITCH_TO_UPI_INTENT'
  },
  CARD_DECLINED_INSUFFICIENT_FUNDS: {
    title: 'Card Declined / Daily Limit Reached',
    description: 'Issuing bank declined card due to limit or insufficient funds.',
    defaultStrategy: 'BOUNDED_CONCESSION_DISCOUNT'
  },
  NETWORK_GATEWAY_DROPOUT: {
    title: 'Network Gateway Interruption',
    description: 'Connection between browser and payment gateway dropped before capture.',
    defaultStrategy: 'ONE_CLICK_PAYMENT_LINK'
  },
  CART_ABANDONMENT_AT_CHECKOUT: {
    title: 'Drop-off at Checkout Step',
    description: 'Shopper initiated checkout but dropped off before selecting a payment method.',
    defaultStrategy: 'INVENTORY_RESERVATION_REMINDER'
  },
  UPI_INTENT_REJECTED: {
    title: 'UPI App Intent Cancelled',
    description: 'Customer cancelled the UPI collect request in GPay/PhonePe.',
    defaultStrategy: 'ONE_CLICK_PAYMENT_LINK'
  },
  AUTHENTICATION_FAILED: {
    title: '3DS Authentication Failed',
    description: 'Incorrect password or 3D Secure verification failed.',
    defaultStrategy: 'SWITCH_TO_UPI_INTENT'
  }
} as const;
