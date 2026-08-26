import { Request, Response } from 'express';
import { db } from '../db/db';
import { RecoveryAgent } from '../agents/recovery-agent';

export class RecoveryController {
  public static getActiveRecoveries(req: Request, res: Response) {
    const recoveries = db.getRecoveries();
    return res.json({
      success: true,
      count: recoveries.length,
      recoveries
    });
  }

  public static getRecoveryById(req: Request, res: Response) {
    const { id } = req.params;
    const incident = db.getRecoveryById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Recovery incident not found' });
    }
    return res.json({ success: true, incident });
  }

  public static async confirmRecoveryAction(req: Request, res: Response) {
    try {
      const { incidentId, accepted, customerFeedback } = req.body;
      if (!incidentId || typeof accepted !== 'boolean') {
        return res.status(400).json({ success: false, error: 'incidentId and accepted status are required' });
      }

      const updatedIncident = await RecoveryAgent.executeConfirmedRecovery({
        incidentId,
        accepted,
        customerFeedback
      });

      return res.json({
        success: true,
        incident: updatedIncident
      });
    } catch (e: any) {
      console.error('Confirm recovery error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  public static async completeRecoveryPayment(req: Request, res: Response) {
    try {
      const { incidentId, razorpayPaymentId } = req.body;
      if (!incidentId) {
        return res.status(400).json({ success: false, error: 'incidentId is required' });
      }

      const paymentId = razorpayPaymentId || `pay_rec_${Date.now().toString().slice(-8)}`;

      const finalizedIncident = await RecoveryAgent.finalizeSuccessfulRecovery({
        incidentId,
        razorpayPaymentId: paymentId
      });

      return res.json({
        success: true,
        message: 'Recovery payment successfully completed and captured!',
        incident: finalizedIncident
      });
    } catch (e: any) {
      console.error('Complete recovery payment error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  }
}
