export function expenseFailure(status?: number, code?: string) {
  if (status === 401 || status === 403 || code === 'PROJECT_STATUS_INVALID') return 'denied';
  if (status === 409 || ['EXPENSE_STATUS_TRANSITION_INVALID', 'EXPENSE_ACTION_NOT_ALLOWED', 'EXPENSE_SELF_APPROVAL_FORBIDDEN', 'EXPENSE_RECOGNIZED_AMOUNT_NEGATIVE'].includes(code ?? '')) return 'stale';
  return !status || status === 408 || status >= 500 ? 'uncertain' : 'rejected';
}

// Keep the entire original command, including version and key, across uncertain retries.
export class ExpenseAttempt<T> {
  input: T | null = null;
  busy = false;
  start(input: T): T | null {
    if (this.busy) return null;
    this.busy = true;
    this.input ??= input;
    return this.input;
  }
  finish(retain = false) {
    this.busy = false;
    if (!retain) this.input = null;
  }
}
