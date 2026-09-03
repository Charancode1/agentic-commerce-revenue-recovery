import React from 'react';
import {
  Shield,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Bot,
  Sliders,
  CheckCircle2,
  Terminal,
  Store
} from 'lucide-react';
import { AgenticDefenseVisual } from './AgenticDefenseVisual';

interface LandingPageProps {
  onEnterApp: (view?: 'shopper' | 'merchant' | 'simulator') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B0F17',
      color: '#F1F5F9',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Navbar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(11, 15, 23, 0.88)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '10px 24px'
      }}>
        <div style={{
          maxWidth: '1300px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {/* Logo & Tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              <div style={{
                width: '175px',
                height: '34px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src="/images/Razordefense logo.png"
                  alt="RAZORDEFENSE"
                  style={{
                    width: '175px',
                    height: '175px',
                    objectFit: 'contain',
                    flexShrink: 0
                  }}
                />
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', margin: '1px 0 0 0', fontWeight: 500 }}>
                Autonomous Revenue Defense Platform
              </p>
            </div>
          </div>

          {/* Quick Nav Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => onEnterApp('merchant')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(22, 31, 48, 0.7)',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#F1F5F9';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <ShieldCheck size={15} color="#0284C7" />
              <span>Merchant Tower</span>
            </button>

            <button
              onClick={() => onEnterApp('simulator')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(22, 31, 48, 0.7)',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#F1F5F9';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <Terminal size={15} color="#A78BFA" />
              <span>Failure Simulator</span>
            </button>

            <button
              onClick={() => onEnterApp('shopper')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(2, 132, 199, 0.35)',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#0369A1';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#0284C7';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>Enter RAZORDEFENSE</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1250px',
        margin: '0 auto',
        padding: '24px 24px 16px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Glow backdrop */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '650px',
          height: '260px',
          background: 'radial-gradient(ellipse at center, rgba(2, 132, 199, 0.12) 0%, rgba(11, 15, 23, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Main Headline */}
        <h1 style={{
          fontSize: 'clamp(1.9rem, 3.2vw, 2.6rem)',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          maxWidth: '850px',
          marginBottom: '8px',
          zIndex: 1,
          background: 'linear-gradient(180deg, #FFFFFF 20%, #94A3B8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Autonomous Revenue Defense
        </h1>

        {/* Supporting Message */}
        <p style={{
          fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
          color: 'var(--text-muted)',
          maxWidth: '680px',
          lineHeight: 1.45,
          marginBottom: '16px',
          fontWeight: 400,
          zIndex: 1
        }}>
          Detect payment failures. Recover at-risk revenue. Let intelligent agents act within defined policy.
        </p>

        {/* Primary CTA Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '18px',
          zIndex: 1
        }}>
          <button
            onClick={() => onEnterApp('shopper')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(2, 132, 199, 0.4)',
              transition: 'all var(--transition-smooth)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#0369A1';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 0 28px rgba(2, 132, 199, 0.55)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#0284C7';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(2, 132, 199, 0.4)';
            }}
          >
            <span>Enter RAZORDEFENSE</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => onEnterApp('merchant')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'rgba(22, 31, 48, 0.8)',
              color: '#F1F5F9',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-smooth)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
              e.currentTarget.style.borderColor = '#0284C7';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(22, 31, 48, 0.8)';
              e.currentTarget.style.borderColor = 'var(--border-strong)';
            }}
          >
            <ShieldCheck size={16} color="#0284C7" />
            <span>Merchant Control Tower</span>
          </button>
        </div>

        {/* Animated Visual Component */}
        <div style={{ width: '100%', maxWidth: '1150px', zIndex: 1 }}>
          <AgenticDefenseVisual />
        </div>
      </section>

      {/* Subtle Animated Flow Sequence */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px 24px 50px',
        width: '100%'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#38BDF8'
          }}>
            Autonomous Defense Pipeline
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          alignItems: 'stretch'
        }}>
          {/* Step 1: Payment Failure */}
          <div className="saas-card" style={{ padding: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--accent-rose-bg)', color: '#FB7185' }}>
                <AlertTriangle size={15} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FB7185', textTransform: 'uppercase' }}>01 / Intercept</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Payment Failure</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Card limits, 2FA drops, or network timeouts trigger immediate incident capture.
            </p>
          </div>

          {/* Step 2: AI Reasoning */}
          <div className="saas-card" style={{ padding: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(167, 139, 250, 0.15)', color: '#A78BFA' }}>
                <Bot size={15} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase' }}>02 / Reason</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>AI Reasoning</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Gemini agent inspects error codes and formulates tailored recovery actions.
            </p>
          </div>

          {/* Step 3: Policy Guardrails */}
          <div className="saas-card" style={{ padding: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}>
                <Sliders size={15} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase' }}>03 / Guard</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Policy Guardrails</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Deterministic bounds enforce concessions (capped ≤ 12% / ₹500 max).
            </p>
          </div>

          {/* Step 4: Customer Consent */}
          <div className="saas-card" style={{ padding: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--accent-amber-bg)', color: '#FBBF24' }}>
                <CheckCircle2 size={15} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase' }}>04 / Consent</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Customer Consent</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Shopper copilot presents transparent terms; customer explicitly accepts or opts out.
            </p>
          </div>

          {/* Step 5: Recovery */}
          <div className="saas-card" style={{ padding: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'var(--accent-emerald-bg)', color: '#34D399' }}>
                <TrendingUp size={15} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase' }}>05 / Recover</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Razorpay Execution</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Smart Payment Link completes payment; revenue moves to Recovered in Control Tower.
            </p>
          </div>
        </div>
      </section>

      {/* Product Pillars Grid (Detect, Reason, Defend, Recover) */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '30px 24px 70px',
        width: '100%'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '36px'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '8px' }}>
            Engineered for High-Frequency Revenue Defense
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Four purpose-built pillars ensuring autonomous operations remain safe, bounded, and verified.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px'
        }}>
          {/* Card 1: Detect */}
          <div className="saas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(2, 132, 199, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
              marginBottom: '4px'
            }}>
              <AlertTriangle size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Detect</h3>
            <p style={{ fontSize: '0.85rem', color: '#38BDF8', fontWeight: 600 }}>
              "Identify failed payments and revenue at risk."
            </p>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Real-time telemetry intercepts checkout failures before customers abandon their carts, tracking active exposure at the exact transaction level.
            </p>
          </div>

          {/* Card 2: Reason */}
          <div className="saas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(167, 139, 250, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A78BFA',
              marginBottom: '4px'
            }}>
              <Bot size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Reason</h3>
            <p style={{ fontSize: '0.85rem', color: '#A78BFA', fontWeight: 600 }}>
              "AI agents analyze the failure and formulate a recovery strategy."
            </p>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Autonomous Gemini reasoning assesses failure codes and buyer history to generate appropriate recovery proposals without human latency.
            </p>
          </div>

          {/* Card 3: Defend */}
          <div className="saas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399',
              marginBottom: '4px'
            }}>
              <ShieldCheck size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Defend</h3>
            <p style={{ fontSize: '0.85rem', color: '#34D399', fontWeight: 600 }}>
              "Policy guardrails bound every financial action."
            </p>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Deterministic Policy Engine strictly enforces merchant margins, capping concessions at 12% / ₹500 maximum. Agents cannot exceed financial guardrails.
            </p>
          </div>

          {/* Card 4: Recover */}
          <div className="saas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBBF24',
              marginBottom: '4px'
            }}>
              <Zap size={20} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Recover</h3>
            <p style={{ fontSize: '0.85rem', color: '#FBBF24', fontWeight: 600 }}>
              "Customers can consent and complete recovery through Razorpay."
            </p>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Instant Razorpay Test Mode Smart Links allow customers to switch to UPI or split payments effortlessly, recorded directly in the SHA-256 audit log.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section style={{
        backgroundColor: 'rgba(17, 24, 39, 0.75)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '50px 24px',
        textAlign: 'center',
        marginTop: 'auto'
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>
            Experience Autonomous Revenue Recovery
          </h2>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Simulate payment failures, watch Gemini formulate bounded recovery strategies, and observe real-time defense in Merchant Control Tower.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onEnterApp('shopper')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(2, 132, 199, 0.4)',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#0369A1';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#0284C7';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>Enter RAZORDEFENSE →</span>
            </button>

            <button
              onClick={() => onEnterApp('simulator')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0284C7';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
            >
              <Terminal size={16} />
              <span>Launch Simulator</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
