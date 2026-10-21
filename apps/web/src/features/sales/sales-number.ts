export type SalesNumericRule = {
  kind: "decimal" | "integer";
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  message?: string;
};

const DECIMAL = /^(?:\d+|\d*\.\d+)$/;
const INTEGER = /^\d+$/;

export function salesNumberError(
  value: string,
  rule: SalesNumericRule,
): string | undefined {
  if (!value) return undefined;
  const validSyntax = (rule.kind === "integer" ? INTEGER : DECIMAL).test(value);
  const parsed = Number(value);
  const belowMinimum =
    rule.min !== undefined &&
    (rule.exclusiveMin ? parsed <= rule.min : parsed < rule.min);
  const aboveMaximum = rule.max !== undefined && parsed > rule.max;
  if (!validSyntax || !Number.isFinite(parsed) || belowMinimum || aboveMaximum)
    return (
      rule.message ??
      (rule.kind === "integer"
        ? "Enter a valid whole number."
        : "Enter a valid number using digits and one decimal point.")
    );
  return undefined;
}

