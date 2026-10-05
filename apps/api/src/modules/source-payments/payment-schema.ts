export function isMissingPaymentSchema(error: unknown): boolean {
  const e = error as { code?: string; sqlMessage?: string };
  return (
    e?.code === "ER_NO_SUCH_TABLE" &&
    ["material_purchase_payments", "site_expense_payments"].some((table) =>
      e.sqlMessage?.includes(table),
    )
  );
}
export const paymentSchemaError = {
  code: "PAYMENT_TRACKING_UNAVAILABLE",
  message:
    "Payment tracking is not available yet. Complete the approved database rollout before using paid spending reports.",
};
