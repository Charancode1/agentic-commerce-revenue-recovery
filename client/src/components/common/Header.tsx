import React from 'react';
import { ShoppingBag, ShieldCheck, Cpu, Activity, Store, Sparkles, Terminal } from 'lucide-react';

interface HeaderProps {
  activeView: 'shopper' | 'simulator' | 'merchant';
  setActiveView: (view: 'shopper' | 'simulator' | 'merchant') => void;
  cartCount: number;
  onOpenCart: () => void;
  activeIncidentsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  cartCount,
  onOpenCart,
  activeIncidentsCount
}) => {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(7, 9, 19, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '14px 24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00BAF2 0%, #0C2340 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-cyan)'
          }}>
            <Cpu size={24} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                <span className="gradient-text-cyan">Agentic</span> Commerce
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                Razorpay Buildathon
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              AI Growth & Autonomous Bounded Revenue Recovery
            </p>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveView('shopper')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              transition: 'all 0.2s ease',
              backgroundColor: activeView === 'shopper' ? 'rgba(0, 186, 242, 0.15)' : 'transparent',
              color: activeView === 'shopper' ? '#38BDF8' : 'var(--text-muted)'
            }}
          >
            <Store size={16} />
            <span>Shopper Storefront</span>
          </button>

          <button
            onClick={() => setActiveView('simulator')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              transition: 'all 0.2s ease',
              backgroundColor: activeView === 'simulator' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
              color: activeView === 'simulator' ? '#FB7185' : 'var(--text-muted)'
            }}
          >
            <Terminal size={16} />
            <span>Failure Simulator</span>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#FB7185'
            }} />
          </button>

          <button
            onClick={() => setActiveView('merchant')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              transition: 'all 0.2s ease',
              backgroundColor: activeView === 'merchant' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeView === 'merchant' ? '#34D399' : 'var(--text-muted)'
            }}
          >
            <ShieldCheck size={16} />
            <span>Merchant Control Tower</span>
            {activeIncidentsCount > 0 && (
              <span className="badge badge-rose" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                {activeIncidentsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Status & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div className="live-dot" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34D399' }}>
              Razorpay Test Mode
            </span>
          </div>

          <button
            onClick={onOpenCart}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.875rem', position: 'relative' }}
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: 'var(--accent-rose)',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(244, 63, 94, 0.5)'
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
