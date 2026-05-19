import React, { useEffect, useMemo, useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonToolbar,
  IonItemSliding, IonItem, IonItemOptions, IonItemOption,
} from '@ionic/react';
import {
  Trash2, Target, Plus, Box, Clock,
  CheckCircle2, ChevronRight, Edit2
} from 'lucide-react';
import * as icons from 'lucide-react';
import { useExpenseStore } from '../../store/expenseStore';
import { useBudgetStore } from '../../store/budgetStore';
import { useBillStore } from '../../store/billStore';
import { deleteBudget } from '../../services/budgetService';
import { deleteBill, updateBill } from '../../services/billService';
import { useDateStore } from '../../store/dateStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useProfileStore } from '../../store/profileStore';
import { useAuthStore } from '../../store/authStore';
import AddBudgetSheet from './AddBudgetSheet';
import AddBillSheet from './AddBillSheet';
import { format } from 'date-fns';

const Budgets: React.FC = () => {
  const { expenses, categories, loadCategories, loadExpenses } = useExpenseStore();
  const { budgets, loadBudgets, removeBudgetLocal, isLoading: budgetLoading } = useBudgetStore();
  const { bills, loadBills, removeBillLocal, updateBillLocal, isLoading: billLoading } = useBillStore();
  const { activeProfileId } = useProfileStore();
  const { isLocked } = useAuthStore();
  const { viewDate } = useDateStore();
  const { currency } = useSettingsStore();

  const [tab, setTab] = useState<'monthly' | 'bills'>('monthly');
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  useEffect(() => {
    if (!activeProfileId || isLocked) return;
    loadCategories(activeProfileId);
    loadBudgets(activeProfileId);
    loadBills(activeProfileId);
  }, [activeProfileId, isLocked]);

  useEffect(() => {
    if (!activeProfileId || isLocked) return;
    loadExpenses(activeProfileId, viewDate);
  }, [activeProfileId, viewDate.getMonth(), viewDate.getFullYear(), isLocked]);

  const handleDeleteBudget = async (id: number) => {
    await deleteBudget(id);
    removeBudgetLocal(id);
  };

  const handleDeleteBill = async (id: number) => {
    await deleteBill(id);
    removeBillLocal(id);
  };

  const handleTogglePaid = async (bill: any) => {
    const updated = { ...bill, isPaid: !bill.isPaid };
    await updateBill(bill.id, updated);
    updateBillLocal(updated);
  };

  const getCat = (id: number) => categories.find((c) => c.id === id);

  const spentByCat = useMemo(() => {
    const totals: Record<number, number> = {};
    expenses.forEach((e) => {
      totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
    });
    return totals;
  }, [expenses]);

  const isLoading = budgetLoading || billLoading;

  return (
    <IonPage className="vs-page-enter">
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'transparent', '--border-style': 'none' }}>
          <div style={{ padding: '1rem 1.25rem 0.5rem', paddingTop: 'calc(env(safe-area-inset-top, 20px) + 1rem)' }}>
            <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.2rem' }}>Financial Goals</p>
            <h1 style={{ color: 'var(--vs-text)', fontSize: '1.8rem', margin: '0 0 1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Planning</h1>

            <div style={{ display: 'flex', background: 'var(--vs-surface)', padding: '0.35rem', borderRadius: '14px', border: '1px solid var(--vs-border)' }}>
              {(['monthly', 'bills'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
                    background: tab === t ? 'var(--vs-elevated)' : 'transparent',
                    color: tab === t ? 'var(--primary-400)' : 'var(--stone-500)',
                    border: 'none', transition: 'all 0.2s ease'
                  }}
                >
                  {t === 'monthly' ? 'Category Budgets' : 'Bills & Trackers'}
                </button>
              ))}
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {isLoading ? (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 100, background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)' }} />)}
          </div>
        ) : tab === 'monthly' ? (
          /* Monthly Budgets List */
          budgets.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '0.5rem' }}>
              <Target size={40} color="var(--stone-300)" />
              <p style={{ color: 'var(--stone-500)' }}>No category budgets set</p>
            </div>
          ) : (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {budgets.map((budget) => {
                const cat = getCat(budget.categoryId);
                if (!cat) return null;
                const spent = spentByCat[budget.categoryId] || 0;
                const ratio = Math.min(spent / budget.limit, 1);
                const isOver = spent >= budget.limit;
                const barColor = isOver ? 'var(--danger-400)' : ratio > 0.8 ? 'var(--accent-400)' : 'var(--primary-500)';
                const IconCmp = (icons as any)[cat.icon] || Box;

                return (
                  <IonItemSliding key={budget.id}>
                    <IonItem style={{ '--background': 'transparent', '--padding-start': '0', '--inner-padding-end': '0', '--border-width': '0' }}>
                      <div style={{ width: '100%', background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid var(--vs-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: `${cat.color}1F`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IconCmp size={18} strokeWidth={1.5} />
                            </span>
                            <span style={{ color: 'var(--vs-text)', fontWeight: 600 }}>{cat.name}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ color: isOver ? 'var(--danger-500)' : 'var(--stone-900)', fontWeight: 700 }}>{currency}{spent.toLocaleString()}</span>
                            <span style={{ color: 'var(--stone-500)', fontSize: '0.75rem' }}> / {currency}{budget.limit.toLocaleString()}</span>
                          </div>
                        </div>
                        <div style={{ height: '8px', background: 'var(--vs-elevated)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${ratio * 100}%`, background: barColor, borderRadius: '8px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption
                        onClick={() => { setEditingBudget(budget); setShowAddBudget(true); }}
                        style={{ '--background': 'var(--primary-600)' }}
                      >
                        <Edit2 size={20} color="#fff" />
                      </IonItemOption>
                      <IonItemOption onClick={() => handleDeleteBudget(budget.id)} style={{ '--background': 'var(--danger-400)' }}>
                        <Trash2 size={20} color="#fff" />
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                );
              })}
            </div>
          )
        ) : (
          /* Bills & Trackers List */
          bills.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '0.5rem' }}>
              <Clock size={40} color="var(--stone-300)" />
              <p style={{ color: 'var(--stone-500)' }}>No bills or product trackers</p>
            </div>
          ) : (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {bills.map((bill) => {
                const isOverdue = !bill.isPaid && bill.dueDate < Date.now();
                const daysLeft = Math.ceil((bill.dueDate - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <IonItemSliding key={bill.id}>
                    <IonItem style={{ '--background': 'transparent', '--padding-start': '0', '--inner-padding-end': '0', '--border-width': '0' }}>
                      <div style={{ width: '100%', background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: bill.isPaid ? '1px solid var(--vs-border)' : isOverdue ? '1px solid var(--danger-900)' : '1px solid var(--primary-900)', position: 'relative', opacity: bill.isPaid ? 0.7 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div onClick={() => handleTogglePaid(bill)} style={{ cursor: 'pointer' }}>
                              {bill.isPaid ? <CheckCircle2 size={24} color="var(--primary-500)" /> : <div style={{ width: 22, height: 22, border: '2px solid var(--stone-600)', borderRadius: '50%' }} />}
                            </div>
                            <div>
                              <h3 style={{ color: bill.isPaid ? 'var(--stone-500)' : 'var(--vs-text)', margin: 0, fontWeight: 700, fontSize: '1rem', textDecoration: bill.isPaid ? 'line-through' : 'none' }}>{bill.name}</h3>
                              <p style={{ color: 'var(--stone-500)', fontSize: '0.75rem', margin: '2px 0 0' }}>{format(bill.dueDate, 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, color: 'var(--vs-text)', fontWeight: 700, fontSize: '1.1rem' }}>{currency}{bill.amount.toLocaleString()}</p>
                            {!bill.isPaid && (
                              <span style={{ fontSize: '0.7rem', color: isOverdue ? 'var(--danger-500)' : 'var(--primary-400)', fontWeight: 600 }}>
                                {isOverdue ? 'OVERDUE' : `${daysLeft} days left`}
                              </span>
                            )}
                          </div>
                        </div>
                        {bill.notes && <p style={{ color: 'var(--stone-500)', fontSize: '0.8rem', margin: '0.5rem 0 0', padding: '0.5rem', background: 'var(--vs-elevated)', borderRadius: '8px' }}>{bill.notes}</p>}
                        <button onClick={() => { setEditingBill(bill); setShowAddBill(true); }} style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--stone-500)' }}><ChevronRight size={18} /></button>
                      </div>
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption onClick={() => handleDeleteBill(bill.id)} style={{ '--background': 'var(--danger-400)' }}>
                        <Trash2 size={20} color="#fff" />
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                );
              })}
            </div>
          )
        )}

        <AddBudgetSheet
          isOpen={showAddBudget}
          onClose={() => { setShowAddBudget(false); setEditingBudget(null); }}
          profileId={activeProfileId || 1}
          editBudget={editingBudget}
        />
        <AddBillSheet isOpen={showAddBill} onClose={() => { setShowAddBill(false); setEditingBill(null); }} profileId={activeProfileId || 1} editBill={editingBill} />
      </IonContent>

      <button
        onClick={() => { if (tab === 'monthly') setShowAddBudget(true); else setShowAddBill(true); }}
        style={{
          position: 'fixed', bottom: 'calc(var(--vs-tab-height) + 0px + env(safe-area-inset-bottom))', right: '16px',
          width: '56px', height: '56px', borderRadius: 'var(--radius-full)',
          background: 'var(--primary-600)', color: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(39, 107, 68, 0.40), 0 2px 8px rgba(39, 107, 68, 0.20)',
          transition: 'transform 120ms var(--ease-spring), box-shadow 120ms ease'
        }}
      >
        <Plus size={24} strokeWidth={2} />
      </button>
    </IonPage>
  );
};

export default Budgets;
