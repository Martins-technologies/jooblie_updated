import { parsePagination } from './http.js';

export function adminQuery(query, sorts, defaultSort = 'created_at') {
  const pagination = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });
  const search = String(query.search || query.q || '').trim().replace(/[^\p{L}\p{N}\s@.\-]/gu, ' ').replace(/\s+/g, ' ').slice(0, 120);
  const sort = sorts.includes(query.sort) ? query.sort : defaultSort;
  return { ...pagination, search, sort, ascending: query.direction === 'asc' };
}
export function pageInfo(page, limit, total) {
  return { page, limit, total: total ?? 0, pages: Math.ceil((total ?? 0) / limit) };
}
export function optionalCount(result) { return result.error ? null : result.count ?? 0; }
