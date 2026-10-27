/** Owns one screen read; filters/context changes supersede older requests. */
export class AttendanceReadRequest {
  private generation = 0;
  private active: { key: string; controller: AbortController } | null = null;

  start(key: string) {
    if (this.active?.key === key) return null;
    this.cancel();
    const generation = this.generation;
    const controller = new AbortController();
    this.active = { key, controller };
    const isCurrent = () =>
      this.generation === generation && !controller.signal.aborted;
    return {
      signal: controller.signal,
      isCurrent,
      finish: () => {
        if (isCurrent()) this.active = null;
      },
    };
  }
  cancel() {
    this.generation++;
    this.active?.controller.abort();
    this.active = null;
  }
}
