import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Product } from '../../../shared/types/commerce';
import { api } from '../../services/api';
import { Send, Bot, User, ShoppingCart, ArrowRight, Sparkles } from 'lucide-react';

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
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.sender === 'user' || m.sender === 'agent')
        .map(m => ({ sender: m.sender, text: m.text }));

      const response = await api.chatWithAgent(messageText, history);
      setMessages(prev => [...prev, response]);
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
              Grounded AI Catalog & Checkout Assistant
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
                color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-main)',
                fontSize: '0.8rem',
                lineHeight: '1.4'
              }}>
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
                {msg.recommendedProducts.map(p => (
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
                    <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.775rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8' }}>₹{p.price.toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      onClick={() => onAddToCart(p)}
                      className="btn-primary"
                      style={{ padding: '5px 10px', fontSize: '0.725rem' }}
                    >
                      <span>+ Cart</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Suggested Action Chips */}
            {msg.suggestedActions && msg.suggestedActions.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '4px',
                paddingLeft: '32px'
              }}>
                {msg.suggestedActions.map((sa, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (sa.action === 'checkout') onProceedToCheckout();
                      else if (sa.payload) sendMessage(sa.payload);
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
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.775rem', paddingLeft: '32px' }}>
            <Sparkles size={14} className="animate-spin" style={{ color: '#0284C7' }} />
            <span>Searching catalog & reasoning recommendations...</span>
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
