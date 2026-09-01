import React, { useState, useEffect } from 'react';
import { Product, CartItem } from '../../shared/types/commerce';
import { RecoveryIncident, ShopperRecoveryContext } from '../../shared/types/recovery';
import { api } from './services/api';
import { Header } from './components/common/Header';
import { ProductCatalog } from './components/commerce/ProductCatalog';
import { CommerceChat } from './components/commerce/CommerceChat';
import { CartDrawer } from './components/commerce/CartDrawer';
import { FailureSimulator } from './components/checkout/FailureSimulator';
import { RecoveryPromptModal } from './components/recovery/RecoveryPromptModal';
import { MerchantDashboard } from './components/dashboard/MerchantDashboard';

export const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeView, setActiveView] = useState<'shopper' | 'simulator' | 'merchant'>('merchant');
  const [activeRecoveryIncident, setActiveRecoveryIncident] = useState<RecoveryIncident | null>(null);
  const [shopperRecoveryContext, setShopperRecoveryContext] = useState<ShopperRecoveryContext | null>(null);
  const [chatPrompt, setChatPrompt] = useState<string>('');
  const [activeIncidentsCount, setActiveIncidentsCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'alert' } | null>(null);

  useEffect(() => {
    loadProducts();
    loadIncidentsCount();
    checkRecoveryCallback();

    // SSE Subscription for live Agent-to-Agent handoffs
    const unsubscribe = api.subscribeToLiveEvents({
      onRecovery: updatedRec => {
        loadIncidentsCount();

        // If recovery proposal is pending shopper consent, construct ShopperRecoveryContext
        if (updatedRec.status === 'CONSENT_PENDING' && updatedRec.recoveryProposal) {
          const proposal = updatedRec.recoveryProposal;
          const context: ShopperRecoveryContext = {
            incidentId: updatedRec.id,
            orderId: updatedRec.orderId,
            orderNumber: updatedRec.orderNumber,
            failureCategory: updatedRec.failureCategory,
            detectedReason: proposal.detectedReason,
            originalAmount: updatedRec.amountAtRisk,
            strategy: proposal.strategy,
            discountValue: proposal.concession?.discountValue || 0,
            finalPayableAmount: proposal.concession?.finalRecoveryAmount || updatedRec.amountAtRisk,
            reservationExpiry: proposal.expiryTimestamp,
            agentReasoning: proposal.agentReasoning,
            headline: proposal.headline
          };

          setShopperRecoveryContext(context);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkRecoveryCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refId = urlParams.get('ref') || urlParams.get('razorpay_payment_link_reference_id');
      const rzpPaymentId = urlParams.get('razorpay_payment_id') || undefined;
      const isSuccess = urlParams.get('recovery_success') === 'true' || urlParams.get('razorpay_payment_link_status') === 'paid';

      if (refId && isSuccess) {
        window.history.replaceState({}, document.title, window.location.pathname);

        const finalized = await api.completeRecoveryPayment(refId, rzpPaymentId);
        showToast(`🎉 ₹${finalized.recoveredAmount} recovered via Razorpay Smart Link!`, 'success');
        loadIncidentsCount();
      }
    } catch (e) {
      console.error('Failed to handle recovery callback URL:', e);
    }
  };

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
    setTimeout(() => setToastMessage(null), 4000);
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
    if (incident.recoveryProposal) {
      const proposal = incident.recoveryProposal;
      setShopperRecoveryContext({
        incidentId: incident.id,
        orderId: incident.orderId,
        orderNumber: incident.orderNumber,
        failureCategory: incident.failureCategory,
        detectedReason: proposal.detectedReason,
        originalAmount: incident.amountAtRisk,
        strategy: proposal.strategy,
        discountValue: proposal.concession?.discountValue || 0,
        finalPayableAmount: proposal.concession?.finalRecoveryAmount || incident.amountAtRisk,
        reservationExpiry: proposal.expiryTimestamp,
        agentReasoning: proposal.agentReasoning,
        headline: proposal.headline
      });
    }
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
          borderRadius: '8px',
          backgroundColor: toastMessage.type === 'success' ? '#059669' : '#0284C7',
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: '0.875rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
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
      <main style={{ flexGrow: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '20px' }}>
        {/* VIEW 1: MERCHANT CONTROL TOWER */}
        {activeView === 'merchant' && (
          <MerchantDashboard
            onSelectIncidentForOutreach={incident => {
              setActiveRecoveryIncident(incident);
            }}
          />
        )}

        {/* VIEW 2: SHOPPER STOREFRONT */}
        {activeView === 'shopper' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', alignItems: 'start' }}>
            {/* Left: Product Catalog */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Featured Catalog
                </h2>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Browse flagship products or consult the RAZORDEFENSE Shopping Copilot for suggestions.
                </p>
              </div>

              <ProductCatalog
                products={products}
                onAddToCart={handleAddToCart}
                onAskAI={handleAskAIAboutProduct}
              />
            </div>

            {/* Right: AI Shopping Copilot Chat */}
            <div style={{ position: 'sticky', top: '76px' }}>
              <CommerceChat
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveItem}
                onProceedToCheckout={() => setIsCartOpen(true)}
                externalPrompt={chatPrompt}
                onClearExternalPrompt={() => setChatPrompt('')}
                incomingRecoveryContext={shopperRecoveryContext}
                onOpenRecoveryModal={incident => setActiveRecoveryIncident(incident)}
              />
            </div>
          </div>
        )}

        {/* VIEW 3: FAILURE SIMULATOR */}
        {activeView === 'simulator' && (
          <FailureSimulator
            onIncidentCreated={incident => {
              setActiveRecoveryIncident(incident);
              if (incident.recoveryProposal) {
                const proposal = incident.recoveryProposal;
                setShopperRecoveryContext({
                  incidentId: incident.id,
                  orderId: incident.orderId,
                  orderNumber: incident.orderNumber,
                  failureCategory: incident.failureCategory,
                  detectedReason: proposal.detectedReason,
                  originalAmount: incident.amountAtRisk,
                  strategy: proposal.strategy,
                  discountValue: proposal.concession?.discountValue || 0,
                  finalPayableAmount: proposal.concession?.finalRecoveryAmount || incident.amountAtRisk,
                  reservationExpiry: proposal.expiryTimestamp,
                  agentReasoning: proposal.agentReasoning,
                  headline: proposal.headline
                });
              }
              loadIncidentsCount();
              showToast(`Failure injected! Recovery Agent context handed off to Shopper Copilot.`, 'alert');
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
