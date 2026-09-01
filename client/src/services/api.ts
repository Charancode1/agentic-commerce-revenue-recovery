import { Product, Order, CartItem, ChatMessage } from '../../shared/types/commerce';
import { RecoveryIncident, DashboardMetrics, FailureCategory } from '../../shared/types/recovery';
import { AuditLogEntry } from '../../shared/types/audit';

const API_BASE = '/api';

export const api = {
  // Commerce
  async getProducts(category?: string, search?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/commerce/products?${params.toString()}`);
    const data = await res.json();
    return data.products || [];
  },

  async chatWithAgent(message: string, history: { sender: string; text: string }[]): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/commerce/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });
    const data = await res.json();
    return data.response;
  },

  // Checkout
  async createOrder(params: {
    items: CartItem[];
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }): Promise<{
    order: Order;
    razorpay: {
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      isSimulated: boolean;
    };
  }> {
    const res = await fetch(`${API_BASE}/checkout/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  async verifyPayment(params: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<{ success: boolean; order: Order }> {
    const res = await fetch(`${API_BASE}/checkout/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  async simulateFailure(params: {
    orderId?: string;
    failureCategory: FailureCategory;
    rawDescription?: string;
  }): Promise<{ success: boolean; incident: RecoveryIncident }> {
    const res = await fetch(`${API_BASE}/checkout/simulate-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/checkout/orders`);
    const data = await res.json();
    return data.orders || [];
  },

  // Recovery
  async getActiveRecoveries(): Promise<RecoveryIncident[]> {
    const res = await fetch(`${API_BASE}/recovery/active`);
    const data = await res.json();
    return data.recoveries || [];
  },

  async confirmRecovery(incidentId: string, accepted: boolean, customerFeedback?: string): Promise<RecoveryIncident> {
    const res = await fetch(`${API_BASE}/recovery/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, accepted, customerFeedback })
    });
    const data = await res.json();
    return data.incident;
  },

  async completeRecoveryPayment(incidentId: string, razorpayPaymentId?: string): Promise<RecoveryIncident> {
    const res = await fetch(`${API_BASE}/recovery/complete-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, razorpayPaymentId })
    });
    const data = await res.json();
    return data.incident;
  },

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/dashboard/metrics`);
    const data = await res.json();
    return data.metrics;
  },

  async resetDashboardData(): Promise<boolean> {
    const res = await fetch(`${API_BASE}/dashboard/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return data.success;
  },

  async getAuditTrail(limit: number = 50): Promise<AuditLogEntry[]> {
    const res = await fetch(`${API_BASE}/dashboard/audit-trail?limit=${limit}`);
    const data = await res.json();
    return data.logs || [];
  },

  subscribeToLiveEvents(callbacks: {
    onAudit?: (entry: AuditLogEntry) => void;
    onRecovery?: (incident: RecoveryIncident) => void;
    onOrder?: (order: Order) => void;
  }): () => void {
    const eventSource = new EventSource(`${API_BASE}/dashboard/stream`);

    eventSource.addEventListener('audit', (e: MessageEvent) => {
      if (callbacks.onAudit) {
        try {
          callbacks.onAudit(JSON.parse(e.data));
        } catch (err) {
          console.error('Audit parse err', err);
        }
      }
    });

    eventSource.addEventListener('recovery', (e: MessageEvent) => {
      if (callbacks.onRecovery) {
        try {
          callbacks.onRecovery(JSON.parse(e.data));
        } catch (err) {
          console.error('Recovery parse err', err);
        }
      }
    });

    eventSource.addEventListener('order', (e: MessageEvent) => {
      if (callbacks.onOrder) {
        try {
          callbacks.onOrder(JSON.parse(e.data));
        } catch (err) {
          console.error('Order parse err', err);
        }
      }
    });

    return () => {
      eventSource.close();
    };
  }
};
