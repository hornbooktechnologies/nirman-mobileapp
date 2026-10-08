/** A per-control lock: repeated refreshes share the in-flight request. */
export function createRefreshGate() {
  let pending: Promise<unknown> | undefined;
  let busy = false;
  const listeners = new Set<() => void>();
  const publish = (value: boolean) => { busy = value; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => busy,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    run(action: () => unknown): Promise<unknown> {
      if (pending) return pending;
      // Defer invocation so the lock exists even for synchronous/reentrant calls.
      pending = Promise.resolve().then(action).finally(() => { pending = undefined; publish(false); });
      publish(true);
      return pending;
    },
  };
}

/** Wait for every parallel read before reporting a failure to its existing handler. */
export async function refreshTogether<const T extends readonly unknown[]>(requests: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
  const results = await Promise.allSettled(requests);
  const failure = results.find(result => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
  return results.map(result => (result as PromiseFulfilledResult<unknown>).value) as { -readonly [P in keyof T]: Awaited<T[P]> };
}
