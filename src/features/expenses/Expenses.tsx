import React, { useEffect, useState, useMemo } from 'react';
import {
  IonContent, IonHeader, IonPage, IonToolbar, IonSegment, IonSegmentButton, IonLabel,
  IonItemSliding, IonItem, IonItemOptions, IonItemOption, IonSkeletonText
} from '@ionic/react';
import { Plus, Trash2, Edit2, SlidersHorizontal, Search, WalletCards, TrendingUp, Box, XCircle } from 'lucide-react';
import * as icons from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useExpenseStore } from '../../store/expenseStore';
import { useIncomeStore } from '../../store/incomeStore';
import { useDateStore } from '../../store/dateStore';
import { useSettingsStore } from '../../store/settingsStore';
import { deleteExpense } from '../../services/expenseService';
import { deleteIncome } from '../../services/incomeService';
import AddExpenseSheet from './AddExpenseSheet';
import AddIncomeSheet from '../income/AddIncomeSheet';
import FilterSheet from './FilterSheet';
import { applyFilters, DEFAULT_FILTERS, isFiltersActive } from './filters';
import { useProfileStore } from '../../store/profileStore';
import { useAuthStore } from '../../store/authStore';
import type { Expense, Income } from '../../types';

type TabView = 'expenses' | 'income';

function groupByDate<T extends { date: number }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = format(new Date(item.date), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function friendlyDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

const Expenses: React.FC = () => {
  const { expenses, categories, isLoading: expLoading, loadExpenses, loadCategories, removeExpenseLocal } = useExpenseStore();
  const { income, incomeCategories, isLoading: incLoading, loadIncome, loadIncomeCategories, removeIncomeLocal } = useIncomeStore();
  const { viewDate } = useDateStore();
  const { currency } = useSettingsStore();
  const { activeProfileId } = useProfileStore();
  const { isLocked } = useAuthStore();

  const [tab, setTab] = useState<TabView>('expenses');
  const [showAdd, setShowAdd] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const filtersActive = isFiltersActive(filters);

  // Apply search/filter to expenses & income
  const filteredExpenses = useMemo(() => applyFilters(expenses, filters), [expenses, filters]);
  const filteredIncome = useMemo(() => applyFilters(income, filters), [income, filters]);

  const totalExpenseAmount = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
  const totalIncomeAmount = useMemo(() => filteredIncome.reduce((sum, i) => sum + i.amount, 0), [filteredIncome]);

  useEffect(() => {
    if (!activeProfileId || isLocked) return;
    loadCategories(activeProfileId);
    loadIncomeCategories(activeProfileId);
  }, [activeProfileId, isLocked]);

  useEffect(() => {
    if (!activeProfileId || isLocked) return;
    loadExpenses(activeProfileId, viewDate);
    loadIncome(activeProfileId, viewDate);
  }, [activeProfileId, viewDate.getMonth(), viewDate.getFullYear(), isLocked]);

  const getCat = (id: number) => categories.find((c) => c.id === id);

  const handleDeleteExpense = async (id: number) => { await deleteExpense(id); removeExpenseLocal(id); };
  const handleDeleteIncome = async (id: number) => { await deleteIncome(id); removeIncomeLocal(id); };

  const handleEditExpense = (exp: Expense) => { setEditingExpense(exp); setShowAdd(true); };
  const handleEditIncome = (inc: Income) => { setEditingIncome(inc); };

  const handleCloseExpense = () => { setShowAdd(false); setEditingExpense(null); };
  const handleCloseIncome = () => { setEditingIncome(null); };

  const isLoading = expLoading || incLoading;

  // ── Expense List ─────────────────────────────────────────────────────────
  const renderExpenses = () => {
    if (isLoading) return (
      <div style={{ padding: '1rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <IonSkeletonText animated style={{ width: '40px', height: '40px', borderRadius: '50%', margin: 0 }} />
            <div style={{ flex: 1 }}>
              <IonSkeletonText animated style={{ width: '60%', height: '16px', borderRadius: '4px', marginBottom: '4px' }} />
              <IonSkeletonText animated style={{ width: '40%', height: '12px', borderRadius: '4px' }} />
            </div>
            <IonSkeletonText animated style={{ width: '20%', height: '16px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    );

    const list = filteredExpenses;
    if (list.length === 0) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '0.75rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>{filtersActive ? <XCircle size={48} color="var(--stone-300)" strokeWidth={1} /> : <WalletCards size={48} color="var(--stone-300)" strokeWidth={1} />}</div>
        <p style={{ color: 'var(--stone-700)', fontSize: 'var(--text-h2)', margin: 0, fontWeight: 600 }}>{filtersActive ? 'No results found' : 'Nothing recorded yet'}</p>
        <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-body)', margin: 0 }}>{filtersActive ? 'Try a different search term or adjust your filters' : 'Tap the + button to add your first expense'}</p>
      </div>
    );

    const grouped = groupByDate(list);
    return Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map((day) => (
      <div key={day}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1rem 0.4rem' }}>
          <span style={{ color: 'var(--stone-500)', fontWeight: 600, fontSize: 'var(--text-micro)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{friendlyDate(day)}</span>
          <span className="amount" style={{ color: 'var(--stone-500)', fontSize: 'var(--text-caption)' }}>-{currency}{grouped[day].reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
        </div>
        {grouped[day].map((exp, idx) => {
          const cat = getCat(exp.categoryId);
          const IconCmp = (icons as any)[cat?.icon || ''] || Box;
          return (
            <IonItemSliding key={exp.id}>
              <IonItem button onClick={() => handleEditExpense(exp)} lines="none" style={{ '--background': 'transparent', '--padding-start': '1rem', '--inner-padding-end': '1rem', '--min-height': '64px' }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem 0', gap: '0.75rem', borderBottom: idx !== grouped[day].length - 1 ? '1px solid var(--stone-200)' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: cat ? `${cat.color}1F` : 'var(--vs-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat?.color ?? 'var(--stone-500)', flexShrink: 0 }}>
                    <IconCmp size={18} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'var(--stone-900)', fontWeight: 600, margin: 0, fontSize: 'var(--text-h3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {cat?.name ?? 'Other'}
                      {exp.paymentMode && (
                        <span style={{ display: 'inline-flex', padding: '1px 4px', borderRadius: '4px', background: 'var(--vs-elevated)', border: '1px solid var(--stone-200)', color: 'var(--stone-500)' }}>
                          {React.createElement(exp.paymentMode === 'Cash' ? icons.Banknote : exp.paymentMode === 'Card' ? icons.CreditCard : exp.paymentMode === 'UPI' ? icons.Smartphone : exp.paymentMode === 'Bank Transfer' ? icons.Building2 : icons.MoreHorizontal, { size: 10 })}
                        </span>
                      )}
                    </p>
                    <p style={{ color: 'var(--stone-600)', fontSize: 'var(--text-caption)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.note || cat?.name || 'Expense'}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="amount" style={{ color: 'var(--danger-500)', fontWeight: 500, fontSize: 'var(--text-h3)', display: 'block', margin: '0 0 2px' }}>-{currency}{exp.amount.toLocaleString()}</span>
                    <span style={{ color: 'var(--stone-500)', fontSize: 'var(--text-caption)' }}>{format(new Date(exp.date), 'h:mm a')}</span>
                  </div>
                </div>
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption onClick={() => handleEditExpense(exp)} style={{ '--background': 'var(--primary-500)' }}>
                  <Edit2 size={20} color="#fff" strokeWidth={1.5} />
                </IonItemOption>
                <IonItemOption color="danger" onClick={() => handleDeleteExpense(exp.id)} style={{ '--background': 'var(--danger-400)' }}>
                  <Trash2 size={20} color="#fff" strokeWidth={1.5} />
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          );
        })}
      </div>
    ));
  };

  const renderIncome = () => {
    if (incLoading) return (
      <div style={{ padding: '1rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <IonSkeletonText animated style={{ width: '40px', height: '40px', borderRadius: '50%', margin: 0 }} />
            <div style={{ flex: 1 }}>
              <IonSkeletonText animated style={{ width: '60%', height: '16px', borderRadius: '4px', marginBottom: '4px' }} />
              <IonSkeletonText animated style={{ width: '40%', height: '12px', borderRadius: '4px' }} />
            </div>
            <IonSkeletonText animated style={{ width: '20%', height: '16px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    );
    const list = filteredIncome;
    if (list.length === 0) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '0.75rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>{filtersActive ? <XCircle size={48} color="var(--stone-300)" strokeWidth={1} /> : <TrendingUp size={48} color="var(--stone-300)" strokeWidth={1} />}</div>
        <p style={{ color: 'var(--stone-700)', fontSize: 'var(--text-h2)', margin: 0, fontWeight: 600 }}>{filtersActive ? 'No results found' : 'No income recorded'}</p>
        <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-body)', margin: 0 }}>{filtersActive ? 'Try a different search term or adjust your filters' : 'Add your monthly income to see your savings rate'}</p>
      </div>
    );

    const grouped = groupByDate(list);
    return Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map((day) => (
      <div key={day}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1rem 0.4rem' }}>
          <span style={{ color: 'var(--stone-500)', fontWeight: 600, fontSize: 'var(--text-micro)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{friendlyDate(day)}</span>
          <span className="amount" style={{ color: 'var(--primary-500)', fontSize: 'var(--text-caption)' }}>+{currency}{grouped[day].reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
        </div>
        {grouped[day].map((inc, idx) => {
          const cat = incomeCategories.find(c => c.id === inc.categoryId);
          const IconCmp = (icons as any)[cat?.icon || 'TrendingUp'] || TrendingUp;
          return (
            <IonItemSliding key={inc.id}>
              <IonItem button onClick={() => handleEditIncome(inc)} lines="none" style={{ '--background': 'transparent', '--padding-start': '1rem', '--inner-padding-end': '1rem', '--min-height': '64px' }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem 0', gap: '0.75rem', borderBottom: idx !== grouped[day].length - 1 ? '1px solid var(--stone-200)' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: cat ? `${cat.color}1F` : 'rgba(47, 130, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat?.color ?? 'var(--primary-600)', flexShrink: 0 }}>
                    <IconCmp size={18} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'var(--stone-900)', fontWeight: 600, margin: 0, fontSize: 'var(--text-h3)' }}>{cat?.name ?? 'Source'}</p>
                    <p style={{ color: 'var(--stone-600)', fontSize: 'var(--text-caption)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.note || cat?.name || 'Income'}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="amount" style={{ color: 'var(--primary-500)', fontWeight: 500, fontSize: 'var(--text-h3)', display: 'block', margin: '0 0 2px' }}>+{currency}{inc.amount.toLocaleString()}</span>
                    <span style={{ color: 'var(--stone-500)', fontSize: 'var(--text-caption)' }}>{format(new Date(inc.date), 'h:mm a')}</span>
                  </div>
                </div>
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption onClick={() => handleEditIncome(inc)} style={{ '--background': 'var(--primary-500)' }}>
                  <Edit2 size={20} color="#fff" strokeWidth={1.5} />
                </IonItemOption>
                <IonItemOption color="danger" onClick={() => handleDeleteIncome(inc.id)} style={{ '--background': 'var(--danger-400)' }}>
                  <Trash2 size={20} color="#fff" strokeWidth={1.5} />
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          );
        })}
      </div>
    ));
  };

  return (
    <IonPage className="vs-page-enter">
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'transparent', '--border-style': 'none' }}>
          <div style={{ padding: '1rem 1.25rem 0.5rem', paddingTop: 'calc(env(safe-area-inset-top, 20px) + 1rem)' }}>
            <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.2rem' }}>History</p>
            <h1 style={{ color: 'var(--vs-text)', fontSize: '1.8rem', margin: '0 0 1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Transactions</h1>

            {/* Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%', marginBottom: '12px' }}>
              <Search size={16} color="var(--stone-500)" style={{ position: 'absolute', left: 16 }} strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{ width: '100%', height: '40px', background: 'var(--vs-elevated)', borderRadius: 'var(--radius-full)', border: 'none', paddingLeft: '40px', paddingRight: '16px', color: 'var(--vs-text)', fontSize: 'var(--text-body)', outline: 'none' }}
                onFocus={(e) => { e.target.style.background = 'var(--vs-surface)'; e.target.style.boxShadow = '0 0 0 2px var(--primary-400)'; }}
                onBlur={(e) => { e.target.style.background = 'var(--vs-elevated)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Filter Chips Horizontal scroll */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', margin: '0 -4px', padding: '0 4px', scrollbarWidth: 'none', WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)', alignItems: 'center' }}>
              <button onClick={() => setShowFilter(true)} style={{ height: '34px', borderRadius: 'var(--radius-full)', background: filtersActive ? 'var(--primary-600)' : 'var(--vs-elevated)', border: `1px solid ${filtersActive ? 'var(--primary-600)' : 'var(--vs-border)'}`, color: filtersActive ? '#fff' : 'var(--stone-700)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 'var(--text-label)', fontWeight: 500, flexShrink: 0 }}>
                <SlidersHorizontal size={14} strokeWidth={1.5} color={filtersActive ? '#fff' : 'var(--primary-600)'} />
                Filter {filtersActive && `(${filters.categoryIds.length + (filters.search ? 1 : 0) + (filters.dateRange ? 1 : 0)})`}
              </button>

              <IonSegment value={tab} onIonChange={(e) => setTab(e.detail.value as TabView)} style={{ '--background': 'var(--vs-elevated)', borderRadius: 'var(--radius-full)', minWidth: 160, minHeight: 34, flexShrink: 0 }}>
                <IonSegmentButton value="expenses" style={{ minHeight: 30, '--color': 'var(--stone-600)', '--color-checked': 'var(--stone-900)' }}><IonLabel style={{ margin: '0', fontSize: 'var(--text-label)' }}>Expenses</IonLabel></IonSegmentButton>
                <IonSegmentButton value="income" style={{ minHeight: 30, '--color': 'var(--stone-600)', '--color-checked': 'var(--stone-900)' }}><IonLabel style={{ margin: '0', fontSize: 'var(--text-label)' }}>Income</IonLabel></IonSegmentButton>
              </IonSegment>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', padding: '0 8px', height: '34px', borderRadius: 'var(--radius-full)', background: 'var(--vs-surface)', border: '1px solid var(--vs-border)', flexShrink: 0 }}>
                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--vs-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total</span>
                <span style={{ fontSize: 'var(--text-label)', color: tab === 'expenses' ? '#E15A5A' : '#2F8253', fontWeight: 700 }}>
                  {currency}{(tab === 'expenses' ? totalExpenseAmount : totalIncomeAmount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ paddingBottom: '6rem' }}>
          {tab === 'expenses' ? renderExpenses() : renderIncome()}
        </div>

        <AddExpenseSheet isOpen={showAdd} onClose={handleCloseExpense} profileId={activeProfileId || 1} editExpense={editingExpense} />
        <AddIncomeSheet isOpen={!!editingIncome} onClose={handleCloseIncome} profileId={activeProfileId || 1} editIncome={Object.keys(editingIncome || {}).length > 0 ? editingIncome : null} />
        <FilterSheet
          isOpen={showFilter}
          onClose={() => setShowFilter(false)}
          filters={filters}
          categories={tab === 'expenses' ? categories : (incomeCategories as any)}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />
      </IonContent>

      <button
        onClick={() => { if (tab === 'expenses') setShowAdd(true); else setEditingIncome({} as Income); }}
        style={{
          position: 'fixed', bottom: 'calc(var(--vs-tab-height) + 8px + env(safe-area-inset-bottom))', right: '16px',
          width: '56px', height: '56px', borderRadius: 'var(--radius-full)',
          background: 'var(--primary-600)', color: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(39, 107, 68, 0.40), 0 2px 8px rgba(39, 107, 68, 0.20)',
          transition: 'transform 120ms var(--ease-spring), box-shadow 120ms ease'
        }}
        onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(39, 107, 68, 0.20)'; }}
        onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(39, 107, 68, 0.40), 0 2px 8px rgba(39, 107, 68, 0.20)'; }}
        onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(39, 107, 68, 0.40), 0 2px 8px rgba(39, 107, 68, 0.20)'; }}
      >
        <Plus size={24} strokeWidth={2} />
      </button>
    </IonPage>
  );
};

export default Expenses;
