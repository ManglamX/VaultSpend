import type { PaymentMode } from '../../types';

export interface ExpenseFilters {
  search: string;
  categoryIds: number[];
  dateRange: { from: number; to: number } | null;
  amountMin: number | null;
  amountMax: number | null;
  sortBy: 'date' | 'amount' | 'category';
  sortDir: 'asc' | 'desc';
  paymentModes: PaymentMode[];
}

export const DEFAULT_FILTERS: ExpenseFilters = {
  search: '',
  categoryIds: [],
  dateRange: null,
  amountMin: null,
  amountMax: null,
  sortBy: 'date',
  sortDir: 'desc',
  paymentModes: [],
};

export function isFiltersActive(f: ExpenseFilters): boolean {
  return (
    f.search.trim() !== '' ||
    f.categoryIds.length > 0 ||
    f.dateRange !== null ||
    f.amountMin !== null ||
    f.amountMax !== null ||
    f.sortBy !== 'date' ||
    f.sortDir !== 'desc' ||
    f.paymentModes.length > 0
  );
}

export function applyFilters<T extends { note: string; categoryId: number; date: number; amount: number; paymentMode?: PaymentMode }>(
  items: T[],
  filters: ExpenseFilters
): T[] {
  let result = [...items];

  // Full-text search on note
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(e => e.note.toLowerCase().includes(q));
  }

  // Category filter
  if (filters.categoryIds.length > 0) {
    result = result.filter(e => filters.categoryIds.includes(e.categoryId));
  }

  // Date range
  if (filters.dateRange) {
    result = result.filter(e => e.date >= filters.dateRange!.from && e.date <= filters.dateRange!.to);
  }

  // Amount range
  if (filters.amountMin !== null) result = result.filter(e => e.amount >= filters.amountMin!);
  if (filters.amountMax !== null) result = result.filter(e => e.amount <= filters.amountMax!);

  // Payment Mode
  if (filters.paymentModes.length > 0) {
    result = result.filter(e => e.paymentMode && filters.paymentModes.includes(e.paymentMode));
  }

  // Sorting
  result.sort((a, b) => {
    let cmp = 0;
    if (filters.sortBy === 'date') cmp = a.date - b.date;
    else if (filters.sortBy === 'amount') cmp = a.amount - b.amount;
    else if (filters.sortBy === 'category') cmp = a.categoryId - b.categoryId;
    return filters.sortDir === 'asc' ? cmp : -cmp;
  });

  return result;
}
