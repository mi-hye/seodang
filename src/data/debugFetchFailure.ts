export const FORCE_FETCH_FAILURE = false;
export const FORCED_FETCH_FAILURE_SCOPES: string[] = [];

export function throwIfForcedFetchFailure(scope: string) {
  if (!FORCE_FETCH_FAILURE && !FORCED_FETCH_FAILURE_SCOPES.includes(scope)) {
    return;
  }

  throw new Error(`Forced fetch failure for testing: ${scope}`);
}
