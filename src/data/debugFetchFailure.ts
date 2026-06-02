export const FORCE_FETCH_FAILURE = false;

export function throwIfForcedFetchFailure(scope: string) {
  if (!FORCE_FETCH_FAILURE) {
    return;
  }

  throw new Error(`Forced fetch failure for testing: ${scope}`);
}
