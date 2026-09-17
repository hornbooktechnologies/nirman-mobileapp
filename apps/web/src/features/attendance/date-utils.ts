// Date-only helpers validate input; attendance eligibility and totals belong to the API.
export function workToday(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && validDate(`${value}-01`);
}

export function workMonthRange(month: string) {
  const [year, number] = month.split("-").map(Number);
  return { startDate: `${month}-01`, endDate: `${month}-${String(new Date(Date.UTC(year, number, 0)).getUTCDate()).padStart(2, "0")}` };
}

export function periodError(start: string, end: string) {
  if (!validDate(start) || !validDate(end)) return "Choose valid start and end dates.";
  if (end < start) return "End date must be on or after the start date.";
  if ((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000 >= 366) return "Choose a period of 366 days or fewer.";
  return "";
}
