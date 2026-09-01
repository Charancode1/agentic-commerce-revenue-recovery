import React, { useState } from 'react';
import { Product } from '../../../shared/types/commerce';
import { Star, ShoppingCart, Sparkles, Check } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Category Pills */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: selectedCategory === cat ? '1px solid #0284C7' : '1px solid var(--border-subtle)',
              backgroundColor: selectedCategory === cat ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-card)',
              color: selectedCategory === cat ? '#38BDF8' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px'
      }}>
        {filteredProducts.map(product => {
          const isAdded = addedIds[product.id];

          return (
            <div
              key={product.id}
              className="saas-card"
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Product Image */}
              <div style={{
                position: 'relative',
                height: '170px',
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
                    objectFit: 'cover'
                  }}
                />

                {/* Rating Badge */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  backgroundColor: 'rgba(11, 15, 23, 0.85)',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  color: '#FBBF24'
                }}>
                  <Star size={11} fill="#FBBF24" />
                  <span>{product.rating}</span>
                </div>

                {/* Category Badge */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: 'rgba(11, 15, 23, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  fontSize: '0.675rem',
                  fontWeight: 500,
                  color: 'var(--text-muted)'
                }}>
                  {product.category}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{
                  fontSize: '0.925rem',
                  fontWeight: 600,
                  marginBottom: '4px',
                  lineHeight: '1.3',
                  color: 'var(--text-main)'
                }}>
                  {product.name}
                </h3>

                <p style={{
                  fontSize: '0.775rem',
                  color: 'var(--text-muted)',
                  lineHeight: '1.35',
                  marginBottom: '12px',
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
                  gap: '4px',
                  marginBottom: '14px'
                }}>
                  {product.features.slice(0, 2).map((feat, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.675rem',
                        color: 'var(--text-subtle)'
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
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                      Price
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{product.price.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => onAskAI(product)}
                      title="Ask AI Assistant about this item"
                      style={{
                        padding: '7px 9px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(79, 70, 229, 0.12)',
                        border: '1px solid rgba(79, 70, 229, 0.25)',
                        color: '#A5B4FC',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Sparkles size={14} />
                    </button>

                    <button
                      onClick={() => handleAdd(product)}
                      className="btn-primary"
                      style={{
                        padding: '7px 12px',
                        fontSize: '0.8rem',
                        backgroundColor: isAdded ? '#059669' : undefined
                      }}
                    >
                      {isAdded ? (
                        <>
                          <Check size={14} />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={14} />
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
