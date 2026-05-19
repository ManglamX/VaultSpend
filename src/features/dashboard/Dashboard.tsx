import React, { useEffect, useMemo, useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonToolbar, useIonAlert, useIonToast
} from '@ionic/react';
import { format } from 'date-fns';
import { useExpenseStore } from '../../store/expenseStore';
import { useIncomeStore } from '../../store/incomeStore';
import { useDateStore } from '../../store/dateStore';
import { useSettingsStore } from '../../store/settingsStore';
import { shouldPromptAutoAdd, markAutoAddSkipped, executeAutoAdd } from '../fixed/autoAdd';
import AddExpenseSheet from '../expenses/AddExpenseSheet';
import AddIncomeSheet from '../income/AddIncomeSheet';
import { useBudgetStore } from '../../store/budgetStore';
import { useProfileStore } from '../../store/profileStore';
import { useAuthStore } from '../../store/authStore';
import { ProfileSwitcher } from './ProfileSwitcher';
import { InsightsWidget } from '../analytics/InsightsWidget';
import type { Expense } from '../../types';
import * as icons from 'lucide-react';
import { EyeOff, Eye, ChevronLeft, ChevronRight, Plus, Minus, Box, Receipt } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { activeProfileId } = useProfileStore();
  const { isLocked } = useAuthStore();
  const { expenses, categories, isLoading: expenseLoading, loadExpenses, loadCategories } = useExpenseStore();
  const { income, isLoading: incomeLoading, loadIncome } = useIncomeStore();
  const { budgets, isLoading: budgetLoading, loadBudgets } = useBudgetStore();
  const isAnyLoading = expenseLoading || incomeLoading || budgetLoading;
  const { viewDate, offsetMonth } = useDateStore();
  const { currency, autoAddBills } = useSettingsStore();

  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [hideAmounts, setHideAmounts] = useState(false);

  useEffect(() => {
    if (!activeProfileId || isLocked) return;
    loadCategories(activeProfileId);
    loadBudgets(activeProfileId);

    // Auto-Add Bills logic
    if (autoAddBills) {
      shouldPromptAutoAdd().then((shouldPrompt) => {
        if (shouldPrompt) {
          presentAlert({
            header: 'New Month Started',
            message: `Do you want to automatically add all active 'Fixed Monthly Bills' for ${format(new Date(), 'MMMM')}?`,
            buttons: [
              {
                text: 'Skip',
                role: 'cancel',
                handler: () => markAutoAddSkipped()
              },
              {
                text: 'Add Bills',
                handler: async () => {
                  if (!activeProfileId) return;
                  const count = await executeAutoAdd(activeProfileId);
                  presentToast({ message: `Added ${count} fixed bills`, duration: 2000, color: 'success' });
                  loadExpenses(activeProfileId, viewDate);
                }
              }
            ]
          });
        }
      });
    }
  }, [activeProfileId, isLocked]); // Reload when profile or lock state changes

  useEffect(() => {
    if (!activeProfileId || isLocked) return;
    loadExpenses(activeProfileId, viewDate);
    loadIncome(activeProfileId, viewDate);
  }, [activeProfileId, viewDate.getMonth(), viewDate.getFullYear(), isLocked]);

  const monthKey  = format(viewDate, 'MMMM yyyy');

  const monthExpenses = expenses;
  const monthIncome = income;

  const totalSpend   = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses]);
  const totalIncome  = useMemo(() => monthIncome.reduce((s, i) => s + i.amount, 0), [monthIncome]);
  const netSavings   = totalIncome - totalSpend;
  const savingsRate  = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : null;



  const recent = monthExpenses.slice(0, 5);
  const getCat = (id: number) => categories.find((c) => c.id === id);

  // Budget progress computation
  const spentByCat = useMemo(() => {
    const m: Record<number, number> = {};
    monthExpenses.forEach(e => { m[e.categoryId] = (m[e.categoryId] || 0) + e.amount; });
    return m;
  }, [monthExpenses]);

  const activeBudgets = useMemo(() =>
    budgets.filter(b => getCat(b.categoryId)),
  [budgets, categories]);

  const handleCloseExpense = () => { setShowAddExpense(false); setEditingExpense(null); };
  const handleEditExpense  = (exp: Expense) => { setEditingExpense(exp); setShowAddExpense(true); };

  return (
    <IonPage className="vs-page-enter">
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'transparent', '--border-style': 'none' }}>
          <div style={{ 
            padding: '1rem 1.25rem 0.5rem', 
            paddingTop: 'calc(env(safe-area-inset-top, 20px) + 1rem)',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start' 
          }}>
            <div>
              <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.2rem' }}>Overview</p>
              <h1 style={{ color: 'var(--vs-text)', fontSize: '1.8rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>VaultSpend</h1>
            </div>
            <div style={{ marginTop: '0.25rem' }}>
              <ProfileSwitcher />
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>

          {/* Month Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button aria-label="Previous Month" onClick={() => offsetMonth(-1)} style={{ background: 'var(--vs-surface)', border: '1px solid var(--vs-border)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.6rem', color: 'var(--vs-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} strokeWidth={1.5} /></button>
            <span style={{ color: 'var(--vs-muted)', fontWeight: 600, fontSize: 'var(--text-body)' }}>{monthKey}</span>
            <button aria-label="Next Month" onClick={() => offsetMonth(1)} style={{ background: 'var(--vs-surface)', border: '1px solid var(--vs-border)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.6rem', color: 'var(--vs-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} strokeWidth={1.5} /></button>
          </div>

          {/* Hero Card */}
          <div style={{ background: 'var(--primary-700)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ color: 'var(--primary-200)', fontSize: 'var(--text-micro)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{format(viewDate, 'MMMM yyyy')}</p>
              <button aria-label="Hide amounts toggle" onClick={() => setHideAmounts(!hideAmounts)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                {hideAmounts ? <EyeOff size={18} color="var(--primary-300)" strokeWidth={1.5} /> : <Eye size={18} color="var(--primary-300)" strokeWidth={1.5} />}
              </button>
            </div>
            {isAnyLoading
              ? <div className="skeleton" style={{ height: '3rem', width: '60%', margin: '0.5rem 0' }} />
              : <p className="amount" style={{ color: '#fff', fontSize: '2rem', fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{hideAmounts ? '••••' : `${currency}${netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</p>
            }
            <p style={{ color: 'var(--primary-300)', fontSize: 'var(--text-caption)', margin: '0 0 1rem' }}>Net Savings</p>
            
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', flex: 1 }}>
                <p style={{ color: 'var(--primary-200)', fontSize: 'var(--text-micro)', fontWeight: 500, margin: '0 0 0.25rem' }}>Income</p>
                {isAnyLoading 
                  ? <div className="skeleton" style={{ height: '1.2rem', width: '80%', opacity: 0.5 }} />
                  : <p className="amount" style={{ color: '#fff', fontSize: 'var(--text-body)', margin: 0 }}>{hideAmounts ? '••••' : `${currency}${totalIncome.toLocaleString('en-IN')}`}</p>
                }
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', flex: 1 }}>
                <p style={{ color: 'var(--primary-200)', fontSize: 'var(--text-micro)', fontWeight: 500, margin: '0 0 0.25rem' }}>Spent</p>
                {isAnyLoading
                  ? <div className="skeleton" style={{ height: '1.2rem', width: '80%', opacity: 0.5 }} />
                  : <p className="amount" style={{ color: '#fff', fontSize: 'var(--text-body)', margin: 0 }}>{hideAmounts ? '••••' : `${currency}${totalSpend.toLocaleString('en-IN')}`}</p>
                }
              </div>
            </div>

            <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, Number(savingsRate || 0)))}%`, background: 'var(--accent-400)', borderRadius: '2px', transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--primary-200)', fontSize: 'var(--text-caption)' }}>Savings rate</span>
              <span className="amount" style={{ color: 'var(--primary-200)', fontSize: 'var(--text-caption)' }}>{hideAmounts ? '••%' : (savingsRate ? `${savingsRate}%` : '0%')}</span>
            </div>
          </div>

          <InsightsWidget />

          {/* Quick Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '1rem 0' }}>
            <button onClick={() => setShowAddExpense(true)} style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-100)', background: 'var(--vs-error-bg)', color: 'var(--vs-error-text)', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontFamily: 'var(--ion-font-family)' }}>
              <Minus size={16} strokeWidth={1.5} /> Add Expense
            </button>
            <button onClick={() => setShowAddIncome(true)} style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-100)', background: 'var(--vs-success-bg)', color: 'var(--vs-success-text)', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontFamily: 'var(--ion-font-family)' }}>
              <Plus size={16} strokeWidth={1.5} /> Add Income
            </button>
          </div>

          {/* Budget Progress Bars */}
          {activeBudgets.length > 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '0' }}>
              <p style={{ color: 'var(--stone-600)', fontSize: 'var(--text-label)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 0.5rem 1rem', letterSpacing: '0.08em' }}>This Month</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeBudgets.map(b => {
                  const cat = getCat(b.categoryId);
                  const spent = spentByCat[b.categoryId] || 0;
                  const pct = Math.min((spent / b.limit) * 100, 100);
                  const barColor = pct >= 100 ? 'var(--danger-400)' : pct >= 80 ? 'var(--accent-400)' : 'var(--primary-400)';
                  const IconCmp = (icons as any)[cat?.icon || ''] || Box;
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', height: '64px', gap: '1rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: cat ? `${cat.color}26` : 'var(--vs-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconCmp size={16} color={cat?.color || 'var(--stone-600)'} strokeWidth={1.5} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ color: 'var(--vs-text)', fontSize: 'var(--text-body)', fontWeight: 600 }}>{cat?.name ?? 'Other'}</span>
                          <span className="amount" style={{ color: 'var(--stone-600)', fontSize: 'var(--text-caption)' }}>
                            {hideAmounts ? '••••' : `${currency}${spent.toLocaleString()} / ${currency}${b.limit.toLocaleString()}`}
                          </span>
                        </div>
                        <div style={{ height: 4, background: 'var(--stone-200)', borderRadius: 2, overflow: 'hidden', marginBottom: '0.2rem' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
                        </div>
                        {pct >= 100 && <p style={{ color: 'var(--danger-500)', fontSize: 'var(--text-micro)', margin: '0', textAlign: 'right' }}>Exceeded</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ padding: '0 1rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--stone-600)', fontWeight: 600, fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent</span>
              <a href="/expenses" style={{ color: 'var(--primary-600)', fontSize: 'var(--text-body)', fontWeight: 500, textDecoration: 'none' }}>See all →</a>
            </div>

            {isAnyLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} style={{ padding: '0.5rem 0', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
                      <div className="skeleton" style={{ height: 10, width: '30%' }} />
                    </div>
                  </div>
                ))
              : recent.length === 0
                ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--stone-500)' }}>
                    <Receipt size={48} color="var(--stone-300)" strokeWidth={1} style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ fontSize: 'var(--text-h2)', color: 'var(--stone-700)', margin: '0 0 0.25rem', fontWeight: 600 }}>Nothing recorded yet</p>
                    <p style={{ fontSize: 'var(--text-body)', margin: 0 }}>Tap the + button to add your first expense</p>
                  </div>
                : recent.map((exp, idx) => {
                    const cat = getCat(exp.categoryId);
                    const IconCmp = (icons as any)[cat?.icon || ''] || Box;
                    return (
                      <button key={exp.id} onClick={() => handleEditExpense(exp)} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 0', gap: '0.75rem', borderTop: idx === 0 ? 'none' : '1px solid var(--vs-border)', width: '100%', background: 'transparent', border: 'none', borderBottom: idx !== recent.length - 1 ? '1px solid var(--stone-300)' : 'none', cursor: 'pointer', animation: `slideInRight 0.3s ease ${idx * 0.05}s both`, textAlign: 'left' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: cat ? `${cat.color}1F` : 'var(--vs-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat?.color ?? 'var(--stone-500)' }}>
                          <IconCmp size={18} strokeWidth={1.5} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'var(--stone-900)', margin: 0, fontWeight: 600, fontSize: 'var(--text-h3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {cat?.name ?? 'Other'}
                            {exp.paymentMode && (
                              <span style={{ display: 'inline-flex', padding: '1px 3px', borderRadius: '3px', background: 'var(--vs-border)', border: '1px solid var(--stone-400)', color: 'var(--stone-600)' }}>
                                {React.createElement(exp.paymentMode === 'Cash' ? icons.Banknote : exp.paymentMode === 'Card' ? icons.CreditCard : exp.paymentMode === 'UPI' ? icons.Smartphone : exp.paymentMode === 'Bank Transfer' ? icons.Building2 : icons.MoreHorizontal, { size: 9 })}
                              </span>
                            )}
                          </p>
                          <p style={{ color: 'var(--stone-600)', margin: '2px 0 0', fontSize: 'var(--text-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.note || cat?.name || 'Expense'}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p className="amount" style={{ color: 'var(--danger-500)', fontWeight: 500, fontSize: 'var(--text-h3)', margin: '0 0 2px' }}>
                            {hideAmounts ? '••••' : `- ${currency}${exp.amount.toLocaleString()}`}
                          </p>
                          <p style={{ color: 'var(--stone-500)', margin: 0, fontSize: 'var(--text-caption)' }}>{format(new Date(exp.date), 'MMM d, h:mm a')}</p>
                        </div>
                      </button>
                    );
                  })
            }
          </div>
        </div>

        <AddExpenseSheet isOpen={showAddExpense} onClose={handleCloseExpense} profileId={activeProfileId || 1} editExpense={editingExpense} />
        <AddIncomeSheet isOpen={showAddIncome} onClose={() => setShowAddIncome(false)} profileId={activeProfileId || 1} />
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
