import React, { useState, useEffect } from 'react';
import { RecoveryIncident } from '../../../shared/types/recovery';
import { api } from '../../services/api';
import { ShieldCheck, Zap, Clock, X, CheckCircle, CreditCard, Smartphone, ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    if (incident?.recoveryProposal?.razorpayPaymentLinkId) {
      setExecutedLink({
        id: incident.recoveryProposal.razorpayPaymentLinkId,
        url: incident.recoveryProposal.razorpayPaymentLinkUrl || '#'
      });
    } else {
      setExecutedLink(null);
    }
  }, [incident]);

  if (!incident || !incident.recoveryProposal) return null;

  const proposal = incident.recoveryProposal;
  const concession = proposal.concession;
  const originalAmount = incident.amountAtRisk;
  const finalAmount = concession?.finalRecoveryAmount || originalAmount;
  const discountVal = concession?.discountValue || 0;

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
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
      }, 1500);
    } catch (e) {
      console.error('Complete payment error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="saas-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#111827',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: 'rgba(2, 132, 199, 0.12)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            color: '#38BDF8',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <ShieldCheck size={14} />
            <span>RAZORDEFENSE Payment Recovery</span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subtle)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', lineHeight: '1.3' }}>
            {proposal.headline}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
            {proposal.customerMessage}
          </p>
        </div>

        {/* Breakdown Card */}
        <div style={{
          padding: '14px',
          borderRadius: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-subtle)' }}>Order Reference</span>
            <span style={{ fontWeight: 600 }}>#{incident.orderNumber}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-subtle)' }}>Original Amount</span>
            <span style={{ textDecoration: discountVal > 0 ? 'line-through' : 'none', color: 'var(--text-subtle)' }}>
              ₹{originalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {discountVal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#34D399', fontWeight: 500 }}>
                Concession Applied ({concession?.promoCode})
              </span>
              <span style={{ color: '#34D399', fontWeight: 700 }}>
                - ₹{discountVal.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Final Amount</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38BDF8' }}>
              ₹{finalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Expiry Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.725rem',
            color: '#FBBF24',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            padding: '5px 8px',
            borderRadius: '6px',
            marginTop: '2px'
          }}>
            <Clock size={13} />
            <span>Reserved for 20 minutes under merchant policy guardrails</span>
          </div>
        </div>

        {/* Action Buttons */}
        {!executedLink && !isPaid && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="btn-recovery-confirm"
              style={{ width: '100%' }}
            >
              {proposal.recommendedPaymentMethod === 'UPI' ? (
                <>
                  <Smartphone size={16} />
                  <span>Accept & Switch to Instant UPI Payment</span>
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>Accept Concession & Pay ₹{finalAmount}</span>
                </>
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={isProcessing}
              className="btn-recovery-decline"
            >
              Decline offer
            </button>
          </div>
        )}

        {/* Executed Payment Link Screen */}
        {executedLink && !isPaid && (
          <div style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#34D399', fontWeight: 600, fontSize: '0.85rem' }}>
              <CheckCircle size={16} />
              <span>Razorpay Smart Recovery Link Generated</span>
            </div>

            <div style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
              Link ID: <code>{executedLink.id}</code>
            </div>

            {executedLink.url && executedLink.url !== '#' && (
              <a
                href={executedLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={16} />
                <span>Open Razorpay Recovery Link</span>
              </a>
            )}

            <button
              onClick={handleSimulateLinkPayment}
              disabled={isProcessing}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#059669'
              }}
            >
              <Zap size={15} />
              <span>Simulate Customer Payment of ₹{finalAmount}</span>
            </button>
          </div>
        )}

        {/* Paid Confirmation Screen */}
        {isPaid && (
          <div style={{
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={32} color="#34D399" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#34D399' }}>
              Revenue Successfully Recovered
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Order #{incident.orderNumber} is verified and captured via Razorpay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
