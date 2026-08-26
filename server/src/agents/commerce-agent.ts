import { db } from '../db/db';
import { Product, ChatMessage } from '../../../shared/types/commerce';
import { auditLogger } from '../db/audit-logger';
import { ENV } from '../config/env';

export class CommerceAgent {
  public static async processMessage(
    userMessage: string,
    history: { sender: string; text: string }[] = []
  ): Promise<ChatMessage> {
    const products = db.getProducts();
    const query = userMessage.toLowerCase().trim();

    // Log the user interaction in the audit trail
    auditLogger.record({
      actor: 'CUSTOMER',
      action: 'PRODUCT_SEARCH',
      summary: `Shopper query: "${userMessage.substring(0, 80)}"`,
      metadata: { query: userMessage }
    });

    // Check for direct keywords and price constraints
    const matchedProducts = this.searchCatalog(query, products);

    let responseText = '';
    let suggestedActions: ChatMessage['suggestedActions'] = [];
    let recommendedProducts: Product[] = [];

    if (query.includes('cart') || query.includes('bag') || query.includes('order')) {
      responseText = `I can help you review your items or proceed straight to a secure Razorpay checkout. What would you like to add or adjust?`;
      suggestedActions = [
        { label: '🛍️ View Products', action: 'quick_reply', payload: 'Show me all products' },
        { label: '💳 Go to Checkout', action: 'checkout' }
      ];
    } else if (matchedProducts.length > 0) {
      recommendedProducts = matchedProducts.slice(0, 3);
      const topProd = matchedProducts[0];
      responseText = `I found **${matchedProducts.length}** great match${matchedProducts.length > 1 ? 'es' : ''} for you! Our top recommendation is the **${topProd.name}** at ₹${topProd.price.toLocaleString('en-IN')}.\n\nWould you like me to add it to your cart or compare other options?`;

      suggestedActions = [
        { label: `🛒 Add ${topProd.name.split(' ')[0]} (₹${topProd.price})`, action: 'add_to_cart', payload: topProd },
        { label: '💳 Instant Checkout', action: 'checkout' },
        { label: '✨ Compare Features', action: 'quick_reply', payload: 'Tell me key features' }
      ];
    } else if (query.includes('discount') || query.includes('offer') || query.includes('coupon')) {
      responseText = `We have instant bundle offers and special seasonal concessions at checkout. Add any product to your cart, and I'll ensure you get the best verified rate!`;
      suggestedActions = [
        { label: '🎧 Audio & Headphones', action: 'quick_reply', payload: 'Show audio' },
        { label: '🎒 Travel Backpacks', action: 'quick_reply', payload: 'Show backpacks' },
        { label: '⚡ Fast Chargers', action: 'quick_reply', payload: 'Show chargers' }
      ];
    } else {
      // Default conversational overview
      recommendedProducts = products.slice(0, 3);
      responseText = `Hello! I'm your AI Commerce Assistant. I can help you discover products, compare specs, check stock, and set up your Razorpay checkout in seconds.\n\nHere are some of our trending customer favorites:`;
      suggestedActions = [
        { label: '🎧 Wireless Audio', action: 'quick_reply', payload: 'Show headphones' },
        { label: '🎒 Urban Travel Gear', action: 'quick_reply', payload: 'Show backpacks' },
        { label: '💻 Workspace Tech', action: 'quick_reply', payload: 'Show keyboards' }
      ];
    }

    const agentMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'agent',
      text: responseText,
      timestamp: new Date().toISOString(),
      suggestedActions,
      recommendedProducts
    };

    auditLogger.record({
      actor: 'COMMERCE_AGENT',
      action: 'PRODUCT_SEARCH',
      summary: `Commerce Agent recommended ${recommendedProducts.length} product(s) for query: "${query}"`,
      metadata: {
        recommendedProductIds: recommendedProducts.map(p => p.id),
        responseLength: responseText.length
      }
    });

    return agentMessage;
  }

  private static searchCatalog(query: string, products: Product[]): Product[] {
    // Extract price limits if mentioned (e.g. "under 3000" or "below 5000")
    const priceUnderMatch = query.match(/(?:under|below|less than|within|around)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
    const maxPrice = priceUnderMatch ? parseInt(priceUnderMatch[1], 10) : null;

    const scored = products.map(product => {
      let score = 0;
      const lowerName = product.name.toLowerCase();
      const lowerDesc = product.description.toLowerCase();
      const lowerCat = product.category.toLowerCase();

      // Check category match
      if (query.includes('audio') || query.includes('headphone') || query.includes('earphone') || query.includes('music')) {
        if (product.category.includes('Audio') || product.tags.includes('headphones')) score += 10;
      }
      if (query.includes('bag') || query.includes('backpack') || query.includes('travel')) {
        if (product.category.includes('Travel') || product.tags.includes('backpack')) score += 10;
      }
      if (query.includes('lamp') || query.includes('light') || query.includes('desk')) {
        if (product.category.includes('Smart Home') || product.tags.includes('lamp')) score += 10;
      }
      if (query.includes('watch') || query.includes('fitness') || query.includes('wearable')) {
        if (product.tags.includes('smartwatch') || product.tags.includes('watch')) score += 10;
      }
      if (query.includes('charge') || query.includes('charger') || query.includes('gan') || query.includes('adapter')) {
        if (product.tags.includes('charger') || product.category.includes('Electronics')) score += 10;
      }
      if (query.includes('keyboard') || query.includes('typing') || query.includes('mechanical')) {
        if (product.tags.includes('keyboard')) score += 10;
      }

      // Keyword matches
      const tokens = query.split(/\s+/).filter(t => t.length > 2);
      for (const token of tokens) {
        if (lowerName.includes(token)) score += 5;
        if (product.tags.some(tag => tag.includes(token))) score += 4;
        if (lowerDesc.includes(token)) score += 2;
        if (lowerCat.includes(token)) score += 3;
      }

      // Price filter penalty/boost
      if (maxPrice) {
        if (product.price <= maxPrice) {
          score += 6;
        } else {
          score -= 10;
        }
      }

      return { product, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.product);
  }
}
