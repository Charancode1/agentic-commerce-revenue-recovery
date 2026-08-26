import React, { useState, useEffect } from 'react';
import { Product, CartItem } from '../../shared/types/commerce';
import { RecoveryIncident } from '../../shared/types/recovery';
import { api } from './services/api';
import { Header } from './components/common/Header';
import { ProductCatalog } from './components/commerce/ProductCatalog';
import { CommerceChat } from './components/commerce/CommerceChat';
import { CartDrawer } from './components/commerce/CartDrawer';
import { FailureSimulator } from './components/checkout/FailureSimulator';
import { RecoveryPromptModal } from './components/recovery/RecoveryPromptModal';
import { MerchantDashboard } from './components/dashboard/MerchantDashboard';
import { Sparkles, ShieldAlert, ShoppingBag, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeView, setActiveView] = useState<'shopper' | 'simulator' | 'merchant'>('shopper');
  const [activeRecoveryIncident, setActiveRecoveryIncident] = useState<RecoveryIncident | null>(null);
  const [chatPrompt, setChatPrompt] = useState<string>('');
  const [activeIncidentsCount, setActiveIncidentsCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'alert' } | null>(null);

  useEffect(() => {
    loadProducts();
    loadIncidentsCount();
  }, []);

  const loadProducts = async () => {
    try {
      const prods = await api.getProducts();
      setProducts(prods);
    } catch (e) {
      console.error('Failed to load products:', e);
    }
  };

  const loadIncidentsCount = async () => {
    try {
      const recs = await api.getActiveRecoveries();
      const pending = recs.filter(r => r.status === 'CONSENT_PENDING' || r.status === 'EXECUTED');
      setActiveIncidentsCount(pending.length);
    } catch (e) {
      console.error('Failed to load active recoveries count:', e);
    }
  };

  const showToast = (text: string, type: 'success' | 'alert' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, product, quantity: 1, selectedPrice: product.price }];
    });
    showToast(`Added "${product.name}" to cart!`);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleAskAIAboutProduct = (product: Product) => {
    setChatPrompt(`Tell me more about ${product.name}. What are the key specs and why should I buy it?`);
  };

  const handlePaymentSuccess = (order: any) => {
    setCart([]);
    showToast(`🎉 Order #${order.orderNumber} placed successfully with Razorpay!`, 'success');
  };

  const handlePaymentFailure = (incident: RecoveryIncident) => {
    setActiveRecoveryIncident(incident);
    loadIncidentsCount();
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '12px',
          backgroundColor: toastMessage.type === 'success' ? '#10B981' : '#F43F5E',
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: '0.9rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage.text}
        </div>
      )}

      {/* Main Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeIncidentsCount={activeIncidentsCount}
      />

      {/* Main Body Content */}
      <main style={{ flexGrow: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '24px' }}>
        {/* VIEW 1: SHOPPER STOREFRONT */}
        {activeView === 'shopper' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
            {/* Left: Product Catalog */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                    Featured Catalog
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Select items or speak with the AI Shopping Assistant for personalized suggestions
                  </p>
                </div>
              </div>

              <ProductCatalog
                products={products}
                onAddToCart={handleAddToCart}
                onAskAI={handleAskAIAboutProduct}
              />
            </div>

            {/* Right: AI Shopping Copilot Chat */}
            <div style={{ position: 'sticky', top: '90px' }}>
              <CommerceChat
                onAddToCart={handleAddToCart}
                onProceedToCheckout={() => setIsCartOpen(true)}
                externalPrompt={chatPrompt}
                onClearExternalPrompt={() => setChatPrompt('')}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: FAILURE SIMULATOR */}
        {activeView === 'simulator' && (
          <FailureSimulator
            onIncidentCreated={incident => {
              setActiveRecoveryIncident(incident);
              loadIncidentsCount();
              showToast(`Simulated ${incident.failureCategory}. Bounded Recovery Proposal Generated!`, 'alert');
            }}
          />
        )}

        {/* VIEW 3: MERCHANT CONTROL TOWER */}
        {activeView === 'merchant' && (
          <MerchantDashboard
            onSelectIncidentForOutreach={incident => {
              setActiveRecoveryIncident(incident);
            }}
          />
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailureTriggered={handlePaymentFailure}
      />

      {/* Recovery Prompt Modal */}
      <RecoveryPromptModal
        incident={activeRecoveryIncident}
        onClose={() => setActiveRecoveryIncident(null)}
        onRecoveryCompleted={finalized => {
          showToast(`🎉 ₹${finalized.recoveredAmount} recovered via Razorpay Smart Link!`, 'success');
          loadIncidentsCount();
        }}
      />
    </div>
  );
};
