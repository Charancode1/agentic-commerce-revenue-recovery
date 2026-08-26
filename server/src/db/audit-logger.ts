import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AuditActionType, AuditActorType, AuditLogEntry } from '../../../shared/types/audit';
import { db } from './db';

class AuditLogger {
  private lastHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor() {
    const existingLogs = db.getAuditLogs(1);
    if (existingLogs.length > 0 && existingLogs[0].hash) {
      this.lastHash = existingLogs[0].hash;
    }
  }

  public record(params: {
    actor: AuditActorType;
    action: AuditActionType;
    summary: string;
    incidentId?: string;
    orderId?: string;
    metadata?: Record<string, any>;
  }): AuditLogEntry {
    const id = `audit_${uuidv4().substring(0, 8)}`;
    const timestamp = new Date().toISOString();

    const payloadToHash = JSON.stringify({
      id,
      timestamp,
      actor: params.actor,
      action: params.action,
      summary: params.summary,
      incidentId: params.incidentId,
      orderId: params.orderId,
      metadata: params.metadata || {},
      prevHash: this.lastHash
    });

    const hash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
    this.lastHash = hash;

    const entry: AuditLogEntry = {
      id,
      timestamp,
      incidentId: params.incidentId,
      orderId: params.orderId,
      actor: params.actor,
      action: params.action,
      summary: params.summary,
      metadata: params.metadata || {},
      hash
    };

    db.appendAuditLog(entry);
    return entry;
  }
}

export const auditLogger = new AuditLogger();
