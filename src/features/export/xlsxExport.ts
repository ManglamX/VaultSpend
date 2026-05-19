import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { getAllExpenses } from '../../services/expenseService';
import { getAllIncome } from '../../services/incomeService';
import { getFixedExpenses } from '../../services/fixedExpenseService';
import { getCategories } from '../../services/categoryService';
import { getIncomeCategories } from '../../services/incomeCategoryService';
import type { Expense, Category } from '../../types';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '../../store/authStore';

function fmtDate(ts: number): string {
  return format(new Date(ts), 'dd/MM/yyyy HH:mm');
}

function fmtAmount(n: number): number {
  return Number(n.toFixed(2));
}

function catName(id: number, cats: Category[]): string {
  return cats.find(c => c.id === id)?.name ?? 'Other';
}

function sanitizeString(val: any): string {
  if (typeof val !== 'string') return String(val || '');
  const s = val.trim();
  // Prevent CSV formula injection by prepending a single quote if it starts with special chars
  if (s && /^[=\+\-@\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

function monthlyExpenseSummary(expenses: Expense[], cats: Category[]) {
  const map: Record<string, Record<string, number>> = {};
  expenses.forEach(e => {
    const m = format(new Date(e.date), 'MMM yyyy');
    const c = catName(e.categoryId, cats);
    if (!map[m]) map[m] = {};
    map[m][c] = (map[m][c] || 0) + e.amount;
  });

  const rows: any[][] = [['Month', 'Category', 'Total Spent']];
  Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).forEach(([month, cats]) => {
    Object.entries(cats).forEach(([cat, total]) => {
      rows.push([month, cat, fmtAmount(total)]);
    });
  });
  return rows;
}

function yearlyExpenseSummary(expenses: Expense[], cats: Category[]) {
  const map: Record<string, Record<string, number>> = {};
  expenses.forEach(e => {
    const y = format(new Date(e.date), 'yyyy');
    const c = catName(e.categoryId, cats);
    if (!map[y]) map[y] = {};
    map[y][c] = (map[y][c] || 0) + e.amount;
  });

  const rows: any[][] = [['Year', 'Category', 'Total Spent']];
  Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).forEach(([year, cats]) => {
    Object.entries(cats).forEach(([cat, total]) => {
      rows.push([year, cat, fmtAmount(total)]);
    });
  });
  return rows;
}

export async function exportToXLSX(
  profileId: number,
  dateRange?: { from: number; to: number },
  filename?: string
): Promise<void> {
  // Load all data
  const [expenses, income, fixedExp, cats, incCats] = await Promise.all([
    getAllExpenses(profileId),
    getAllIncome(profileId),
    getFixedExpenses(profileId),
    getCategories(profileId),
    getIncomeCategories(profileId),
  ]);

  // Filter by date range if provided
  const filteredExpenses = dateRange
    ? expenses.filter(e => e.date >= dateRange.from && e.date <= dateRange.to)
    : expenses;
  const filteredIncome = dateRange
    ? income.filter(i => i.date >= dateRange.from && i.date <= dateRange.to)
    : income;

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Transactions ──────────────────────────────────────────────────
  const txRows: any[][] = [['Date', 'Category', 'Amount', 'Note']];
  filteredExpenses.forEach(e => {
    txRows.push([fmtDate(e.date), catName(e.categoryId, cats), fmtAmount(e.amount), sanitizeString(e.note)]);
  });
  const txSheet = XLSX.utils.aoa_to_sheet(txRows);
  txSheet['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions');

  // ── Sheet 2: Income ────────────────────────────────────────────────────────
  const incRows: any[][] = [['Date', 'Source', 'Amount', 'Note']];
  filteredIncome.forEach(i => {
    const sName = incCats.find(c => c.id === i.categoryId)?.name ?? 'Other';
    incRows.push([fmtDate(i.date), sName, fmtAmount(i.amount), sanitizeString(i.note)]);
  });
  const incSheet = XLSX.utils.aoa_to_sheet(incRows);
  incSheet['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, incSheet, 'Income');

  // ── Sheet 3: Fixed Bills ───────────────────────────────────────────────────
  const fixRows: any[][] = [['Name', 'Category', 'Amount', 'Due Day', 'Status']];
  fixedExp.forEach(f => {
    fixRows.push([sanitizeString(f.name), catName(f.categoryId, cats), fmtAmount(f.amount), f.dueDay, f.isActive ? 'Active' : 'Inactive']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fixRows), 'Fixed Bills');

  // ── Sheet 4: Monthly Summary ───────────────────────────────────────────────
  const summaryRows = monthlyExpenseSummary(filteredExpenses, cats);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Monthly Summary');

  // ── Sheet 5: Yearly Summary ────────────────────────────────────────────────
  const ySummaryRows = yearlyExpenseSummary(filteredExpenses, cats);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ySummaryRows), 'Yearly Summary');

  // ── Sheet 6: Net Savings ───────────────────────────────────────────────────
  const monthMap: Record<string, { expenses: number; income: number }> = {};
  filteredExpenses.forEach(e => {
    const m = format(new Date(e.date), 'MMM yyyy');
    if (!monthMap[m]) monthMap[m] = { expenses: 0, income: 0 };
    monthMap[m].expenses += e.amount;
  });
  filteredIncome.forEach(i => {
    const m = format(new Date(i.date), 'MMM yyyy');
    if (!monthMap[m]) monthMap[m] = { expenses: 0, income: 0 };
    monthMap[m].income += i.amount;
  });

  const netRows: any[][] = [['Month', 'Total Income', 'Total Expenses', 'Net Savings', 'Savings %']];
  Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([month, data]) => {
    const net = data.income - data.expenses;
    const pct = data.income > 0 ? ((net / data.income) * 100).toFixed(1) : '—';
    netRows.push([month, fmtAmount(data.income), fmtAmount(data.expenses), fmtAmount(net), pct]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(netRows), 'Net Savings');

  // ── Write & Download ───────────────────────────────────────────────────────
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const dl = filename ?? `vaultspend_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

  if (Capacitor.isNativePlatform()) {
    try {
      const { setPreventAutoLock } = useAuthStore.getState();
      setPreventAutoLock(true);
      // For XLSX, we need to convert the array to base64
      const base64 = b64EncodeUnicode(wbout);
      const result = await Filesystem.writeFile({
        path: dl,
        data: base64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: 'VaultSpend Excel Export',
        url: result.uri,
      });
    } catch (err) {
      console.error('XLSX Share failed', err);
    } finally {
      setTimeout(() => {
        const { setPreventAutoLock } = useAuthStore.getState();
        setPreventAutoLock(false);
      }, 1000);
    }
  } else {
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: dl });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Helper to convert ArrayBuffer to Base64 (needed for Filesystem plugin)
function b64EncodeUnicode(buf: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
