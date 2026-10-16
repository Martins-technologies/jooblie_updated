// Neutralize spreadsheet formulas without losing commas, quotes or line breaks.
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function jobsCsv(jobs) {
  const header = ['Job ID','Job title','Company','Origin portal','City','Province','Status','Created'];
  return [header,...jobs.map(job=>[job.id,job.title,job.companies?.name,job.sites?.name,job.city,job.province,job.status,job.created_at])].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export async function loadExportJobs(request, filters, signal) {
  const params = new URLSearchParams(filters);
  params.set('limit','100');
  const rows = [], seen = new Set();
  let total = null;
  for (let page = 1; page <= 100; page++) {
    signal?.throwIfAborted();
    params.set('page',String(page));
    const data = await request('/admin/jobs?'+params,{auth:true,signal,notifyError:false});
    if (!Array.isArray(data.items) || !Number.isFinite(data.pagination?.total)) throw new Error('Export could not be completed. Please try again.');
    if (data.pagination.total > 10000) throw new Error('Narrow your filters to 10,000 jobs or fewer, then export again.');
    if (total !== null && total !== data.pagination.total) throw new Error('Jobs changed during export. Refresh the list and try again.');
    total = data.pagination.total;
    for (const job of data.items) {
      if (!job.id || seen.has(job.id)) throw new Error('Jobs changed during export. Refresh the list and try again.');
      seen.add(job.id); rows.push(job);
    }
    if (rows.length === total) return rows;
    if (rows.length > total || data.items.length < 100) throw new Error('Export was incomplete. Refresh the list and try again.');
  }
  throw new Error('Narrow your filters and try again.');
}
