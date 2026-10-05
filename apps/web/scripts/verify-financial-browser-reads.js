// Run with agent-browser eval --stdin in an authenticated local report page.
// GET requests only; output contains checks and timings, never tokens or amounts.
(async () => {
  const org = localStorage.getItem('nirman-app.activeOrganizationId');
  const project = location.pathname.split('/')[2];
  const token = localStorage.getItem('nirman-app.accessToken');
  if (!org || !project || !token || location.hostname !== 'localhost') {
    throw new Error('Authenticated local project context required');
  }
  const base = `/api/v1/organizations/${org}/projects/${project}`;
  const get = async (route) => {
    const start = performance.now();
    const response = await fetch(base + route, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Read failed with HTTP ${response.status}`);
    const body = await response.json();
    return { data: body.data, ms: Math.round(performance.now() - start) };
  };
  const reads = await Promise.all([
    get('/total-expenses/summary'), get('/total-expenses?pageSize=100'),
    get('/total-expenses?source=WAGES&pageSize=100'),
    get('/total-expenses?source=MATERIALS&pageSize=100'),
    get('/total-expenses?source=SITE_EXPENSES&pageSize=100'),
    get('/kharchi?sortBy=outstandingAmount&sortOrder=desc'),
  ]);
  const cents = (amount) => {
    const [whole, fraction = ''] = amount.split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  };
  const summary = reads[0].data;
  if (cents(summary.totalPaid) !== ['wagesPaid', 'materialsPaid', 'siteExpensesPaid'].reduce((v, k) => v + cents(summary[k]), 0n)) {
    throw new Error('Category totals do not reconcile');
  }
  if (cents(summary.totalPaid) !== summary.months.reduce((v, m) => v + cents(m.totalPaid), 0n)) {
    throw new Error('Monthly totals do not reconcile');
  }
  const cards = reads[1].data;
  if (new Set(cards.items.map((i) => `${i.source}:${i.id}`)).size !== cards.items.length) {
    throw new Error('Duplicate grouped cards');
  }
  if (cards.pagination.total <= 100 && cents(summary.totalPaid) !== cards.items.reduce((v, i) => v + cents(i.periodPaidAmount), 0n)) {
    throw new Error('Cards do not reconcile');
  }
  for (const [index, source] of [[2, 'WAGES'], [3, 'MATERIALS'], [4, 'SITE_EXPENSES']]) {
    if (!reads[index].data.items.every((i) => i.source === source)) throw new Error('Category isolation failed');
  }
  for (const status of ['PAID', 'PARTIALLY_DEDUCTED', 'DEDUCTED']) {
    const filtered = await get(`/kharchi?status=${status}&sortBy=outstandingAmount&sortOrder=asc`);
    if (!filtered.data.items.every((i) => i.status === status)) throw new Error('Kharchi status filter failed');
  }
  return JSON.stringify({ concurrentReads: reads.length, reconciled: true, groupedCards: cards.items.length, timingsMs: reads.map((r) => r.ms), kharchiOutstandingSort: true, kharchiStatusFilters: true });
})()
