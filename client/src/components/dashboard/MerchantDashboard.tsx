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
  History,
  CheckCircle2,
  RefreshCw,
  Hash,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  FileText
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
  const [activeTab, setActiveTab] = useState<'orders' | 'incidents' | 'overview' | 'audit'>('orders');
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
      console.error('Failed to load merchant dashboard data:', e);
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
        <RefreshCw className="animate-spin" size={22} style={{ marginBottom: '12px', color: '#0284C7' }} />
        <div>Loading RAZORDEFENSE Merchant Control Tower...</div>
      </div>
    );
  }

  const atRisk = metrics?.totalRevenueAtRisk || 0;
  const recovered = metrics?.totalRecoveredRevenue || 0;
  const recoveryRate = metrics?.recoveryRatePercentage || 0;

  const handleResetAllData = async () => {
    try {
      setIsLoading(true);
      await api.resetDashboardData();
      await fetchData();
    } catch (e) {
      console.error('Failed to reset data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Merchant Control Tower
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Real-time payment failure monitoring and autonomous revenue defense
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleResetAllData}
            className="btn-secondary"
            style={{ color: '#FB7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}
          >
            <RefreshCw size={14} />
            <span>Reset Demo Data (Clear to ₹0)</span>
          </button>

          <button
            onClick={fetchData}
            className="btn-secondary"
          >
            <RefreshCw size={14} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Operational KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '14px'
      }}>
        {/* Card 1: Revenue at Risk */}
        <div className="saas-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Revenue At Risk
            </span>
            <div style={{ padding: '5px', borderRadius: '6px', backgroundColor: 'var(--accent-rose-bg)', color: '#FB7185' }}>
              <AlertOctagon size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: atRisk > 0 ? '#FB7185' : 'var(--text-main)', marginBottom: '4px' }}>
            ₹{atRisk.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
            {atRisk > 0 ? `Active exposure across ${metrics?.activeIncidentsCount || 1} unresolved failure${(metrics?.activeIncidentsCount || 1) === 1 ? '' : 's'}` : 'No active payment failures'}
          </div>
        </div>

        {/* Card 2: Recovered Revenue */}
        <div className="saas-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recovered Revenue
            </span>
            <div style={{ padding: '5px', borderRadius: '6px', backgroundColor: 'var(--accent-emerald-bg)', color: '#34D399' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34D399', marginBottom: '4px' }}>
            ₹{recovered.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
            {recovered > 0 ? 'Saved & captured via Razorpay' : 'No revenue recovered yet'}
          </div>
        </div>

        {/* Card 3: Recovery Conversion % */}
        <div className="saas-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recovery Conversion
            </span>
            <div style={{ padding: '5px', borderRadius: '6px', backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#38BDF8' }}>
              <Zap size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#38BDF8', marginBottom: '4px' }}>
            {recoveryRate}%
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
            {atRisk > 0 ? `${metrics?.activeIncidentsCount || 0} incidents active` : 'Calculates upon payment incidents'}
          </div>
        </div>

        {/* Card 4: Autonomous Guardrail Status */}
        <div className="saas-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Policy Guardrails
            </span>
            <div style={{ padding: '5px', borderRadius: '6px', backgroundColor: 'rgba(79, 70, 229, 0.12)', color: '#818CF8' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            Max 12% / ₹500 Cap
          </div>
          <div style={{ fontSize: '0.725rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} />
            <span>Customer Consent Enforced</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '12px'
      }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '2px solid #0284C7' : '2px solid transparent',
            color: activeTab === 'orders' ? '#38BDF8' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ShoppingBag size={15} />
          <span>Store Orders & Payments</span>
          <span className="badge badge-cyan" style={{ padding: '1px 6px', fontSize: '0.65rem' }}>
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          style={{
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'incidents' ? '2px solid #0284C7' : '2px solid transparent',
            color: activeTab === 'incidents' ? '#38BDF8' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Recovery Incidents Stream</span>
          <span className="badge badge-cyan" style={{ padding: '1px 6px', fontSize: '0.65rem' }}>
            {recoveries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid #0284C7' : '2px solid transparent',
            color: activeTab === 'overview' ? '#38BDF8' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Failure Taxonomy & Insights
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid #0284C7' : '2px solid transparent',
            color: activeTab === 'audit' ? '#38BDF8' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <History size={15} />
          <span>Financial Audit Ledger</span>
        </button>
      </div>

      {/* TAB 1: STORE ORDERS */}
      {activeTab === 'orders' && (
        <div className="saas-card" style={{ padding: '18px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShoppingBag size={16} color="#0284C7" />
              <span>Payment Transactions & Verification Ledger</span>
            </h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-subtle)' }}>
                <th style={{ padding: '10px' }}>ORDER REFERENCE</th>
                <th style={{ padding: '10px' }}>CUSTOMER</th>
                <th style={{ padding: '10px' }}>AMOUNT</th>
                <th style={{ padding: '10px' }}>STATUS</th>
                <th style={{ padding: '10px' }}>PROVIDER</th>
                <th style={{ padding: '10px' }}>RAZORPAY PAYMENT ID</th>
                <th style={{ padding: '10px' }}>CREATED AT</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <FileText size={28} style={{ color: 'var(--text-subtle)' }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>No orders recorded yet</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      Initiate a transaction in <strong>Shopper Storefront</strong> to test Razorpay order verification.
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map(ord => {
                  let badgeClass = 'badge-cyan';
                  if (ord.status === 'paid' || ord.status === 'recovered') badgeClass = 'badge-emerald';
                  if (ord.status === 'failed') badgeClass = 'badge-rose';

                  return (
                    <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>#{ord.orderNumber}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{ord.id}</div>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 500 }}>{ord.customerName}</div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>{ord.customerEmail}</div>
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{ord.amount.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge ${badgeClass}`}>{ord.status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 500, color: '#38BDF8' }}>
                        Razorpay
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {ord.razorpayPaymentId ? (
                          <code style={{ fontSize: '0.725rem', color: '#34D399', backgroundColor: 'rgba(52, 211, 153, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                            {ord.razorpayPaymentId}
                          </code>
                        ) : ord.razorpayOrderId ? (
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
                            Ord: {ord.razorpayOrderId}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
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

      {/* TAB 2: RECOVERY INCIDENTS STREAM */}
      {activeTab === 'incidents' && (
        <div className="saas-card" style={{ padding: '18px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-subtle)' }}>
                <th style={{ padding: '10px' }}>INCIDENT / ORDER</th>
                <th style={{ padding: '10px' }}>AMOUNT AT RISK</th>
                <th style={{ padding: '10px' }}>ROOT CAUSE</th>
                <th style={{ padding: '10px' }}>STRATEGY FORMULATED</th>
                <th style={{ padding: '10px' }}>STATUS</th>
                <th style={{ padding: '10px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {recoveries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <AlertOctagon size={28} style={{ color: 'var(--text-subtle)' }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>No recovery incidents detected</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      Use the <strong>Failure Simulator</strong> to test payment drop-offs and autonomous recovery strategies.
                    </div>
                  </td>
                </tr>
              ) : (
                recoveries.map(rec => {
                  let badgeClass = 'badge-amber';
                  if (rec.status === 'RECOVERED') badgeClass = 'badge-emerald';
                  if (rec.status === 'DECLINED_BY_CUSTOMER') badgeClass = 'badge-rose';

                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>#{rec.orderNumber}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{rec.id}</div>
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: '#FB7185' }}>
                        ₹{rec.amountAtRisk.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                          {rec.failureCategory.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ fontSize: '0.775rem', color: '#38BDF8', fontWeight: 500 }}>
                          {rec.recoveryProposal?.strategy.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge ${badgeClass}`}>{rec.status}</span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {onSelectIncidentForOutreach && rec.status !== 'RECOVERED' && (
                          <button
                            onClick={() => onSelectIncidentForOutreach(rec)}
                            className="btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.725rem' }}
                          >
                            <span>Inspect Recovery Modal</span>
                          </button>
                        )}
                        {rec.status === 'RECOVERED' && (
                          <span style={{ color: '#34D399', fontSize: '0.725rem', fontWeight: 600 }}>
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

      {/* TAB 3: OVERVIEW & FAILURE TAXONOMY */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
          {/* Failure Reasons Breakdown */}
          <div className="saas-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertOctagon size={16} color="#FB7185" />
              <span>Failure Root Cause Taxonomy</span>
            </h3>

            {metrics?.topFailureReasons && metrics.topFailureReasons.filter(i => i.count > 0).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {metrics.topFailureReasons.map(item => {
                  const percentOfTotal = atRisk > 0 ? Math.round((item.amount / atRisk) * 100) : 0;
                  return (
                    <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 500 }}>{item.category.replace(/_/g, ' ')}</span>
                        <span style={{ color: '#FB7185', fontWeight: 600 }}>
                          ₹{item.amount.toLocaleString('en-IN')} ({item.count} fails)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--border-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentOfTotal}%`, height: '100%', backgroundColor: '#F43F5E' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No payment failures recorded yet. Gateway insights populate upon error events.
              </div>
            )}
          </div>

          {/* Recovery Strategy Performance */}
          <div className="saas-card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} color="#0284C7" />
              <span>Autonomous Strategy Efficiency</span>
            </h3>

            {metrics?.strategyPerformance && metrics.strategyPerformance.filter(s => s.attempted > 0).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {metrics.strategyPerformance.map(strat => {
                  const convRate = strat.attempted > 0 ? Math.round((strat.converted / strat.attempted) * 100) : 0;
                  return (
                    <div key={strat.strategy} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 500 }}>{strat.strategy.replace(/_/g, ' ')}</span>
                        <span style={{ color: '#34D399', fontWeight: 600 }}>
                          {strat.converted}/{strat.attempted} saved ({convRate}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--border-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${convRate}%`, height: '100%', backgroundColor: '#10B981' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No recovery strategies attempted yet. Performance stats calculate live.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL AUDIT LEDGER */}
      {activeTab === 'audit' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
          {/* Audit List */}
          <div className="saas-card" style={{ padding: '18px', maxHeight: '550px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={16} color="#0284C7" />
              <span>Immutable SHA-256 Decision Ledger</span>
            </h3>

            {auditLogs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No audit entries recorded yet. Financial audit blocks generate during commerce & recovery events.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedAuditLog(log)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: selectedAuditLog?.id === log.id ? 'var(--bg-elevated)' : 'rgba(255, 255, 255, 0.02)',
                      border: selectedAuditLog?.id === log.id ? '1px solid #0284C7' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.625rem' }}>
                        {log.actor}
                      </span>
                      <span style={{ fontSize: '0.675rem', color: 'var(--text-subtle)' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {log.action}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      {log.summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Inspector Panel */}
          <div className="saas-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38BDF8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Hash size={15} />
              <span>Audit Block Inspector</span>
            </h4>

            {selectedAuditLog ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.775rem' }}>
                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.675rem' }}>BLOCK ID</div>
                  <code>{selectedAuditLog.id}</code>
                </div>

                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.675rem' }}>TIMESTAMP</div>
                  <div>{new Date(selectedAuditLog.timestamp).toISOString()}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.675rem' }}>ACTOR & ACTION</div>
                  <div><strong>{selectedAuditLog.actor}</strong> &rarr; {selectedAuditLog.action}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.675rem' }}>SHA-256 HASH</div>
                  <code style={{ fontSize: '0.65rem', wordBreak: 'break-all', color: '#34D399' }}>
                    {selectedAuditLog.hash || '00000000000000000000000000000000'}
                  </code>
                </div>

                <div>
                  <div style={{ color: 'var(--text-subtle)', fontSize: '0.675rem' }}>PAYLOAD METADATA</div>
                  <pre style={{
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    overflowX: 'auto',
                    fontSize: '0.675rem',
                    color: '#94A3B8'
                  }}>
                    {JSON.stringify(selectedAuditLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.775rem', textAlign: 'center', padding: '30px 0' }}>
                Select any log block on the left to inspect its cryptographic hash and payload details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
