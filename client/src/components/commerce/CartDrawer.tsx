import React, { useState } from 'react';
import { CartItem } from '../../../shared/types/commerce';
import { X, Trash2, Plus, Minus, ShieldCheck, ArrowRight, Lock, CreditCard } from 'lucide-react';
import { api } from '../../services/api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onPaymentSuccess: (order: any) => void;
  onPaymentFailureTriggered: (incident: any) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onPaymentSuccess,
  onPaymentFailureTriggered
}) => {
  const [customerName, setCustomerName] = useState('Sarah Jenkins');
  const [customerEmail, setCustomerEmail] = useState('sarah.jenkins@example.com');
  const [customerPhone, setCustomerPhone] = useState('+919876543210');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsCheckingOut(true);
    setErrorMessage('');

    try {
      // 1. Create Order via Backend Razorpay Bridge
      const orderRes = await api.createOrder({
        items,
        customerName,
        customerEmail,
        customerPhone
      });

      if (!orderRes.success) {
        throw new Error('Failed to initialize order');
      }

      const { order, razorpay } = orderRes;

      // 2. Launch Razorpay Standard Checkout
      if ((window as any).Razorpay && !razorpay.isSimulated) {
        const options = {
          key: razorpay.keyId,
          amount: razorpay.amount,
          currency: razorpay.currency,
          name: 'RAZORDEFENSE Store',
          description: `Order #${order.orderNumber}`,
          order_id: razorpay.orderId,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone
          },
          theme: {
            color: '#00BAF2'
          },
          handler: async (response: any) => {
            const verifyRes = await api.verifyPayment({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });

            if (verifyRes.success) {
              onPaymentSuccess(verifyRes.order);
              onClose();
            }
          },
          modal: {
            ondismiss: async () => {
              // Customer closed without completing payment -> Trigger Cart Abandonment recovery
              const failRes = await api.simulateFailure({
                orderId: order.id,
                failureCategory: 'CART_ABANDONMENT_AT_CHECKOUT',
                rawDescription: 'Customer closed Razorpay checkout modal before payment capture.'
              });
              if (failRes.success) {
                onPaymentFailureTriggered(failRes.incident);
                onClose();
              }
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', async (response: any) => {
          const failRes = await api.simulateFailure({
            orderId: order.id,
            failureCategory: 'BANK_OTP_TIMEOUT',
            rawDescription: response.error?.description || 'Payment failed during gateway processing.'
          });
          if (failRes.success) {
            onPaymentFailureTriggered(failRes.incident);
            onClose();
          }
        });
        rzp.open();
      } else {
        // Simulated Razorpay Checkout Prompt
        const confirmSuccess = window.confirm(
          `[Razorpay Test Mode]\n\nOrder #${order.orderNumber} for ₹${order.amount.toLocaleString('en-IN')}\n\nClick 'OK' to simulate SUCCESSFUL payment.\nClick 'Cancel' to simulate BANK OTP TIMEOUT failure (to test the Autonomous Recovery Agent!).`
        );

        if (confirmSuccess) {
          const verifyRes = await api.verifyPayment({
            orderId: order.id,
            razorpayOrderId: razorpay.orderId,
            razorpayPaymentId: `pay_sim_${Date.now().toString().slice(-8)}`,
            razorpaySignature: 'simulated_sig_ok'
          });
          onPaymentSuccess(verifyRes.order);
          onClose();
        } else {
          // Trigger Simulated Failure
          const failRes = await api.simulateFailure({
            orderId: order.id,
            failureCategory: 'BANK_OTP_TIMEOUT',
            rawDescription: 'Simulated Bank 2FA / OTP Gateway Timeout'
          });
          if (failRes.success) {
            onPaymentFailureTriggered(failRes.incident);
            onClose();
          }
        }
      }
    } catch (e: any) {
      console.error('Checkout error:', e);
      setErrorMessage(e.message || 'Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="saas-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#111827',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              Shopping Cart & Checkout
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content / Items List */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Your cart is currently empty.
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.productId}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  alignItems: 'center'
                }}
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }}
                />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.product.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38BDF8' }}>
                    ₹{item.product.price.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => onUpdateQuantity(item.productId, -1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.productId, 1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => onRemoveItem(item.productId)}
                    style={{
                      marginLeft: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-rose)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Customer Details Form */}
          {items.length > 0 && (
            <div style={{
              marginTop: '10px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                CUSTOMER & SHIPPING INFO
              </div>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Full Name"
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="Email Address"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Phone Number"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer / Summary */}
        {items.length > 0 && (
          <div style={{
            padding: '18px 24px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(7, 9, 19, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {errorMessage && (
              <div style={{
                color: 'var(--accent-rose)',
                fontSize: '0.8rem',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                padding: '8px 12px',
                borderRadius: '8px'
              }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Amount</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                opacity: isCheckingOut ? 0.7 : 1
              }}
            >
              <CreditCard size={18} />
              <span>{isCheckingOut ? 'Opening Razorpay...' : `Pay ₹${subtotal.toLocaleString('en-IN')} with Razorpay`}</span>
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: 'var(--text-subtle)',
              fontSize: '0.75rem'
            }}>
              <Lock size={12} />
              <span>Secured by Razorpay Test API & RAZORDEFENSE Sentinel</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
