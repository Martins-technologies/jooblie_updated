import { serviceDb } from '../config/supabase.js';
import { logger } from '../config/logger.js';

function requestMetadata(req, extra = {}) {
  return {
    request_id: req.requestId || null,
    client_ip: req.clientIp || null,
    server_ip: req.serverIp || null,
    user_agent: req.get?.('user-agent') || null,
    route: req.originalUrl || null,
    method: req.method || null,
    ...extra,
  };
}

export async function writeAuditLog(req, {
  action,
  entityType = 'system',
  entityId = null,
  companyId = null,
  outcome = 'success',
  metadata = {},
} = {}) {
  try {
    const { error } = await serviceDb.from('activity_log').insert({
      actor_id: req.user?.id || null,
      action,
      entity_type: entityType || 'system',
      entity_id: entityId || null,
      site_id: req.site?.id || null,
      company_id: companyId || null,
      data: requestMetadata(req, { outcome, ...metadata }),
    });

    if (error) throw error;
  } catch (error) {
    logger.warn({ err: error, requestId: req.requestId }, 'Activity log write failed');
  }
}

export async function writeSecurityEvent(req, {
  eventType,
  severity = 'medium',
  metadata = {},
} = {}) {
  try {
    const { error } = await serviceDb.from('security_events').insert({
      user_id: req.user?.id || null,
      event_type: eventType,
      severity,
      request_id: req.requestId || null,
      client_ip: req.clientIp || null,
      server_ip: req.serverIp || null,
      site_id: req.site?.id || null,
      data: requestMetadata(req, metadata),
    });

    if (error) throw error;
  } catch (error) {
    logger.warn({ err: error, requestId: req.requestId }, 'Security event write failed');
  }
}
