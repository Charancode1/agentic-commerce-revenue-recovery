import React, { useState, useEffect } from 'react';
import { DashboardMetrics, RecoveryIncident } from '../../../shared/types/recovery';
import { Order } from '../../../shared/types/commerce';
import { AuditLogEntry } from '../../../shared/types/audit';
import { api } from '../../services/api';
import {
  TrendingUp,
  AlertOctagon,
  ShieldCheck,
  Zap,
  Activity,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  Hash,
  ShoppingBag,
  CreditCard
} from 'lucide-react';

interface MerchantDashboardProps {
  onSelectIncidentForOutreach?: (incident: RecoveryIncident) => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ onSelectIncidentForOutreach }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recoveries, setRecoveries] = useState<RecoveryIncident[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'incidents' | 'audit'>('orders');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogEntry | null>(null);

  const fetchData = async () => {
    try {
      const [m, recs, logs, ords] = await Promise.all([
        api.getDashboardMetrics(),
        api.getActiveRecoveries(),
        api.getAuditTrail(50),
        api.getOrders()
      ]);
      setMetrics(m);
      setRecoveries(recs);
      setAuditLogs(logs);
      setOrders(ords);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to SSE Real-Time Updates
    const unsubscribe = api.subscribeToLiveEvents({
      onAudit: newLog => {
        setAuditLogs(prev => [newLog, ...prev.slice(0, 49)]);
      },
      onRecovery: updatedRec => {
        setRecoveries(prev => {
          const idx = prev.findIndex(r => r.id === updatedRec.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updatedRec;
            return next;
          }
          return [updatedRec, ...prev];
        });
        // Refresh metrics whenever a recovery changes
        api.getDashboardMetrics().then(setMetrics);
      },
      onOrder: updatedOrder => {
        setOrders(prev => {
          const idx = prev.findIndex(o => o.id === updatedOrder.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updatedOrder;
            return next;
          }
          return [updatedOrder, ...prev];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (isLoading && !metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={24} style={{ marginBottom: '12px' }} />
        <div>Loading Merchant Control Tower metrics...</div>
      </div>
    );
  }

  const atRisk = metrics?.totalRevenueAtRisk || 0;
  const recovered = metrics?.totalRecoveredRevenue || 0;
  const recoveryRate = metrics?.recoveryRatePercentage || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            Merchant Control Tower & Revenue Defense
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Autonomous real-time revenue protection powered by Razorpay Test Engine & Bounded AI Agents
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchData}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Revenue at Risk */}
        <div className="glass-card" style={{
          padding: '20px',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(17, 24, 48, 0.8) 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FB7185', textTransform: 'uppercase' }}>
              Revenue At Risk
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.2)', color: '#FB7185' }}>
              <AlertOctagon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            ₹{atRisk.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Detected across {recoveries.length} failed/abandoned transactions
          </div>
        </div>

        {/* Card 2: Recovered Revenue */}
        <div className="glass-card" style={{
          padding: '20px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(17, 24, 48, 0.8) 100%)',
          boxShadow: 'var(--shadow-glow-emerald)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase' }}>
              Recovered Revenue
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34D399', marginBottom: '4px' }}>
            ₹{recovered.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Successfully saved and captured via Razorpay
          </div>
        </div>

        {/* Card 3: Recovery Rate % */}
        <div className="glass-card" style={{
          padding: '20px',
          border: '1px solid rgba(0, 186, 242, 0.3)',
          background: 'linear-gradient(135deg, rgba(0, 186, 242, 0.08) 0%, rgba(17, 24, 48, 0.8) 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase' }}>
              Recovery Conversion
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(0, 186, 242, 0.2)', color: '#38BDF8' }}>
              <Zap size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38BDF8', marginBottom: '4px' }}>
            {recoveryRate}%
          </div>
          {/* Progress Bar */}
          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '9999px', overflow: 'hidden', marginTop: '6px' }}>
            <div style={{ width: `${Math.min(100, recoveryRate)}%`, height: '100%', backgroundColor: '#00BAF2', transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* Card 4: Autonomous Guardrail Status */}
        <div className="glass-card" style={{
          padding: '20px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(17, 24, 48, 0.8) 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#A5B4FC', textTransform: 'uppercase' }}>
              Policy Guardrails
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#A5B4FC' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            Max 12% / ₹500 Cap
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} />
            <span>Customer Consent Enforced</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '16px'
      }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'orders' ? '#38BDF8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShoppingBag size={16} />
          <span>Store Orders & Payments</span>
          <span className="badge badge-cyan" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'overview' ? '#38BDF8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          Failure Taxonomy & Insights
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          style={{
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'incidents' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'incidents' ? '#38BDF8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>Recovery Incidents Stream</span>
          <span className="badge badge-cyan" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
            {recoveries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'audit' ? '#38BDF8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <History size={16} />
          <span>Financial Audit Trail</span>
        </button>
      </div>

      {/* TAB 0: STORE ORDERS */}
      {activeTab === 'orders' && (
        <div className="glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} color="#38BDF8" />
            <span>Store Orders & Razorpay Verification Status</span>
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-subtle)' }}>
                <th style={{ padding: '12px' }}>ORDER NUMBER</th>
                <th style={{ padding: '12px' }}>CUSTOMER</th>
                <th style={{ padding: '12px' }}>AMOUNT</th>
                <th style={{ padding: '12px' }}>STATUS</th>
                <th style={{ padding: '12px' }}>PROVIDER</th>
                <th style={{ padding: '12px' }}>RAZORPAY PAYMENT ID</th>
                <th style={{ padding: '12px' }}>CREATED AT</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No orders recorded yet.
                  </td>
                </tr>
              ) : (
                orders.map(ord => {
                  let badgeClass = 'badge-cyan';
                  if (ord.status === 'paid' || ord.status === 'recovered') badgeClass = 'badge-emerald';
                  if (ord.status === 'failed') badgeClass = 'badge-rose';

                  return (
                    <tr key={ord.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>#{ord.orderNumber}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{ord.id}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{ord.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{ord.customerEmail}</div>
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 800, color: '#38BDF8' }}>
                        ₹{ord.amount.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span className={`badge ${badgeClass}`}>{ord.status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 600, color: '#38BDF8' }}>
                        Razorpay
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {ord.razorpayPaymentId ? (
                          <code style={{ fontSize: '0.75rem', color: '#34D399', backgroundColor: 'rgba(52, 211, 153, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            {ord.razorpayPaymentId}
                          </code>
                        ) : ord.razorpayOrderId ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                            Ord: {ord.razorpayOrderId}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 1: OVERVIEW & FAILURE TAXONOMY */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {/* Failure Reasons Breakdown */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertOctagon size={18} color="#FB7185" />
              <span>Top Failure Root Causes</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {metrics?.topFailureReasons.map(item => {
                const percentOfTotal = atRisk > 0 ? Math.round((item.amount / atRisk) * 100) : 0;
                return (
                  <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{item.category.replace(/_/g, ' ')}</span>
                      <span style={{ color: '#FB7185', fontWeight: 700 }}>
                        ₹{item.amount.toLocaleString('en-IN')} ({item.count} fails)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentOfTotal}%`, height: '100%', backgroundColor: '#F43F5E' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recovery Strategy Performance */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#38BDF8" />
              <span>Recovery Strategy Efficiency</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {metrics?.strategyPerformance.map(strat => {
                const convRate = strat.attempted > 0 ? Math.round((strat.converted / strat.attempted) * 100) : 0;
                return (
                  <div key={strat.strategy} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{strat.strategy.replace(/_/g, ' ')}</span>
                      <span style={{ color: '#34D399', fontWeight: 700 }}>
                        {strat.converted}/{strat.attempted} saved ({convRate}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${convRate}%`, height: '100%', backgroundColor: '#10B981' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENTS STREAM */}
      {activeTab === 'incidents' && (
        <div className="glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-subtle)' }}>
                <th style={{ padding: '12px' }}>INCIDENT / ORDER</th>
                <th style={{ padding: '12px' }}>AMOUNT AT RISK</th>
                <th style={{ padding: '12px' }}>ROOT CAUSE</th>
                <th style={{ padding: '12px' }}>AI STRATEGY</th>
                <th style={{ padding: '12px' }}>STATUS</th>
                <th style={{ padding: '12px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {recoveries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No recovery incidents detected yet. Use the <strong>Failure Simulator</strong> to test!
                  </td>
                </tr>
              ) : (
                recoveries.map(rec => {
                  let badgeClass = 'badge-amber';
                  if (rec.status === 'RECOVERED') badgeClass = 'badge-emerald';
                  if (rec.status === 'DECLINED_BY_CUSTOMER') badgeClass = 'badge-rose';

                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>#{rec.orderNumber}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{rec.id}</div>
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 800, color: '#FB7185' }}>
                        ₹{rec.amountAtRisk.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {rec.failureCategory.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#38BDF8', fontWeight: 600 }}>
                          {rec.recoveryProposal?.strategy.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span className={`badge ${badgeClass}`}>{rec.status}</span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {onSelectIncidentForOutreach && rec.status !== 'RECOVERED' && (
                          <button
                            onClick={() => onSelectIncidentForOutreach(rec)}
                            className="btn-primary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          >
                            <span>Open Recovery Modal</span>
                          </button>
                        )}
                        {rec.status === 'RECOVERED' && (
                          <span style={{ color: '#34D399', fontSize: '0.75rem', fontWeight: 700 }}>
                            Saved: ₹{rec.recoveredAmount}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: FINANCIAL AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          {/* Audit List */}
          <div className="glass-card" style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="#38BDF8" />
              <span>Immutable Ledger & Agent Decision Log</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {auditLogs.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedAuditLog(log)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: selectedAuditLog?.id === log.id ? 'rgba(0, 186, 242, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedAuditLog?.id === log.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                      {log.actor}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {log.action}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                    {log.summary}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Inspector Panel */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38BDF8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Hash size={16} />
              <span>Audit Block Inspector</span>
            </h4>

            {selectedAuditLog ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>LOG ID</div>
                  <code>{selectedAuditLog.id}</code>
                </div>

                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>TIMESTAMP</div>
                  <div>{new Date(selectedAuditLog.timestamp).toISOString()}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>ACTOR & ACTION</div>
                  <div><strong>{selectedAuditLog.actor}</strong> &rarr; {selectedAuditLog.action}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>SHA-256 HASH (CHAIN INTEGRITY)</div>
                  <code style={{ fontSize: '0.65rem', wordBreak: 'break-all', color: '#34D399' }}>
                    {selectedAuditLog.hash || '0000000000000000000000000000000000000000000000000000000000000000'}
                  </code>
                </div>

                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.7rem' }}>METADATA PAYLOAD</div>
                  <pre style={{
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    overflowX: 'auto',
                    fontSize: '0.7rem',
                    color: '#A5B4FC'
                  }}>
                    {JSON.stringify(selectedAuditLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '30px 0' }}>
                Click any log entry on the left to inspect its cryptographic hash and metadata.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
