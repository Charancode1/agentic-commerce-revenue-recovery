import React, { useState } from 'react';
import { FailureCategory, RecoveryIncident } from '../../../shared/types/recovery';
import { api } from '../../services/api';
import { Terminal, ShieldCheck, Play, RefreshCw, Smartphone, CreditCard, WifiOff, ShoppingCart } from 'lucide-react';

interface FailureSimulatorProps {
  onIncidentCreated: (incident: RecoveryIncident) => void;
}

export const FailureSimulator: React.FC<FailureSimulatorProps> = ({ onIncidentCreated }) => {
  const [selectedScenario, setSelectedScenario] = useState<FailureCategory>('BANK_OTP_TIMEOUT');
  const [simulatedAmount, setSimulatedAmount] = useState<number>(4999);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastIncident, setLastIncident] = useState<RecoveryIncident | null>(null);

  const scenarios: {
    category: FailureCategory;
    title: string;
    description: string;
    icon: any;
    expectedRecovery: string;
  }[] = [
    {
      category: 'BANK_OTP_TIMEOUT',
      title: 'Bank 2FA / OTP Delay Timeout',
      description: 'Customer did not receive bank OTP SMS within 120 seconds. Gateway flagged as timeout.',
      icon: Smartphone,
      expectedRecovery: 'Auto-switches to UPI Deep Link / 1-tap QR (Bypasses Bank SMS delays)'
    },
    {
      category: 'CARD_DECLINED_INSUFFICIENT_FUNDS',
      title: 'Card Limit Exceeded / Bank Decline',
      description: 'Issuing bank returned CARD_LIMIT_REACHED. Customer cannot complete balance on card.',
      icon: CreditCard,
      expectedRecovery: 'Applies bounded 8% concession (₹400 max) + offers alternate payment methods'
    },
    {
      category: 'NETWORK_GATEWAY_DROPOUT',
      title: 'Network Gateway Interruption',
      description: 'WiFi/Cellular dropped while browser was redirecting to payment processing page.',
      icon: WifiOff,
      expectedRecovery: 'Generates dynamic Razorpay Smart Payment Link for 1-click resumption'
    },
    {
      category: 'CART_ABANDONMENT_AT_CHECKOUT',
      title: 'Checkout Drop-off / Cart Abandonment',
      description: 'Shopper initiated checkout, viewed price, but closed checkout drawer before payment.',
      icon: ShoppingCart,
      expectedRecovery: 'Triggers 20-minute Inventory Reservation badge + bounded incentive'
    }
  ];

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const createRes = await api.createOrder({
        items: [
          {
            productId: 'prod_1',
            product: {
              id: 'prod_1',
              name: 'AeroPulse ANC Pro Wireless Headphones',
              description: 'Flagship active noise-cancelling headphones',
              price: simulatedAmount,
              currency: 'INR',
              category: 'Audio & Wearables',
              image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
              inStock: true,
              inventoryCount: 14,
              tags: ['headphones'],
              features: ['Active Noise Cancelling'],
              rating: 4.8,
              reviewCount: 342
            },
            quantity: 1,
            selectedPrice: simulatedAmount
          }
        ],
        customerName: 'Alex Rivera',
        customerEmail: 'alex.rivera@example.com',
        customerPhone: '+919876543210'
      });

      const orderId = createRes.order.id;

      const simRes = await api.simulateFailure({
        orderId,
        failureCategory: selectedScenario,
        rawDescription: scenarios.find(s => s.category === selectedScenario)?.description
      });

      if (simRes.success) {
        setLastIncident(simRes.incident);
        onIncidentCreated(simRes.incident);
      }
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="saas-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '7px',
            borderRadius: '6px',
            backgroundColor: 'rgba(2, 132, 199, 0.12)',
            color: '#38BDF8'
          }}>
            <Terminal size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Failure Injection & Operations Testing Console
            </h2>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Test RAZORDEFENSE failure classification and bounded policy enforcement under gateway error conditions.
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Selector Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px'
      }}>
        {scenarios.map(sc => {
          const Icon = sc.icon;
          const isSelected = selectedScenario === sc.category;

          return (
            <div
              key={sc.category}
              onClick={() => setSelectedScenario(sc.category)}
              className="saas-card"
              style={{
                padding: '14px',
                cursor: 'pointer',
                border: isSelected ? '1px solid #0284C7' : '1px solid var(--border-subtle)',
                backgroundColor: isSelected ? 'var(--bg-elevated)' : 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  padding: '6px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#38BDF8' : 'var(--text-muted)'
                }}>
                  <Icon size={18} />
                </div>
                {isSelected && (
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                    Active
                  </span>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '2px' }}>
                  {sc.title}
                </h4>
                <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                  {sc.description}
                </p>
              </div>

              <div style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.675rem',
                color: 'var(--text-subtle)'
              }}>
                <span style={{ color: '#0284C7', fontWeight: 600 }}>Target Action: </span>
                {sc.expectedRecovery}
              </div>
            </div>
          );
        })}
      </div>

      {/* Control Panel */}
      <div className="saas-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Basket Value:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1899, 2799, 4999, 6499].map(amt => (
              <button
                key={amt}
                onClick={() => setSimulatedAmount(amt)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: simulatedAmount === amt ? '1px solid #0284C7' : '1px solid var(--border-subtle)',
                  backgroundColor: simulatedAmount === amt ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                  color: simulatedAmount === amt ? '#38BDF8' : 'var(--text-muted)',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="btn-primary"
          style={{
            padding: '9px 18px',
            fontSize: '0.85rem'
          }}
        >
          {isSimulating ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              <span>Evaluating Policy & Formulating Action...</span>
            </>
          ) : (
            <>
              <Play size={15} />
              <span>Execute Failure Simulation</span>
            </>
          )}
        </button>
      </div>

      {/* Live Agent Output Inspector */}
      {lastIncident && (
        <div className="saas-card" style={{ padding: '20px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#34D399" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
                Autonomous Strategy Formulated & Policy Approved
              </h3>
            </div>
            <span className="badge badge-emerald">
              Status: {lastIncident.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-subtle)' }}>REVENUE AT RISK</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FB7185' }}>
                ₹{lastIncident.amountAtRisk.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-subtle)' }}>CLASSIFIED REASON</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {lastIncident.recoveryProposal?.detectedReason}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-subtle)' }}>STRATEGY</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38BDF8' }}>
                {lastIncident.recoveryProposal?.strategy}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-subtle)' }}>CONCESSION</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34D399' }}>
                {lastIncident.recoveryProposal?.concession?.discountValue
                  ? `₹${lastIncident.recoveryProposal.concession.discountValue} OFF`
                  : 'UPI Auto-Switch (₹0)'}
              </div>
            </div>
          </div>

          <div style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            fontSize: '0.775rem'
          }}>
            <span style={{ fontWeight: 600, color: '#38BDF8' }}>AGENT REASONING: </span>
            <span style={{ color: 'var(--text-main)' }}>"{lastIncident.recoveryProposal?.agentReasoning}"</span>
          </div>
        </div>
      )}
    </div>
  );
};
