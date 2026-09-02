import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Product } from '../../../shared/types/commerce';
import { RecoveryIncident, ShopperRecoveryContext } from '../../../shared/types/recovery';
import { api } from '../../services/api';
import { Send, Bot, User, ShoppingCart, ShieldCheck, ExternalLink, Zap, CheckCircle, Sparkles } from 'lucide-react';

interface CommerceChatProps {
  onAddToCart: (product: Product) => void;
  onRemoveFromCart?: (productId: string) => void;
  onProceedToCheckout: () => void;
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
  incomingRecoveryContext?: ShopperRecoveryContext | null;
  onOpenRecoveryModal?: (incident: RecoveryIncident) => void;
}

export const CommerceChat: React.FC<CommerceChatProps> = ({
  onAddToCart,
  onRemoveFromCart,
  onProceedToCheckout,
  externalPrompt,
  onClearExternalPrompt,
  incomingRecoveryContext,
  onOpenRecoveryModal
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'agent',
      text: "👋 Welcome to **RAZORDEFENSE Store**! Tell me what you're looking for (e.g. *'Noise-cancelling headphones under ₹5,000'* or *'Best waterproof backpack'*) and I'll recommend items and assist with checkout!",
      timestamp: new Date().toISOString(),
      suggestedActions: [
        { label: '🎧 Audio Under ₹5,000', action: 'quick_reply', payload: 'Show headphones under 5000' },
        { label: '🎒 Travel Backpacks', action: 'quick_reply', payload: 'Show waterproof backpack' },
        { label: '⚡ 100W GaN Charger', action: 'quick_reply', payload: 'Tell me about fast chargers' }
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingIncidentId, setProcessingIncidentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (externalPrompt) {
      sendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  // Listen for incoming recovery context from Merchant Agent handoff
  useEffect(() => {
    if (incomingRecoveryContext) {
      const processContextHandoff = async () => {
        setIsLoading(true);
        try {
          const recoveryMsg = await api.getRecoveryMessage(incomingRecoveryContext);
          if (!recoveryMsg || !recoveryMsg.id) return;
          setMessages(prev => {
            if (prev.some(m => m.id === recoveryMsg.id || (m.suggestedActions && m.suggestedActions.some((sa: any) => sa.payload === incomingRecoveryContext.incidentId)))) {
              return prev;
            }
            return [...prev, recoveryMsg];
          });
        } catch (e) {
          console.error('Error receiving recovery context handoff:', e);
        } finally {
          setIsLoading(false);
        }
      };
      processContextHandoff();
    }
  }, [incomingRecoveryContext]);

  const handleConfirmRecovery = async (incidentId: string) => {
    setProcessingIncidentId(incidentId);
    try {
      const updatedIncident = await api.confirmRecovery(incidentId, true);
      const linkUrl = updatedIncident.recoveryProposal?.razorpayPaymentLinkUrl;

      setMessages(prev => [
        ...prev,
        {
          id: `msg_accepted_${Date.now()}`,
          sender: 'agent',
          text: `✅ **Customer Consent Confirmed!** Razorpay Smart Recovery Link created for Order #${updatedIncident.orderNumber}.`,
          timestamp: new Date().toISOString(),
          suggestedActions: [
            {
              label: '🔗 Open Razorpay Recovery Link',
              action: 'open_url' as any,
              payload: linkUrl || '#'
            },
            {
              label: '⚡ Open Recovery Modal',
              action: 'open_modal' as any,
              payload: updatedIncident
            }
          ]
        }
      ]);

      if (onOpenRecoveryModal) {
        onOpenRecoveryModal(updatedIncident);
      }
    } catch (e) {
      console.error('Error confirming recovery:', e);
    } finally {
      setProcessingIncidentId(null);
    }
  };

  const handleDeclineRecovery = async (incidentId: string) => {
    setProcessingIncidentId(incidentId);
    try {
      await api.confirmRecovery(incidentId, false, 'Shopper declined offer in chat');
      setMessages(prev => [
        ...prev,
        {
          id: `msg_declined_${Date.now()}`,
          sender: 'agent',
          text: `Offer declined. Your order status has been updated to opted out. Let me know if you would like to explore other products!`,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (e) {
      console.error('Error declining recovery:', e);
    } finally {
      setProcessingIncidentId(null);
    }
  };

  const sendMessage = async (textToSend?: string | any) => {
    const messageText = (typeof textToSend === 'string' ? textToSend : input).trim();
    if (!messageText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.sender === 'user' || m.sender === 'agent')
        .map(m => ({ sender: m.sender, text: m.text }));

      const response = await api.chatWithAgent(messageText, history);
      setMessages(prev => [...prev, response]);

      if (response && response.cartAction) {
        if (response.cartAction.type === 'add_to_cart') {
          const toAdd = response.recommendedProducts?.find(p => p && p.id === response.cartAction?.productId);
          if (toAdd) onAddToCart(toAdd);
        } else if (response.cartAction.type === 'remove_from_cart' && onRemoveFromCart) {
          onRemoveFromCart(response.cartAction.productId);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'agent',
          text: "I encountered a minor connection issue searching the catalog. Please try again!",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="saas-card" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '580px',
      overflow: 'hidden'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            color: '#38BDF8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
              RAZORDEFENSE Shopping Copilot
            </h3>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
              Grounded AI Catalog & Autonomous Recovery Sentinel
            </div>
          </div>
        </div>

        <button
          onClick={onProceedToCheckout}
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
        >
          <ShoppingCart size={13} />
          <span>Checkout</span>
        </button>
      </div>

      {/* Messages List */}
      <div style={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              gap: '6px'
            }}
          >
            <div style={{
              display: 'flex',
              gap: '8px',
              maxWidth: '90%',
              flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: msg.sender === 'user' ? '#0284C7' : '#1F293D',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '0.7rem'
              }}>
                {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>

              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: msg.sender === 'user' ? '#0284C7' : '#1F293D',
                border: msg.id.startsWith('msg_recovery_') ? '1px solid rgba(2, 132, 199, 0.4)' : 'none',
                color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-main)',
                fontSize: '0.8rem',
                lineHeight: '1.4'
              }}>
                {msg.id.startsWith('msg_recovery_') && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#38BDF8',
                    fontWeight: 700,
                    fontSize: '0.725rem',
                    marginBottom: '6px'
                  }}>
                    <ShieldCheck size={14} />
                    <span>PAYMENT RECOVERY INTERVENTION</span>
                  </div>
                )}
                {msg.text}
              </div>
            </div>

            {/* Recommended Products */}
            {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                marginTop: '4px',
                paddingLeft: '32px'
              }}>
                {msg.recommendedProducts.filter(p => Boolean(p && p.id)).map(p => {
                  const priceDisplay = typeof p.price === 'number'
                    ? `₹${p.price.toLocaleString('en-IN')}`
                    : (p.price ? `₹${p.price}` : '');
                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name || 'Product'} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#1F293D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShoppingCart size={16} />
                        </div>
                      )}
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.775rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name || 'Product'}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8' }}>
                          {priceDisplay}
                        </div>
                      </div>
                      <button
                        onClick={() => onAddToCart(p)}
                        className="btn-primary"
                        style={{ padding: '5px 10px', fontSize: '0.725rem' }}
                      >
                        <span>+ Cart</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Suggested Action Chips & Recovery Action Buttons */}
            {msg.suggestedActions && msg.suggestedActions.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '4px',
                paddingLeft: '32px'
              }}>
                {msg.suggestedActions.map((sa, idx) => {
                  if (sa.action === ('confirm_recovery' as any)) {
                    return (
                      <button
                        key={idx}
                        onClick={() => handleConfirmRecovery(sa.payload)}
                        disabled={processingIncidentId === sa.payload}
                        className="btn-primary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          backgroundColor: '#059669'
                        }}
                      >
                        <Zap size={13} />
                        <span>{sa.label}</span>
                      </button>
                    );
                  }
                  if (sa.action === ('decline_recovery' as any)) {
                    return (
                      <button
                        key={idx}
                        onClick={() => handleDeclineRecovery(sa.payload)}
                        disabled={processingIncidentId === sa.payload}
                        className="btn-secondary"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.725rem'
                        }}
                      >
                        <span>{sa.label}</span>
                      </button>
                    );
                  }
                  if (sa.action === ('open_url' as any)) {
                    return (
                      <a
                        key={idx}
                        href={sa.payload}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          textDecoration: 'none',
                          backgroundColor: '#0284C7'
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>{sa.label}</span>
                      </a>
                    );
                  }
                  if (sa.action === ('open_modal' as any) && onOpenRecoveryModal) {
                    return (
                      <button
                        key={idx}
                        onClick={() => onOpenRecoveryModal(sa.payload)}
                        className="btn-secondary"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.725rem'
                        }}
                      >
                        <span>{sa.label}</span>
                      </button>
                    );
                  }

                  if (sa.action === ('add_to_cart' as any)) {
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (typeof sa.payload === 'object' && sa.payload !== null && (sa.payload as any).id) {
                            onAddToCart(sa.payload as Product);
                          } else if (typeof sa.payload === 'string') {
                            const matched = msg.recommendedProducts?.find(p => p && p.id === sa.payload);
                            if (matched) onAddToCart(matched);
                          } else if (msg.recommendedProducts && msg.recommendedProducts.length > 0) {
                            onAddToCart(msg.recommendedProducts[0]);
                          }
                        }}
                        className="btn-primary"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.725rem',
                          backgroundColor: '#0284C7'
                        }}
                      >
                        <ShoppingCart size={12} />
                        <span>{sa.label}</span>
                      </button>
                    );
                  }

                  if (sa.action === ('remove_from_cart' as any)) {
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          const prodId = typeof sa.payload === 'object' && sa.payload !== null
                            ? (sa.payload as any).id
                            : sa.payload;
                          if (prodId && onRemoveFromCart) {
                            onRemoveFromCart(prodId);
                          }
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.725rem'
                        }}
                      >
                        <span>{sa.label}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (sa.action === 'checkout') onProceedToCheckout();
                        else if (typeof sa.payload === 'string') sendMessage(sa.payload);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        color: 'var(--text-muted)',
                        fontSize: '0.725rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      {sa.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.775rem', paddingLeft: '32px' }}>
            <Sparkles size={14} className="animate-spin" style={{ color: '#0284C7' }} />
            <span>Processing agent context & formatting message...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: '#111827',
        display: 'flex',
        gap: '8px'
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask for products, features, or prices..."
          style={{
            flexGrow: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            fontSize: '0.8rem'
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          className="btn-primary"
          style={{ padding: '8px 12px' }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};
