import React from 'react';
import { ShoppingBag, ShieldCheck, Shield, Store, Terminal } from 'lucide-react';

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
      backgroundColor: '#0B0F17',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '12px 24px'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#0284C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <Shield size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#F1F5F9' }}>
                RAZOR<span style={{ color: '#0284C7' }}>DEFENSE</span>
              </h1>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', margin: 0, fontWeight: 500 }}>
              Autonomous Revenue Defense Platform
            </p>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#161F30',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          gap: '2px'
        }}>
          <button
            onClick={() => setActiveView('merchant')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.825rem',
              transition: 'all 0.15s ease',
              backgroundColor: activeView === 'merchant' ? '#0284C7' : 'transparent',
              color: activeView === 'merchant' ? '#FFFFFF' : 'var(--text-muted)'
            }}
          >
            <ShieldCheck size={15} />
            <span>Merchant Control Tower</span>
            {activeIncidentsCount > 0 && (
              <span className="badge badge-rose" style={{ padding: '1px 5px', fontSize: '0.65rem' }}>
                {activeIncidentsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('shopper')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.825rem',
              transition: 'all 0.15s ease',
              backgroundColor: activeView === 'shopper' ? '#0284C7' : 'transparent',
              color: activeView === 'shopper' ? '#FFFFFF' : 'var(--text-muted)'
            }}
          >
            <Store size={15} />
            <span>Shopper Storefront</span>
          </button>

          <button
            onClick={() => setActiveView('simulator')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.825rem',
              transition: 'all 0.15s ease',
              backgroundColor: activeView === 'simulator' ? '#0284C7' : 'transparent',
              color: activeView === 'simulator' ? '#FFFFFF' : 'var(--text-muted)'
            }}
          >
            <Terminal size={15} />
            <span>Failure Simulator</span>
          </button>
        </nav>

        {/* Right Status & Cart Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div className="live-dot" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#34D399' }}>
              Razorpay Test Mode
            </span>
          </div>

          <button
            onClick={onOpenCart}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.825rem', position: 'relative' }}
          >
            <ShoppingBag size={16} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#F43F5E',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700
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
