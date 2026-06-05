export const FORCE_FETCH_FAILURE = false;
export const FORCED_FETCH_FAILURE_SCOPES: string[] = [];
export const FORCED_EMPTY_STATE_SCOPES: string[] = [];

export function throwIfForcedFetchFailure(scope: string) {
  if (!FORCE_FETCH_FAILURE && !FORCED_FETCH_FAILURE_SCOPES.includes(scope)) {
    return;
  }

  throw new Error(`Forced fetch failure for testing: ${scope}`);
}

export function isForcedEmptyState(scope: string) {
  return FORCED_EMPTY_STATE_SCOPES.includes(scope);
}
