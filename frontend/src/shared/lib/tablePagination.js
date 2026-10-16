export function tablePageTokens(currentPage, totalPages) {
  const total = Math.max(1, Number.isFinite(Number(totalPages)) ? Math.floor(Number(totalPages)) : 1);
  const page = Math.max(1, Math.min(total, Number.isFinite(Number(currentPage)) ? Math.floor(Number(currentPage)) : 1));
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const start = page <= 3 ? 1 : page >= total-2 ? Math.max(2,total-2) : Math.max(2, page-1);
  const end = page >= total - 2 ? total : Math.min(total - 1, Math.max(3, page + 1));
  const selected = new Set([1,total]);
  for (let value = start; value <= end; value++) selected.add(value);
  const pages = [...selected].sort((a,b) => a-b), tokens = [];
  pages.forEach((value,index) => {
    const previous=pages[index-1];
    if (previous && value-previous===2) tokens.push(previous+1);
    else if (previous && value-previous>2) tokens.push(`gap-${previous}`);
    tokens.push(value);
  });
  return tokens;
}
