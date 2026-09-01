import { Request, Response } from 'express';
import { db, liveEventBus } from '../db/db';
import { DashboardMetrics, FailureCategory, RecoveryStrategyType } from '../../../shared/types/recovery';

export class DashboardController {
  public static getMetrics(req: Request, res: Response) {
    const recoveries = db.getRecoveries();

    let totalRevenueAtRisk = 0;
    let totalRecoveredRevenue = 0;
    let activeIncidentsCount = 0;

    const failureCounts: Record<FailureCategory, { count: number; amount: number }> = {
      BANK_OTP_TIMEOUT: { count: 0, amount: 0 },
      CARD_DECLINED_INSUFFICIENT_FUNDS: { count: 0, amount: 0 },
      NETWORK_GATEWAY_DROPOUT: { count: 0, amount: 0 },
      CART_ABANDONMENT_AT_CHECKOUT: { count: 0, amount: 0 },
      UPI_INTENT_REJECTED: { count: 0, amount: 0 },
      AUTHENTICATION_FAILED: { count: 0, amount: 0 }
    };

    const strategyStats: Record<RecoveryStrategyType, { attempted: number; converted: number }> = {
      SWITCH_TO_UPI_INTENT: { attempted: 0, converted: 0 },
      ONE_CLICK_PAYMENT_LINK: { attempted: 0, converted: 0 },
      BOUNDED_CONCESSION_DISCOUNT: { attempted: 0, converted: 0 },
      INVENTORY_RESERVATION_REMINDER: { attempted: 0, converted: 0 },
      SPLIT_PAYMENT_OFFER: { attempted: 0, converted: 0 }
    };

    for (const rec of recoveries) {
      totalRevenueAtRisk += rec.amountAtRisk;

      if (rec.status === 'RECOVERED') {
        totalRecoveredRevenue += rec.recoveredAmount || rec.amountAtRisk;
      } else if (rec.status !== 'DECLINED_BY_CUSTOMER' && rec.status !== 'EXPIRED') {
        activeIncidentsCount += 1;
      }

      if (failureCounts[rec.failureCategory]) {
        failureCounts[rec.failureCategory].count += 1;
        failureCounts[rec.failureCategory].amount += rec.amountAtRisk;
      }

      if (rec.recoveryProposal?.strategy && strategyStats[rec.recoveryProposal.strategy]) {
        strategyStats[rec.recoveryProposal.strategy].attempted += 1;
        if (rec.status === 'RECOVERED') {
          strategyStats[rec.recoveryProposal.strategy].converted += 1;
        }
      }
    }

    const recoveryRatePercentage =
      totalRevenueAtRisk > 0 ? Math.round((totalRecoveredRevenue / totalRevenueAtRisk) * 1000) / 10 : 0;

    const topFailureReasons = Object.entries(failureCounts)
      .map(([cat, data]) => ({
        category: cat as FailureCategory,
        count: data.count,
        amount: data.amount
      }))
      .sort((a, b) => b.amount - a.amount);

    const performance = Object.entries(strategyStats).map(([strategy, data]) => ({
      strategy: strategy as RecoveryStrategyType,
      attempted: data.attempted,
      converted: data.converted
    }));

    const metrics: DashboardMetrics = {
      totalRevenueAtRisk,
      totalRecoveredRevenue,
      recoveryRatePercentage,
      activeIncidentsCount,
      totalIncidentsCount: recoveries.length,
      averageRecoveryTimeSeconds: 42,
      topFailureReasons,
      strategyPerformance: performance
    };

    return res.json({
      success: true,
      metrics
    });
  }

  public static getAuditTrail(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string || '100', 10);
    const logs = db.getAuditLogs(limit);
    return res.json({
      success: true,
      count: logs.length,
      logs
    });
  }

  public static resetData(req: Request, res: Response) {
    db.resetData();
    return res.json({
      success: true,
      message: 'All demo business data reset successfully.'
    });
  }

  public static streamEvents(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onAudit = (entry: any) => {
      res.write(`event: audit\ndata: ${JSON.stringify(entry)}\n\n`);
    };

    const onRecovery = (rec: any) => {
      res.write(`event: recovery\ndata: ${JSON.stringify(rec)}\n\n`);
    };

    const onOrder = (order: any) => {
      res.write(`event: order\ndata: ${JSON.stringify(order)}\n\n`);
    };

    liveEventBus.on('audit:new', onAudit);
    liveEventBus.on('recovery:update', onRecovery);
    liveEventBus.on('order:update', onOrder);

    // Initial ping
    res.write(`event: ping\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);

    req.on('close', () => {
      liveEventBus.removeListener('audit:new', onAudit);
      liveEventBus.removeListener('recovery:update', onRecovery);
      liveEventBus.removeListener('order:update', onOrder);
      res.end();
    });
  }
}
