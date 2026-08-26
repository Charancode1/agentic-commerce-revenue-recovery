import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import { Product, Order, Cart } from '../../../shared/types/commerce';
import { RecoveryIncident } from '../../../shared/types/recovery';
import { AuditLogEntry } from '../../../shared/types/audit';

export const liveEventBus = new EventEmitter();

interface DBState {
  products: Product[];
  orders: Order[];
  recoveries: RecoveryIncident[];
  auditLogs: AuditLogEntry[];
  settings: Record<string, any>;
}

const DB_FILE_PATH = path.resolve(__dirname, '../../data/store.json');

class DatabaseManager {
  private state: DBState = {
    products: [],
    orders: [],
    recoveries: [],
    auditLogs: [],
    settings: {
      maxDiscountCapPercent: 12,
      maxDiscountCapAmount: 500,
      autoRecoveryEnabled: true
    }
  };

  constructor() {
    this.ensureDataDir();
    this.load();
  }

  private ensureDataDir() {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public load() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.state = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not load existing store, starting fresh', e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save store', e);
    }
  }

  // Products
  public getProducts(): Product[] {
    return this.state.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.state.products.find(p => p.id === id);
  }

  public setProducts(products: Product[]) {
    this.state.products = products;
    this.save();
  }

  // Orders
  public getOrders(): Order[] {
    return this.state.orders;
  }

  public getOrderById(id: string): Order | undefined {
    return this.state.orders.find(o => o.id === id);
  }

  public getOrderByRazorpayId(rzpId: string): Order | undefined {
    return this.state.orders.find(o => o.razorpayOrderId === rzpId);
  }

  public upsertOrder(order: Order): Order {
    const idx = this.state.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      this.state.orders[idx] = { ...this.state.orders[idx], ...order, updatedAt: new Date().toISOString() };
    } else {
      this.state.orders.unshift(order);
    }
    this.save();
    liveEventBus.emit('order:update', order);
    return order;
  }

  // Recovery Incidents
  public getRecoveries(): RecoveryIncident[] {
    return this.state.recoveries;
  }

  public getRecoveryById(id: string): RecoveryIncident | undefined {
    return this.state.recoveries.find(r => r.id === id);
  }

  public getRecoveryByOrderId(orderId: string): RecoveryIncident | undefined {
    return this.state.recoveries.find(r => r.orderId === orderId);
  }

  public upsertRecovery(incident: RecoveryIncident): RecoveryIncident {
    const idx = this.state.recoveries.findIndex(r => r.id === incident.id);
    if (idx >= 0) {
      this.state.recoveries[idx] = { ...this.state.recoveries[idx], ...incident, updatedAt: new Date().toISOString() };
    } else {
      this.state.recoveries.unshift(incident);
    }
    this.save();
    liveEventBus.emit('recovery:update', incident);
    return incident;
  }

  // Audit Logs
  public getAuditLogs(limit: number = 100): AuditLogEntry[] {
    return this.state.auditLogs.slice(0, limit);
  }

  public appendAuditLog(entry: AuditLogEntry) {
    this.state.auditLogs.unshift(entry);
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.save();
    liveEventBus.emit('audit:new', entry);
  }

  // Settings
  public getSettings() {
    return this.state.settings;
  }

  public updateSettings(newSettings: Record<string, any>) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.save();
    return this.state.settings;
  }
}

export const db = new DatabaseManager();
