import { ApiError, asyncHandler, parsePagination } from '../utils/http.js';

// Every operation is scoped to the authenticated owner, including service-role queries.
export function createNotificationHandlers(db) {
  return {
    list: asyncHandler(async (req, res) => {
      const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
      let query = db.from('notifications').select('id,type,entity_type,entity_id,data,read_at,created_at', { count: 'exact' }).eq('user_id', req.user.id);
      if (req.query.unread === 'true') query = query.is('read_at', null);
      const [rows, unread] = await Promise.all([
        query.order('created_at', { ascending: false }).order('id').range(from, to),
        db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).is('read_at', null),
      ]);
      if (rows.error || unread.error) throw new ApiError(500, 'Notifications could not be loaded.', 'NOTIFICATIONS_FAILED');
      res.json({ items: rows.data || [], unread: unread.count ?? 0, pagination: { page, limit, total: rows.count ?? 0 } });
    }),
    update: asyncHandler(async (req, res) => {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.notificationId || '')) throw new ApiError(400, 'Invalid notification reference.', 'INVALID_NOTIFICATION');
      const { data, error } = await db.from('notifications').update({ read_at: req.body.read ? new Date().toISOString() : null }).eq('user_id', req.user.id).eq('id', req.params.notificationId).select('id,read_at').maybeSingle();
      if (error) throw new ApiError(500, 'Notification could not be updated.', 'NOTIFICATION_UPDATE_FAILED');
      if (!data) throw new ApiError(404, 'Notification no longer exists.', 'NOTIFICATION_NOT_FOUND');
      res.json({ notification: data });
    }),
    readAll: asyncHandler(async (req, res) => {
      // A cutoff prevents clearing notifications that arrive after the user clicked.
      const now = new Date().toISOString();
      const before = new Date(Math.min(Date.parse(req.body.before), Date.parse(now))).toISOString();
      const { error } = await db.from('notifications').update({ read_at: now }).eq('user_id', req.user.id).is('read_at', null).lte('created_at', before);
      if (error) throw new ApiError(500, 'Notifications could not be updated.', 'NOTIFICATIONS_UPDATE_FAILED');
      res.json({ ok: true });
    }),
  };
}
