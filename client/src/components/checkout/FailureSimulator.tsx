import React, { useState } from 'react';
import { FailureCategory, RecoveryIncident } from '../../../shared/types/recovery';
import { api } from '../../services/api';
import { Terminal, AlertTriangle, ShieldCheck, Zap, ArrowRight, Play, RefreshCw, Smartphone, CreditCard, WifiOff, ShoppingCart } from 'lucide-react';

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
    color: string;
  }[] = [
    {
      category: 'BANK_OTP_TIMEOUT',
      title: 'Bank 2FA / OTP Delay Timeout',
      description: 'Customer did not receive bank OTP SMS within 120 seconds. Gateway flagged as timeout.',
      icon: Smartphone,
      expectedRecovery: 'Auto-switches to UPI Deep Link / 1-tap QR (Bypasses Bank SMS delays)',
      color: '#38BDF8'
    },
    {
      category: 'CARD_DECLINED_INSUFFICIENT_FUNDS',
      title: 'Card Limit Exceeded / Bank Decline',
      description: 'Issuing bank returned `CARD_LIMIT_REACHED`. Customer cannot complete full balance on card.',
      icon: CreditCard,
      expectedRecovery: 'Applies bounded 8% concession (₹400 max) + offers alternate payment methods',
      color: '#F43F5E'
    },
    {
      category: 'NETWORK_GATEWAY_DROPOUT',
      title: 'Network Gateway Interruption',
      description: 'WiFi/Cellular dropped while browser was redirecting to payment processing page.',
      icon: WifiOff,
      expectedRecovery: 'Generates dynamic Razorpay Smart Payment Link for instant 1-click resumption',
      color: '#F59E0B'
    },
    {
      category: 'CART_ABANDONMENT_AT_CHECKOUT',
      title: 'Checkout Drop-off / Cart Abandonment',
      description: 'Shopper clicked checkout, viewed price, but hesitated and closed checkout drawer.',
      icon: ShoppingCart,
      expectedRecovery: 'Triggers 20-minute Inventory Reservation badge + bounded incentive',
      color: '#10B981'
    }
  ];

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      // Create a simulated order first if needed, or pass directly
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

      // Simulate the chosen failure scenario
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
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-card" style={{
        padding: '24px',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(13, 18, 36, 0.8) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            padding: '8px',
            borderRadius: '10px',
            backgroundColor: 'rgba(244, 63, 94, 0.2)',
            color: '#FB7185'
          }}>
            <Terminal size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
              Payment Failure & Loss Simulation Sandbox
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Simulate real-world payment drop-offs, gateway errors, and bank timeouts to test the Autonomous Recovery Agent.
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Selector Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px'
      }}>
        {scenarios.map(sc => {
          const Icon = sc.icon;
          const isSelected = selectedScenario === sc.category;

          return (
            <div
              key={sc.category}
              onClick={() => setSelectedScenario(sc.category)}
              className="glass-card"
              style={{
                padding: '16px',
                cursor: 'pointer',
                border: isSelected ? `2px solid ${sc.color}` : '1px solid var(--border-subtle)',
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'var(--bg-card)',
                boxShadow: isSelected ? `0 0 16px ${sc.color}40` : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: `${sc.color}20`,
                  color: sc.color
                }}>
                  <Icon size={20} />
                </div>
                {isSelected && (
                  <span className="badge" style={{ backgroundColor: `${sc.color}25`, color: sc.color, border: `1px solid ${sc.color}50` }}>
                    Selected
                  </span>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>
                  {sc.title}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {sc.description}
                </p>
              </div>

              <div style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.7rem',
                color: 'var(--text-subtle)'
              }}>
                <span style={{ color: sc.color, fontWeight: 700 }}>Autonomous Action: </span>
                {sc.expectedRecovery}
              </div>
            </div>
          );
        })}
      </div>

      {/* Control Panel */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Simulated Basket Value:</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1899, 2799, 4999, 6499].map(amt => (
              <button
                key={amt}
                onClick={() => setSimulatedAmount(amt)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: simulatedAmount === amt ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  backgroundColor: simulatedAmount === amt ? 'rgba(0, 186, 242, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: simulatedAmount === amt ? '#38BDF8' : 'var(--text-muted)',
                  fontSize: '0.85rem',
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
            padding: '12px 24px',
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
            boxShadow: 'var(--shadow-glow-rose)'
          }}
        >
          {isSimulating ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>Simulating Failure & Agent Reasoning...</span>
            </>
          ) : (
            <>
              <Play size={18} />
              <span>Simulate Failure Scenario</span>
            </>
          )}
        </button>
      </div>

      {/* Live Agent Output Inspector */}
      {lastIncident && (
        <div className="glass-card" style={{
          padding: '24px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          backgroundColor: 'rgba(13, 18, 36, 0.9)',
          boxShadow: 'var(--shadow-glow-emerald)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={22} color="#34D399" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Autonomous Agent Response Generated
              </h3>
            </div>
            <span className="badge badge-emerald">
              Status: {lastIncident.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>REVENUE AT RISK</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FB7185' }}>
                ₹{lastIncident.amountAtRisk.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>CLASSIFIED ROOT CAUSE</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {lastIncident.recoveryProposal?.detectedReason}
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>BOUNDED STRATEGY</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38BDF8' }}>
                {lastIncident.recoveryProposal?.strategy}
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>CONCESSION APPLIED</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34D399' }}>
                {lastIncident.recoveryProposal?.concession?.discountValue
                  ? `₹${lastIncident.recoveryProposal.concession.discountValue} OFF`
                  : 'UPI Auto-Switch (₹0)'}
              </div>
            </div>
          </div>

          {/* AI Reasoning Log */}
          <div style={{
            padding: '14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(0, 186, 242, 0.08)',
            border: '1px solid rgba(0, 186, 242, 0.2)',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', marginBottom: '4px' }}>
              🧠 AGENT REASONING ENGINE:
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
              "{lastIncident.recoveryProposal?.agentReasoning}"
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
              Switch to <strong>Shopper Storefront</strong> or <strong>Merchant Control Tower</strong> to interact with this recovery.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
