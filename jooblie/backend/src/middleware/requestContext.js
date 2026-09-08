import crypto from 'node:crypto';

function cleanIp(value) {
  if (!value) return null;
  return String(value).replace(/^::ffff:/, '');
}

function requestIdFromHeader(req) {
  const value = String(req.get('x-request-id') || '').trim();
  if (!value) return null;

  // Keep externally supplied IDs log-safe and bounded. UUIDs and common trace IDs pass.
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(value)) return null;
  return value;
}

export function requestContext(req, res, next) {
  req.requestId = requestIdFromHeader(req) || crypto.randomUUID();
  req.clientIp = cleanIp(req.ip || req.socket?.remoteAddress);
  req.serverIp = cleanIp(req.socket?.localAddress);

  res.setHeader('x-request-id', req.requestId);
  next();
}
