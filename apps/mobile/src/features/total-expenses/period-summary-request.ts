/** One scoped period summary request. List/category/page changes reuse it; focus/Refresh force a fresh read. */
export class PeriodSummaryRequest<T> {
  private entry: {
    key: string;
    controller: AbortController;
    promise: Promise<T>;
  } | null = null;
  get key() {
    return this.entry?.key;
  }
  get(
    key: string,
    fetch: (signal: AbortSignal) => Promise<T>,
    force = false,
  ): Promise<T> {
    if (!force && this.entry?.key === key) return this.entry.promise;
    this.cancel();
    const controller = new AbortController();
    const entry = {
      key,
      controller,
      promise: Promise.resolve().then(() => fetch(controller.signal)),
    };
    entry.promise = entry.promise.catch((error) => {
      if (this.entry === entry) this.entry = null;
      throw error;
    });
    this.entry = entry;
    return entry.promise;
  }
  cancel() {
    this.entry?.controller.abort();
    this.entry = null;
  }
}
