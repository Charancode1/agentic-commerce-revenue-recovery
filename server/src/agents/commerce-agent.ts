import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db/db';
import { Product, ChatMessage } from '../../../shared/types/commerce';
import { ShopperRecoveryContext } from '../../../shared/types/recovery';
import { auditLogger } from '../db/audit-logger';
import { ENV } from '../config/env';

interface GeminiCommerceResponse {
  replyMessage: string;
  matchedProductIds: string[];
  cartAction?: {
    type: 'add_to_cart' | 'remove_from_cart';
    productId: string;
  };
  suggestedActions: {
    label: string;
    action: 'add_to_cart' | 'remove_from_cart' | 'view_product' | 'checkout' | 'quick_reply';
    payload?: string;
  }[];
}

export class CommerceAgent {
  private static geminiClient: GoogleGenAI | null = null;

  /**
   * Initializes the Google GenAI SDK instance if an API key is available.
   */
  private static getGeminiClient(): GoogleGenAI | null {
    if (this.geminiClient) return this.geminiClient;
    if (ENV.GEMINI_API_KEY && ENV.GEMINI_API_KEY.trim().length > 0) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY.trim() });
        return this.geminiClient;
      } catch (err) {
        console.warn('⚠️ Failed to initialize GoogleGenAI client, falling back to heuristics:', err);
        return null;
      }
    }
    return null;
  }

  /**
   * Primary entry point for processing customer shopping queries.
   * Uses Gemini AI with structured schema, falling back gracefully to heuristic catalog search.
   */
  public static async processMessage(
    userMessage: string,
    history: { sender: string; text: string }[] = []
  ): Promise<ChatMessage> {
    const products = db.getProducts();

    // Log the user interaction in the immutable audit trail
    auditLogger.record({
      actor: 'CUSTOMER',
      action: 'PRODUCT_SEARCH',
      summary: `Shopper query: "${userMessage.substring(0, 80)}"`,
      metadata: { query: userMessage }
    });

    const ai = this.getGeminiClient();

    if (ai) {
      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini Commerce API call timed out after 25000ms')), 25000)
        );

        const geminiResult = await Promise.race([
          this.processWithGemini(ai, userMessage, history, products),
          timeoutPromise
        ]);

        if (geminiResult) {
          return geminiResult;
        }
      } catch (error) {
        console.warn('⚠️ Gemini processing error, using heuristic fallback:', error);
      }
    }

    // Fallback if GEMINI_API_KEY is empty or if API call fails
    return this.processWithHeuristics(userMessage, products);
  }

  /**
   * Processes the user query using Gemini 3.6 Flash with structured output and strict catalog grounding.
   */
  private static async processWithGemini(
    ai: GoogleGenAI,
    userMessage: string,
    history: { sender: string; text: string }[],
    products: Product[]
  ): Promise<ChatMessage | null> {
    // 1. Prepare Grounded Catalog Context for Gemini (Gemini must NOT invent items)
    const catalogContext = products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      currency: p.currency,
      inStock: p.inStock,
      inventoryCount: p.inventoryCount,
      features: p.features,
      tags: p.tags,
      description: p.description
    }));

    const systemInstruction = `You are the AI Commerce Assistant for the Razorpay Agentic Commerce store.
Your mission is to understand shopper intent, provide helpful and concise product recommendations, manage cart actions, and guide shoppers smoothly to checkout.

STRICT GROUNDING & ACTION RULES:
1. You must ONLY recommend products from the official Store Catalog provided below.
2. NEVER invent fake products, fake product IDs, or alter catalog prices.
3. In "matchedProductIds", only output valid product IDs (e.g. "prod_1", "prod_2") from the catalog that best match the shopper's intent (maximum 3 products).
4. CART MANAGEMENT: When the shopper explicitly asks to remove, delete, or take out a product from their cart (e.g., "remove headphones from cart", "delete backpack", "remove prod_1 from cart"), identify the exact matching catalog product ID and set:
   "cartAction": { "type": "remove_from_cart", "productId": "<exact_catalog_product_id>" }
   and confirm in "replyMessage" that the product has been removed from their cart.
5. In "suggestedActions", offer 2-3 relevant interactive button choices (e.g., adding to cart, removing from cart, quick replies, or proceeding to checkout).
6. Format your "replyMessage" with clear markdown (bolding key product names and prices in INR).

OFFICIAL STORE CATALOG:
${JSON.stringify(catalogContext, null, 2)}`;

    // 2. Format conversation history
    const conversationTurns = history.slice(-6).map(h => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    conversationTurns.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    // 3. Call Gemini with Structured JSON Schema
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: conversationTurns,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyMessage: {
              type: Type.STRING,
              description: 'Helpful, persuasive response directly addressing the user inquiry.'
            },
            matchedProductIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of exact product IDs from the catalog that match user intent.'
            },
            cartAction: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: 'One of: add_to_cart, remove_from_cart'
                },
                productId: {
                  type: Type.STRING,
                  description: 'The exact catalog product ID (e.g. prod_1, prod_2) to modify in cart.'
                }
              },
              required: ['type', 'productId'],
              description: 'Structured cart action if the user requested to add or remove an item.'
            },
            suggestedActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: 'Action button label' },
                  action: {
                    type: Type.STRING,
                    description: 'One of: add_to_cart, remove_from_cart, quick_reply, checkout, view_product'
                  },
                  payload: {
                    type: Type.STRING,
                    description: 'Optional payload (product ID or query text)'
                  }
                },
                required: ['label', 'action']
              }
            }
          },
          required: ['replyMessage', 'matchedProductIds', 'suggestedActions']
        }
      }
    });

    const rawJson = response.text?.trim();
    if (!rawJson) return null;

    const parsed: GeminiCommerceResponse = JSON.parse(rawJson);

    // 4. Validate Grounding: Ensure matched products exist in our database
    const matchedProducts: Product[] = [];
    for (const pid of parsed.matchedProductIds || []) {
      const prod = products.find(p => p.id === pid);
      if (prod && !matchedProducts.some(mp => mp.id === prod.id)) {
        matchedProducts.push(prod);
      }
    }

    // 5. Validate and Ground Cart Action
    let validatedCartAction: ChatMessage['cartAction'] = undefined;
    if (parsed.cartAction && (parsed.cartAction.type === 'remove_from_cart' || parsed.cartAction.type === 'add_to_cart')) {
      const targetProduct = products.find(p => p.id === parsed.cartAction?.productId);
      if (targetProduct) {
        validatedCartAction = {
          type: parsed.cartAction.type,
          productId: targetProduct.id
        };
      }
    }

    // 6. Format suggested actions with live product payloads
    const formattedActions = (parsed.suggestedActions || []).map(act => {
      if (act.action === 'add_to_cart') {
        const targetProd = (act.payload ? products.find(p => p.id === act.payload) : null) || matchedProducts[0] || products[0];
        return {
          label: act.label,
          action: 'add_to_cart' as const,
          payload: targetProd
        };
      }
      if (act.action === 'remove_from_cart') {
        const targetProd = (act.payload ? products.find(p => p.id === act.payload) : null) || (validatedCartAction ? products.find(p => p.id === validatedCartAction?.productId) : null) || matchedProducts[0] || products[0];
        return {
          label: act.label,
          action: 'remove_from_cart' as const,
          payload: targetProd ? targetProd.id : act.payload
        };
      }
      return {
        label: act.label,
        action: act.action,
        payload: act.payload
      };
    });

    const agentMessage: ChatMessage = {
      id: `msg_gemini_${Date.now()}`,
      sender: 'agent',
      text: parsed.replyMessage,
      timestamp: new Date().toISOString(),
      cartAction: validatedCartAction,
      suggestedActions: formattedActions,
      recommendedProducts: matchedProducts
    };

    // Log the successful AI agent reasoning to the audit trail
    auditLogger.record({
      actor: 'COMMERCE_AGENT',
      action: validatedCartAction ? 'CART_MODIFIED' : 'PRODUCT_SEARCH',
      summary: validatedCartAction
        ? `Gemini AI executed cartAction: ${validatedCartAction.type} (${validatedCartAction.productId})`
        : `Gemini AI recommended ${matchedProducts.length} product(s) for: "${userMessage.substring(0, 60)}"`,
      metadata: {
        engine: 'GEMINI_3_5_FLASH',
        cartAction: validatedCartAction,
        recommendedProductIds: matchedProducts.map(p => p.id),
        responseLength: parsed.replyMessage.length
      }
    });

    return agentMessage;
  }

  /**
   * Formats a shopper-facing recovery message using Gemini AI with strict grounding on backend-authoritative parameters.
   */
  public static async generateRecoveryMessage(context: ShopperRecoveryContext): Promise<ChatMessage> {
    auditLogger.record({
      actor: 'COMMERCE_AGENT',
      action: 'SHOPPER_RECOVERY_CONTEXT_CREATED',
      orderId: context.orderId,
      incidentId: context.incidentId,
      summary: `Shopper Agent received recovery context for Order #${context.orderNumber} (₹${context.finalPayableAmount})`,
      metadata: { context }
    });

    const ai = this.getGeminiClient();
    let textMessage = '';

    if (ai) {
      try {
        const systemInstruction = `You are the Shopper-Facing AI Commerce Agent for RAZORDEFENSE Store.
Your task is to communicate a payment recovery option to the customer in a calm, helpful, professional tone.

STRICT GROUNDING & FINANCIAL RULES:
1. All financial numbers are STRICTLY BACKEND-AUTHORITATIVE:
   - Order Number: #${context.orderNumber}
   - Original Amount: ₹${context.originalAmount}
   - Final Payable Amount: ₹${context.finalPayableAmount}
   - Concession/Discount: ${context.discountValue > 0 ? `₹${context.discountValue} OFF` : 'None'}
   - Classified Root Cause: ${context.detectedReason}
   - Strategy: ${context.strategy}
2. NEVER invent fake discounts, fake prices, or fake order numbers.
3. Keep your response under 3-4 sentences. Clearly explain what happened to their payment (e.g. Bank 2FA delay, Card limit decline, network glitch) and reassure them that their items are safely reserved for 20 minutes.
4. Encourage them to complete their purchase using the verified recovery option.`;

        const prompt = `Payment failure occurred for Order #${context.orderNumber}.
Reason: ${context.detectedReason}
Original Amount: ₹${context.originalAmount}
Discount Offered: ₹${context.discountValue}
Final Payable: ₹${context.finalPayableAmount}
Strategy: ${context.strategy}
Reasoning: ${context.agentReasoning}

Please format a warm, professional customer-facing recovery explanation for the shopper.`;

        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini Recovery Message call timed out after 25000ms')), 25000)
        );

        const apiCallPromise = ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction,
            temperature: 0.3
          }
        });

        const response = await Promise.race([apiCallPromise, timeoutPromise]);

        if (response && response.text && response.text.trim().length > 0) {
          textMessage = response.text.trim();
        }
      } catch (err) {
        console.warn('⚠️ Gemini recovery message generation error, using fallback:', err);
      }
    }

    if (!textMessage) {
      if (context.failureCategory === 'BANK_OTP_TIMEOUT') {
        textMessage = `We noticed your bank 2FA timed out during checkout for Order #${context.orderNumber}. Don't worry, your cart is reserved! You can complete it seamlessly with instant 1-tap UPI payment.`;
      } else if (context.failureCategory === 'CARD_DECLINED_INSUFFICIENT_FUNDS') {
        textMessage = `Your card issuer declined the transaction for Order #${context.orderNumber}. To help you complete your purchase, we've applied a time-sensitive ₹${context.discountValue} concession to your cart!`;
      } else if (context.failureCategory === 'CART_ABANDONMENT_AT_CHECKOUT') {
        textMessage = `Your items in Order #${context.orderNumber} are on high demand, but we have reserved your cart for 20 minutes so you can complete your purchase!`;
      } else {
        textMessage = `A network glitch interrupted your payment for Order #${context.orderNumber}. Don't worry, your cart is intact. Use this direct Razorpay recovery link to complete it securely.`;
      }
    }

    const message: ChatMessage = {
      id: `msg_recovery_${Date.now()}`,
      sender: 'agent',
      text: textMessage,
      timestamp: new Date().toISOString(),
      suggestedActions: [
        {
          label: `⚡ Accept & Pay ₹${context.finalPayableAmount}`,
          action: 'confirm_recovery' as any,
          payload: context.incidentId
        },
        {
          label: '❌ Decline Offer',
          action: 'decline_recovery' as any,
          payload: context.incidentId
        }
      ]
    };

    auditLogger.record({
      actor: 'COMMERCE_AGENT',
      action: 'SHOPPER_RECOVERY_MESSAGE_DELIVERED',
      orderId: context.orderId,
      incidentId: context.incidentId,
      summary: `Shopper Agent delivered recovery message for Order #${context.orderNumber}`,
      metadata: { textMessage }
    });

    return message;
  }

  /**
   * Deterministic Heuristic Fallback Engine.
   * Runs seamlessly if GEMINI_API_KEY is not configured or in offline environments.
   */
  private static processWithHeuristics(userMessage: string, products: Product[]): ChatMessage {
    const query = userMessage.toLowerCase().trim();

    // Check for explicit cart removal queries in fallback mode
    if (query.includes('remove') || query.includes('delete') || query.includes('take out') || query.includes('discard') || query.includes('drop')) {
      const matched = this.searchCatalog(query, products);
      const targetProd = matched[0] || products[0];

      const responseText = `I've removed the **${targetProd.name}** from your cart. Would you like to explore other items or view your updated checkout?`;
      const agentMessage: ChatMessage = {
        id: `msg_fallback_${Date.now()}`,
        sender: 'agent',
        text: responseText,
        timestamp: new Date().toISOString(),
        cartAction: {
          type: 'remove_from_cart',
          productId: targetProd.id
        },
        suggestedActions: [
          { label: '🛍️ View Products', action: 'quick_reply', payload: 'Show me all products' },
          { label: '💳 Go to Checkout', action: 'checkout' }
        ],
        recommendedProducts: []
      };

      auditLogger.record({
        actor: 'COMMERCE_AGENT',
        action: 'CART_MODIFIED',
        summary: `Commerce Agent (Fallback) removed product ${targetProd.id} (${targetProd.name}) from cart`,
        metadata: {
          engine: 'HEURISTIC_FALLBACK',
          productId: targetProd.id
        }
      });

      return agentMessage;
    }

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
      recommendedProducts = products.slice(0, 3);
      responseText = `Hello! I'm your AI Commerce Assistant. I can help you discover products, compare specs, check stock, and set up your Razorpay checkout in seconds.\n\nHere are some of our trending customer favorites:`;
      suggestedActions = [
        { label: '🎧 Wireless Audio', action: 'quick_reply', payload: 'Show headphones' },
        { label: '🎒 Urban Travel Gear', action: 'quick_reply', payload: 'Show backpacks' },
        { label: '💻 Workspace Tech', action: 'quick_reply', payload: 'Show keyboards' }
      ];
    }

    const agentMessage: ChatMessage = {
      id: `msg_fallback_${Date.now()}`,
      sender: 'agent',
      text: responseText,
      timestamp: new Date().toISOString(),
      suggestedActions,
      recommendedProducts
    };

    auditLogger.record({
      actor: 'COMMERCE_AGENT',
      action: 'PRODUCT_SEARCH',
      summary: `Commerce Agent (Fallback) recommended ${recommendedProducts.length} product(s) for query: "${query}"`,
      metadata: {
        engine: 'HEURISTIC_FALLBACK',
        recommendedProductIds: recommendedProducts.map(p => p.id),
        responseLength: responseText.length
      }
    });

    return agentMessage;
  }

  /**
   * Keyword and category search for heuristic fallback.
   */
  private static searchCatalog(query: string, products: Product[]): Product[] {
    const priceUnderMatch = query.match(/(?:under|below|less than|within|around)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
    const maxPrice = priceUnderMatch ? parseInt(priceUnderMatch[1], 10) : null;

    const scored = products.map(product => {
      let score = 0;
      const lowerName = product.name.toLowerCase();
      const lowerDesc = product.description.toLowerCase();
      const lowerCat = product.category.toLowerCase();

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

      const tokens = query.split(/\s+/).filter(t => t.length > 2);
      for (const token of tokens) {
        if (lowerName.includes(token)) score += 5;
        if (product.tags.some(tag => tag.includes(token))) score += 4;
        if (lowerDesc.includes(token)) score += 2;
        if (lowerCat.includes(token)) score += 3;
      }

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
