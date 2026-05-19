import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import {
  IonModal, IonContent, IonSpinner, IonToggle, IonSkeletonText
} from '@ionic/react';
import { X, Plus, Save, Edit2, icons, RotateCcw, Banknote, CreditCard, Smartphone, Building2, MoreHorizontal } from 'lucide-react';
import type { FixedExpense, PaymentMode } from '../../types';
import {
  getFixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense, toggleFixedExpense,
} from '../../services/fixedExpenseService';
import { useExpenseStore } from '../../store/expenseStore';
import { useSettingsStore } from '../../store/settingsStore';

interface FixedExpensesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
}

const renderIcon = (name: string, color?: string, size = 20) => {
  const IconCmp = (icons as any)[name] || icons.Box;
  return <IconCmp size={size} color={color} strokeWidth={1.5} />;
};

const FixedExpensesManager: React.FC<FixedExpensesManagerProps> = ({ isOpen, onClose, profileId }) => {
  const { categories } = useExpenseStore();
  const { currency } = useSettingsStore();
  const [items, setItems] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<FixedExpense | null>(null);

  // Form state
  const [fName, setFName]       = useState('');
  const [fAmount, setFAmount]   = useState('');
  const [fDueDay, setFDueDay]   = useState('1');
  const [fCatId, setFCatId]     = useState<number | null>(null);
  const [fNotes, setFNotes]     = useState('');
  const [fPaymentMode, setFPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await getFixedExpenses(profileId);
    setItems(data);
    setLoading(false);
  };

  const resetForm = () => { setFName(''); setFAmount(''); setFDueDay('1'); setFCatId(null); setFNotes(''); setFPaymentMode('Bank Transfer'); setFormError(''); };

  const openEdit = (fe: FixedExpense) => {
    setEditItem(fe);
    setFName(fe.name); setFAmount(String(fe.amount)); setFDueDay(String(fe.dueDay));
    setFCatId(fe.categoryId); setFNotes(fe.notes); setFPaymentMode(fe.paymentMode || 'Bank Transfer');
    setShowForm(true);
  };

  const openNew = () => { setEditItem(null); resetForm(); setShowForm(true); };

  const handleSave = async () => {
    const amt = parseFloat(fAmount);
    if (!fName.trim()) { setFormError('Enter a bill name.'); return; }
    if (!fAmount || isNaN(amt) || amt <= 0) { setFormError('Enter a valid amount.'); return; }
    if (!fCatId) { setFormError('Select a category.'); return; }

    setSaving(true);
    try {
      const data: Omit<FixedExpense, 'id'> = {
        name: DOMPurify.sanitize(fName.trim()), amount: amt, dueDay: parseInt(fDueDay),
        categoryId: fCatId, isActive: editItem?.isActive ?? true, notes: DOMPurify.sanitize(fNotes.trim()), 
        paymentMode: fPaymentMode, profileId,
      };
      if (editItem) await updateFixedExpense(editItem.id, data);
      else await addFixedExpense(data);
      await load();
      setShowForm(false); resetForm();
    } catch { setFormError('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await deleteFixedExpense(id);
    setItems((prev) => prev.filter((f) => f.id !== id));
  };

  const handleToggle = async (fe: FixedExpense) => {
    await toggleFixedExpense(fe);
    setItems((prev) => prev.map((f) => f.id === fe.id ? { ...f, isActive: !f.isActive } : f));
  };

  const getCat = (id: number) => categories.find((c) => c.id === id);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} onIonModalDidPresent={load} initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]} style={{ '--backdrop-opacity': 0.5 }}>
      <IonContent className="force-dark">
        <div style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: 'calc(env(safe-area-inset-top, 1rem) + 0.5rem)' }}>
          <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
            <h2 style={{ color: 'var(--vs-text)', margin: 0, fontWeight: 700, fontSize: 'var(--text-h2)' }}>Fixed Bills</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={openNew} style={{ background: 'var(--primary-900)', border: '1px solid var(--primary-500)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-400)' }}>
                <Plus size={20} strokeWidth={2} />
              </button>
              <button onClick={onClose} style={{ background: 'var(--vs-surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={20} color="var(--vs-muted)" strokeWidth={1.5} />
              </button>
            </div>
          </div>

        {showForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ color: 'var(--vs-text)', margin: 0, fontSize: 'var(--text-h3)' }}>{editItem ? 'Edit Bill' : 'New Fixed Bill'}</h3>

            {[{ label: 'Bill Name', value: fName, onChange: setFName, placeholder: 'e.g. Netflix', type: 'text' },
              { label: `Amount (${currency})`, value: fAmount, onChange: setFAmount, placeholder: '0', type: 'number' }
            ].map(({ label, value, onChange, placeholder, type }) => (
              <div key={label} style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
                <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>{label}</p>
                <input type={type} placeholder={placeholder} value={value} 
                  onChange={(e) => {
                    if (type === 'number' && e.target.value.length > 15) return;
                    if (type === 'text' && e.target.value.length > 100) return;
                    onChange(e.target.value);
                  }}
                  maxLength={type === 'text' ? 100 : undefined}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--vs-text)', fontSize: '1.1rem', width: '100%', fontFamily: 'inherit' }} />
              </div>
            ))}

            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
              <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Due Day (1–28)</p>
              <input type="number" min="1" max="28" value={fDueDay} onChange={(e) => setFDueDay(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--vs-text)', fontSize: '1.1rem', width: '100%' }} />
            </div>

            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
              <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Category</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setFCatId(cat.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    padding: '0.6rem 0.25rem', borderRadius: 'var(--radius-xl)',
                    border: `2px solid ${fCatId === cat.id ? 'var(--primary-500)' : 'transparent'}`,
                    background: fCatId === cat.id ? 'var(--primary-900)' : 'var(--vs-elevated)', cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: fCatId === cat.id ? 'var(--primary-800)' : 'var(--vs-bg)', borderRadius: 'var(--radius-lg)', color: fCatId === cat.id ? 'var(--primary-400)' : 'var(--vs-muted)' }}>
                      {renderIcon(cat.icon, undefined, 18)}
                    </div>
                    <span style={{ color: fCatId === cat.id ? '#fff' : 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 500 }}>{cat.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
              <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Payment Mode</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {(['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'] as PaymentMode[]).map(mode => {
                  const isSel = fPaymentMode === mode;
                  const ModeIcon = mode === 'Cash' ? Banknote : mode === 'Card' ? CreditCard : mode === 'UPI' ? Smartphone : mode === 'Bank Transfer' ? Building2 : MoreHorizontal;
                  return (
                    <button key={mode} onClick={() => setFPaymentMode(mode)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.6rem 0.4rem', borderRadius: 'var(--radius-md)',
                      border: isSel ? '1px solid var(--primary-500)' : '1px solid var(--vs-border)',
                      background: isSel ? 'var(--primary-900)' : 'var(--vs-elevated)',
                      color: isSel ? '#fff' : 'var(--stone-500)', fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      <ModeIcon size={14} color={isSel ? 'var(--primary-400)' : 'var(--stone-500)'} />
                      {mode.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {formError && <p style={{ color: 'var(--danger-500)', textAlign: 'center', fontSize: 'var(--text-caption)', margin: 0 }}>{formError}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ flex: 1, padding: '0.9rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--vs-border)', background: 'transparent', color: 'var(--vs-muted)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '0.9rem', borderRadius: 'var(--radius-xl)', border: 'none', background: 'var(--primary-600)', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {saving ? <IonSpinner name="crescent" style={{ width: 18, height: 18 }} /> : (editItem ? <><Edit2 size={18} /> Update</> : <><Save size={18} /> Save</>)}
              </button>
            </div>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.9rem 1rem', border: `1px solid var(--vs-border)`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <IonSkeletonText animated style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-lg)', margin: 0 }} />
                <div style={{ flex: 1 }}>
                  <IonSkeletonText animated style={{ width: '50%', height: '16px', borderRadius: '4px', marginBottom: '4px' }} />
                  <IonSkeletonText animated style={{ width: '30%', height: '12px', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><RotateCcw size={48} strokeWidth={1} color="var(--stone-300)" /></div>
            <p style={{ color: 'var(--stone-700)', fontSize: 'var(--text-h3)', margin: '0 0 0.5rem', fontWeight: 600 }}>No fixed bills yet</p>
            <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-body)', margin: 0 }}>Tap + to add recurring bills like rent or subscriptions.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((fe) => {
              const cat = getCat(fe.categoryId);
              return (
                <div key={fe.id} style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)', opacity: fe.isActive ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: `${cat?.color || 'var(--stone-500)'}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {renderIcon(cat?.icon ?? 'Box', cat?.color || 'var(--stone-500)', 22)}
                      </div>
                      <div>
                        <p style={{ color: 'var(--vs-text)', fontWeight: 600, margin: 0, fontSize: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {fe.name}
                          {fe.paymentMode && (
                            <span style={{ display: 'inline-flex', padding: '1px 3px', borderRadius: '3px', background: 'var(--vs-border)', border: '1px solid var(--stone-400)', color: 'var(--stone-600)' }}>
                              {React.createElement(fe.paymentMode === 'Cash' ? Banknote : fe.paymentMode === 'Card' ? CreditCard : fe.paymentMode === 'UPI' ? Smartphone : fe.paymentMode === 'Bank Transfer' ? Building2 : MoreHorizontal, { size: 9 })}
                            </span>
                          )}
                        </p>
                        <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-caption)', margin: 0 }}>Due: {fe.dueDay}th · {cat?.name ?? 'Other'}</p>
                      </div>
                    </div>
                    <span style={{ color: 'var(--stone-900)', fontWeight: 700, fontSize: 'var(--text-body)' }}>{currency}{fe.amount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <IonToggle checked={fe.isActive} onIonChange={() => handleToggle(fe)} style={{ '--track-background-checked': 'var(--primary-500)', transform: 'scale(0.8)' }} />
                    <button onClick={() => openEdit(fe)} style={{ background: 'var(--vs-elevated)', border: 'none', borderRadius: 8, padding: '0.4rem 0.75rem', color: 'var(--vs-text)', cursor: 'pointer', fontSize: 'var(--text-micro)' }}>Edit</button>
                    <button onClick={() => handleDelete(fe.id)} style={{ background: 'var(--danger-900)', border: 'none', borderRadius: 8, padding: '0.4rem 0.75rem', color: 'var(--danger-400)', cursor: 'pointer', fontSize: 'var(--text-micro)' }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default FixedExpensesManager;
