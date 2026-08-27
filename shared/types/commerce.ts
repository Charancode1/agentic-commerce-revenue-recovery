export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in INR (Rupees)
  currency: string;
  category: string;
  image: string;
  inStock: boolean;
  inventoryCount: number;
  tags: string[];
  features: string[];
  rating: number;
  reviewCount: number;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  appliedPromoCode?: string;
}

export type OrderStatus = 'created' | 'attempted' | 'failed' | 'paid' | 'recovered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  razorpayOrderId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: CartItem[];
  amount: number; // In INR
  currency: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  cartAction?: {
    type: 'add_to_cart' | 'remove_from_cart';
    productId: string;
  };
  suggestedActions?: {
    label: string;
    action: 'add_to_cart' | 'remove_from_cart' | 'view_product' | 'checkout' | 'quick_reply';
    payload?: any;
  }[];
  recommendedProducts?: Product[];
}
