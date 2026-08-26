import React, { useState } from 'react';
import { Product } from '../../../shared/types/commerce';
import { Star, ShoppingCart, Sparkles, Check, Package, Zap } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onAskAI: (product: Product) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onAddToCart,
  onAskAI
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const categories = ['All', 'Audio & Wearables', 'Travel & Bags', 'Workspace & Smart Home', 'Electronics & Power'];

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const handleAdd = (product: Product) => {
    onAddToCart(product);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Category Pills */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              border: selectedCategory === cat ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              backgroundColor: selectedCategory === cat ? 'rgba(0, 186, 242, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: selectedCategory === cat ? '#38BDF8' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {filteredProducts.map(product => {
          const isAdded = addedIds[product.id];

          return (
            <div
              key={product.id}
              className="glass-card glass-card-interactive"
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              {/* Product Image */}
              <div style={{
                position: 'relative',
                height: '190px',
                width: '100%',
                overflow: 'hidden',
                backgroundColor: 'rgba(0, 0, 0, 0.4)'
              }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />

                {/* Rating Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(7, 9, 19, 0.8)',
                  backdropFilter: 'blur(8px)',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#FBBF24'
                }}>
                  <Star size={12} fill="#FBBF24" />
                  <span>{product.rating}</span>
                  <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>({product.reviewCount})</span>
                </div>

                {/* Category Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(0, 186, 242, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0, 186, 242, 0.4)',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#38BDF8'
                }}>
                  {product.category}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  marginBottom: '6px',
                  lineHeight: '1.3'
                }}>
                  {product.name}
                </h3>

                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  lineHeight: '1.4',
                  marginBottom: '14px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {product.description}
                </p>

                {/* Features Pills */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '16px'
                }}>
                  {product.features.slice(0, 2).map((feat, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {feat}
                    </span>
                  ))}
                </div>

                {/* Price & Action Footer */}
                <div style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                      Price
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      ₹{product.price.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onAskAI(product)}
                      title="Ask AI Copilot about this product"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#A5B4FC',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Sparkles size={16} />
                    </button>

                    <button
                      onClick={() => handleAdd(product)}
                      className="btn-primary"
                      style={{
                        padding: '8px 14px',
                        fontSize: '0.85rem',
                        backgroundColor: isAdded ? '#10B981' : undefined
                      }}
                    >
                      {isAdded ? (
                        <>
                          <Check size={16} />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={16} />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
