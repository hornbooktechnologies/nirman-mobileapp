import {
  UNIT_PRICE_BASES,
  UNIT_PRICE_INPUT_UNITS,
  UNIT_STATUSES,
  type UnitPriceInputUnit,
} from '@nirman-app/shared';

import type { UnitInput } from './types';

export const UNIT_IMPORT_COLUMNS = [
  'unitNumber', 'unitType', 'tower', 'floor', 'areaSqft', 'facing',
  'pricingMethod', 'totalPrice', 'priceUnit', 'ratePerSqft', 'status',
] as const;

export type LocalImportError = { rowNumber: number; code: string; field?: string };
export type ParsedUnitImport = { units: UnitInput[]; errors: LocalImportError[] };

const multipliers: Record<UnitPriceInputUnit, number> = {
  RUPEE: 1,
  LAKH: 100_000,
  CRORE: 10_000_000,
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value.trim()); value = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function positiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseUnitImport(text: string): ParsedUnitImport {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  if (!rows.length) return { units: [], errors: [{ rowNumber: 1, code: 'EMPTY_FILE' }] };
  const headers = rows[0];
  const requiredHeaders = ['unitNumber', 'unitType', 'pricingMethod', 'status'];
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) return { units: [], errors: missing.map((field) => ({ rowNumber: 1, code: 'MISSING_HEADER', field })) };
  if (rows.length === 1) return { units: [], errors: [{ rowNumber: 1, code: 'EMPTY_FILE' }] };
  if (rows.length - 1 > 500) return { units: [], errors: [{ rowNumber: 1, code: 'LIMIT' }] };

  const indexOf = (header: string) => headers.indexOf(header);
  const get = (row: string[], header: string) => row[indexOf(header)]?.trim() ?? '';
  const units: UnitInput[] = [];
  const errors: LocalImportError[] = [];

  rows.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    const unitNumber = get(row, 'unitNumber');
    const unitType = get(row, 'unitType');
    const priceBasis = get(row, 'pricingMethod').toUpperCase();
    const priceUnit = get(row, 'priceUnit').toUpperCase();
    const status = get(row, 'status').toUpperCase();
    const rawArea = get(row, 'areaSqft');
    const rawRate = get(row, 'ratePerSqft');
    const rawTotal = get(row, 'totalPrice');
    const areaSqft = positiveNumber(rawArea);
    const ratePerSqft = positiveNumber(rawRate);
    const totalPrice = positiveNumber(rawTotal);
    const rowErrors: LocalImportError[] = [];
    if (!unitNumber) rowErrors.push({ rowNumber, code: 'REQUIRED', field: 'unitNumber' });
    if (!unitType) rowErrors.push({ rowNumber, code: 'REQUIRED', field: 'unitType' });
    if (!UNIT_PRICE_BASES.includes(priceBasis as never)) rowErrors.push({ rowNumber, code: 'PRICE_METHOD', field: 'pricingMethod' });
    if (!UNIT_STATUSES.includes(status as never) || status === 'BLOCKED' || status === 'BOOKED') rowErrors.push({ rowNumber, code: 'STATUS', field: 'status' });
    if (rawArea && !areaSqft) rowErrors.push({ rowNumber, code: 'POSITIVE_NUMBER', field: 'areaSqft' });
    if (rawRate && !ratePerSqft) rowErrors.push({ rowNumber, code: 'POSITIVE_NUMBER', field: 'ratePerSqft' });
    if (rawTotal && !totalPrice) rowErrors.push({ rowNumber, code: 'POSITIVE_NUMBER', field: 'totalPrice' });
    if (priceBasis === 'TOTAL') {
      if (!totalPrice) rowErrors.push({ rowNumber, code: 'POSITIVE_NUMBER', field: 'totalPrice' });
      if (!UNIT_PRICE_INPUT_UNITS.includes(priceUnit as never)) rowErrors.push({ rowNumber, code: 'PRICE_UNIT', field: 'priceUnit' });
    }
    if (priceBasis === 'PER_SQFT') {
      if (!areaSqft) rowErrors.push({ rowNumber, code: 'POSITIVE_NUMBER', field: 'areaSqft' });
      if (!ratePerSqft) rowErrors.push({ rowNumber, code: 'POSITIVE_NUMBER', field: 'ratePerSqft' });
    }
    errors.push(...rowErrors);
    units.push({
      unitNumber,
      unitType,
      wingTower: get(row, 'tower') || undefined,
      floor: get(row, 'floor') || undefined,
      areaSqft,
      facing: get(row, 'facing') || undefined,
      priceBasis: UNIT_PRICE_BASES.includes(priceBasis as never) ? priceBasis as UnitInput['priceBasis'] : 'TOTAL',
      basePrice: priceBasis === 'TOTAL' && totalPrice && UNIT_PRICE_INPUT_UNITS.includes(priceUnit as never)
        ? totalPrice * multipliers[priceUnit as UnitPriceInputUnit]
        : undefined,
      ratePerSqft,
      status: UNIT_STATUSES.includes(status as never) ? status as UnitInput['status'] : 'AVAILABLE',
    });
  });
  return { units, errors };
}
