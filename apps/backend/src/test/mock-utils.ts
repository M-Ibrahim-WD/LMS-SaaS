export function createAsyncMock<TArgs extends unknown[] = unknown[], TResult = unknown>(
  implementation?: (...args: TArgs) => Promise<TResult> | TResult
) {
  const calls: TArgs[] = [];

  const fn = (async (...args: TArgs) => {
    calls.push(args);
    if (!implementation) {
      return undefined as TResult;
    }

    return implementation(...args);
  }) as ((...args: TArgs) => Promise<TResult>) & { calls: TArgs[] };

  fn.calls = calls;
  return fn;
}
