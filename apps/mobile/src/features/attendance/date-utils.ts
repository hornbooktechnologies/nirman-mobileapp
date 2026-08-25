import { formatDateOnly, parseDateOnly } from '../../lib/validation';

export function todayDateOnly() {
  return formatDateOnly(new Date());
}

export function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const finalDay = new Date(year, monthNumber, 0).getDate();
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(finalDay).padStart(2, '0')}`,
  };
}

export function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthValue(new Date(year, monthNumber - 1 + amount, 1, 12));
}

export function clampDateToMonth(date: string, month: string) {
  if (date.startsWith(`${month}-`)) return date;
  const { startDate, endDate } = monthRange(month);
  const today = todayDateOnly();
  return today >= startDate && today <= endDate ? today : endDate;
}

export function calendarDays(month: string) {
  const { startDate, endDate } = monthRange(month);
  const first = parseDateOnly(startDate)!;
  const last = parseDateOnly(endDate)!;
  const leadingEmptyCount = (first.getDay() + 6) % 7;
  const values: Array<string | null> = Array.from({ length: leadingEmptyCount }, () => null);
  for (let date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
    values.push(formatDateOnly(date));
  }
  return values;
}
