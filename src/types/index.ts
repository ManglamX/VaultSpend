// ─── Core Domain Types ──────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  icon: string;   // emoji
  color: string;  // hex
  profileId: number;
  isDefault?: boolean;
}

export type PaymentMode = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';

export interface Expense {
  id: number;
  amount: number;
  categoryId: number;
  categoryName?: string;
  note: string;
  date: number; // Unix timestamp ms
  paymentMode: PaymentMode;
  profileId: number;
  receiptBase64?: string;
}

export interface Income {
  id: number;
  amount: number;
  categoryId: number;
  note: string;
  date: number;
  profileId: number;
  paymentMode?: PaymentMode;
  receiptBase64?: string;
}

export interface IncomeCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
  profileId: number;
  isDefault?: boolean;
}

export interface FixedExpense {
  id: number;
  name: string;
  amount: number;
  dueDay: number;      // 1-28
  categoryId: number;
  isActive: boolean;
  notes: string;
  paymentMode: PaymentMode;
  profileId: number;
}

export interface Budget {
  id: number;
  categoryId: number;
  limit: number;
  period: 'monthly' | 'weekly';
  profileId: number;
}

export interface Profile {
  id: number;
  name: string;
  currency: string;
  createdAt: number;
}

export interface Bill {
  id: number;
  amount: number;
  categoryId: number;
  dueDate: number; // Unix ms
  notes: string;
  isPaid: boolean;
  paymentMode: PaymentMode;
  profileId: number;
  notifyOption: 'due_date' | 'week_before' | 'daily' | 'none';
  name: string;
}


// ─── Form Types ──────────────────────────────────────────────────────────────

export interface AddExpenseFormData {
  amount: string;
  categoryId: number;
  note: string;
  date: string;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface MonthSummary {
  totalExpenses: number;
  totalIncome: number;
  net: number;
  topCategory: string;
}
