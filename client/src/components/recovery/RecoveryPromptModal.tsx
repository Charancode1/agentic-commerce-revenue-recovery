import React, { useState } from 'react';
import { RecoveryIncident } from '../../../shared/types/recovery';
import { api } from '../../services/api';
import { ShieldCheck, Zap, Clock, ArrowRight, X, CheckCircle, CreditCard, Smartphone, Sparkles, ExternalLink } from 'lucide-react';

interface RecoveryPromptModalProps {
  incident: RecoveryIncident | null;
  onClose: () => void;
  onRecoveryCompleted: (incident: RecoveryIncident) => void;
}

export const RecoveryPromptModal: React.FC<RecoveryPromptModalProps> = ({
  incident,
  onClose,
  onRecoveryCompleted
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [executedLink, setExecutedLink] = useState<{ id: string; url: string } | null>(null);
  const [isPaid, setIsPaid] = useState(false);

  if (!incident || !incident.recoveryProposal) return null;

  const proposal = incident.recoveryProposal;
  const concession = proposal.concession;
  const originalAmount = incident.amountAtRisk;
  const finalAmount = concession?.finalRecoveryAmount || originalAmount;
  const discountVal = concession?.discountValue || 0;

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      // 1. Send explicit customer consent
      const updatedIncident = await api.confirmRecovery(incident.id, true);

      if (updatedIncident.recoveryProposal?.razorpayPaymentLinkId) {
        setExecutedLink({
          id: updatedIncident.recoveryProposal.razorpayPaymentLinkId,
          url: updatedIncident.recoveryProposal.razorpayPaymentLinkUrl || '#'
        });
      }
    } catch (e) {
      console.error('Accept recovery error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      await api.confirmRecovery(incident.id, false, 'Shopper opted out');
      onClose();
    } catch (e) {
      console.error('Decline recovery error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateLinkPayment = async () => {
    setIsProcessing(true);
    try {
      const finalized = await api.completeRecoveryPayment(
        incident.id,
        `pay_rec_${Date.now().toString().slice(-8)}`
      );
      setIsPaid(true);
      setTimeout(() => {
        onRecoveryCompleted(finalized);
        onClose();
      }, 1800);
    } catch (e) {
      console.error('Complete payment error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid rgba(0, 186, 242, 0.4)',
          boxShadow: 'var(--shadow-glow-cyan)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(0, 186, 242, 0.15)',
            border: '1px solid rgba(0, 186, 242, 0.3)',
            color: '#38BDF8',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            <Sparkles size={14} />
            <span>AI Bounded Recovery Assistance</span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', lineHeight: '1.2' }}>
            {proposal.headline}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            {proposal.customerMessage}
          </p>
        </div>

        {/* Breakdown Card */}
        <div style={{
          padding: '16px',
          borderRadius: '14px',
          backgroundColor: 'rgba(7, 9, 19, 0.6)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Order Reference</span>
            <span style={{ fontWeight: 600 }}>#{incident.orderNumber}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Original Amount</span>
            <span style={{ textDecoration: discountVal > 0 ? 'line-through' : 'none', color: 'var(--text-subtle)' }}>
              ₹{originalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {discountVal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#34D399', fontWeight: 600 }}>
                Dynamic Concession ({concession?.promoCode})
              </span>
              <span style={{ color: '#34D399', fontWeight: 700 }}>
                - ₹{discountVal.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-subtle)',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Final Recovery Amount</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38BDF8' }}>
              ₹{finalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Expiry Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: '#FBBF24',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            padding: '6px 10px',
            borderRadius: '8px',
            marginTop: '4px'
          }}>
            <Clock size={14} />
            <span>Reserved for 20 minutes under bounded policy guardrails</span>
          </div>
        </div>

        {/* Action Buttons */}
        {!executedLink && !isPaid && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="btn-recovery-confirm"
              style={{ width: '100%' }}
            >
              {proposal.recommendedPaymentMethod === 'UPI' ? (
                <>
                  <Smartphone size={18} />
                  <span>Accept & Switch to UPI Instant Payment</span>
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  <span>Accept Recovery Concession & Pay ₹{finalAmount}</span>
                </>
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={isProcessing}
              className="btn-recovery-decline"
            >
              No thanks, I'll pay later
            </button>
          </div>
        )}

        {/* Executed Payment Link Screen */}
        {executedLink && !isPaid && (
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#34D399', fontWeight: 700 }}>
              <CheckCircle size={18} />
              <span>Razorpay Smart Recovery Link Generated!</span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Link ID: <code>{executedLink.id}</code>
            </div>

            <button
              onClick={handleSimulateLinkPayment}
              disabled={isProcessing}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              }}
            >
              <Zap size={16} />
              <span>Simulate Customer Payment of ₹{finalAmount}</span>
            </button>
          </div>
        )}

        {/* Paid Confirmation Screen */}
        {isPaid && (
          <div style={{
            padding: '24px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle size={36} color="#34D399" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#34D399' }}>
              Revenue Successfully Recovered!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Order #{incident.orderNumber} is confirmed and marked paid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
