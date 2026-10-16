export function visibleHistoryState(state, accountId) {
  if (state.accountId === accountId) return state;
  return { accountId, items: [], total: 0, loading: Boolean(accountId), error: '' };
}
