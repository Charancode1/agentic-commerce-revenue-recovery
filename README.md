## Razorpay Test Mode Integration

The application integrates with the official Razorpay Node.js SDK and supports
Razorpay Test Mode for realistic payment-flow testing without processing real
customer payments.

### Current Razorpay Integration

- Official `razorpay` Node.js SDK integrated into the backend.
- Razorpay Test API credentials are loaded securely from environment variables.
- API secrets are kept server-side and are never exposed to the frontend.
- Order creation uses the Razorpay Test API when valid test credentials are configured.
- Payment signature verification uses HMAC-SHA256.
- Payment failure and recovery flows are supported.
- Razorpay webhooks are supported for payment events such as:
  - `payment.failed`
  - `order.paid`
  - `payment_link.paid`

### Environment Variables

Create/configure the server `.env` file:

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
