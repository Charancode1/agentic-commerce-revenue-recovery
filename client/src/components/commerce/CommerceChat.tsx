import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Product } from '../../../shared/types/commerce';
import { api } from '../../services/api';
import { Send, Sparkles, Bot, User, ShoppingCart, ArrowRight, CornerDownLeft } from 'lucide-react';

interface CommerceChatProps {
  onAddToCart: (product: Product) => void;
  onRemoveFromCart?: (productId: string) => void;
  onProceedToCheckout: () => void;
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
}

export const CommerceChat: React.FC<CommerceChatProps> = ({
  onAddToCart,
  onRemoveFromCart,
  onProceedToCheckout,
  externalPrompt,
  onClearExternalPrompt
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'agent',
      text: "👋 Hi! I'm your **Agentic Commerce Assistant**. Tell me what you're looking for (e.g. *'Noise-cancelling headphones under ₹5,000'* or *'Best waterproof backpack for laptop'*) and I'll find the best options and prepare your Razorpay checkout!",
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

  const sendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ sender: m.sender, text: m.text }));
      const response = await api.chatWithAgent(messageText, history);
      setMessages(prev => [...prev, response]);

      // Automatically execute cart actions returned by the agent
      if (response.cartAction) {
        if (response.cartAction.type === 'remove_from_cart' && onRemoveFromCart) {
          onRemoveFromCart(response.cartAction.productId);
        }
      }
    } catch (e) {
      console.error('Chat send error:', e);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'agent',
          text: 'I ran into a temporary hiccup connecting to the agent core. You can browse the products directly in the catalog or try asking again!',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: any) => {
    if (action.action === 'quick_reply') {
      sendMessage(action.payload || action.label);
    } else if (action.action === 'add_to_cart') {
      if (action.payload) {
        onAddToCart(action.payload);
      }
    } else if (action.action === 'remove_from_cart') {
      const prodId = typeof action.payload === 'string' ? action.payload : action.payload?.id;
      if (prodId && onRemoveFromCart) {
        onRemoveFromCart(prodId);
      }
    } else if (action.action === 'checkout') {
      onProceedToCheckout();
    }
  };

  return (
    <div className="glass-card" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '620px',
      overflow: 'hidden',
      border: '1px solid rgba(0, 186, 242, 0.2)',
      boxShadow: 'var(--shadow-glow-cyan)'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        backgroundColor: 'rgba(12, 35, 64, 0.5)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00BAF2 0%, #6366F1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={18} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
              AI Shopping Copilot
            </div>
            <div style={{ fontSize: '0.7rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="live-dot" style={{ width: '6px', height: '6px' }} />
              Autonomous Intent & Catalog Agent
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div style={{
        flexGrow: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: '10px',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%'
            }}
          >
            {msg.sender !== 'user' && (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 186, 242, 0.2)',
                border: '1px solid rgba(0, 186, 242, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <Bot size={16} color="#38BDF8" />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Message Bubble */}
              <div style={{
                padding: '12px 16px',
                borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: msg.sender === 'user' ? '#00BAF2' : 'rgba(255, 255, 255, 0.05)',
                color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-main)',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
                whiteSpace: 'pre-line'
              }}>
                {msg.text}
              </div>

              {/* Recommended Product Cards */}
              {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {msg.recommendedProducts.map(prod => (
                    <div
                      key={prod.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(7, 9, 19, 0.6)',
                        border: '1px solid rgba(0, 186, 242, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <img
                        src={prod.image}
                        alt={prod.name}
                        style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                      />
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38BDF8' }}>
                          ₹{prod.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <button
                        onClick={() => onAddToCart(prod)}
                        className="btn-primary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px' }}
                      >
                        <ShoppingCart size={14} />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleActionClick(action)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(0, 186, 242, 0.1)',
                        border: '1px solid rgba(0, 186, 242, 0.25)',
                        color: '#38BDF8',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 186, 242, 0.2)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0, 186, 242, 0.1)'}
                    >
                      <span>{action.label}</span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <User size={16} color="#FFFFFF" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <div className="live-dot" style={{ width: '6px', height: '6px' }} />
            <span>Agent reasoning and scanning catalog...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage();
        }}
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(7, 9, 19, 0.7)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask for recommendations, specs, or instant checkout..."
          style={{
            flexGrow: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
            outline: 'none',
            fontFamily: 'inherit'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-cyan)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="btn-primary"
          style={{
            padding: '10px 14px',
            borderRadius: '12px',
            opacity: !input.trim() || isLoading ? 0.5 : 1,
            cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
