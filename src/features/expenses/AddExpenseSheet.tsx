import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  IonModal, IonContent, IonSpinner, useIonToast,
} from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import * as icons from 'lucide-react';
import { X, Camera as CameraIcon, Trash2, Box, Save, Edit2 } from 'lucide-react';
import type { Expense, PaymentMode } from '../../types';
import { addExpense, updateExpense } from '../../services/expenseService';
import { useExpenseStore } from '../../store/expenseStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useBudgetStore } from '../../store/budgetStore';
import { useAuthStore } from '../../store/authStore';
import { checkAndScheduleBudgetAlerts } from './../../features/budgets/alertScheduler';
import { format } from 'date-fns';

interface AddExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  editExpense?: Expense | null; // if provided, we're in edit mode
}

const AddExpenseSheet: React.FC<AddExpenseSheetProps> = ({ isOpen, onClose, profileId, editExpense }) => {
  const { categories, loadCategories, addExpenseLocal, updateExpenseLocal } = useExpenseStore();
  const { currency } = useSettingsStore();
  const { budgets } = useBudgetStore();
  const [presentToast] = useIonToast();
  const isEditing = !!editExpense;

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');

  useEffect(() => {
    if (isOpen) loadCategories(profileId);
  }, [isOpen, profileId]);

  // Pre-fill when editing
  useEffect(() => {
    if (editExpense) {
      setAmount(String(editExpense.amount));
      setCategoryId(editExpense.categoryId);
      setNote(editExpense.note ?? '');
      setDate(format(new Date(editExpense.date), "yyyy-MM-dd'T'HH:mm"));
      setReceiptBase64(editExpense.receiptBase64 ?? null);
      setPaymentMode(editExpense.paymentMode || 'Cash');
    } else {
      setAmount('');
      setCategoryId(null);
      setNote('');
      setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setReceiptBase64(null);
      setPaymentMode('Cash');
    }
    setError('');
  }, [editExpense, isOpen]);

  const { setPreventAutoLock } = useAuthStore();

  const handleCaptureReceipt = async () => {
    try {
      setPreventAutoLock(true);
      const photo = await Camera.getPhoto({
        quality: 60,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });
      if (photo.base64String) setReceiptBase64(`data:image/jpeg;base64,${photo.base64String}`);
    } catch {
      // user cancelled or permission denied
    } finally {
      // Small delay to ensure the app is back in focus before re-enabling auto-lock
      setTimeout(() => setPreventAutoLock(false), 500);
    }
  };

  const handleClose = () => { setError(''); onClose(); };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) { setError('Enter a valid amount.'); return; }
    if (!categoryId) { setError('Select a category.'); return; }

    setSaving(true);
    setError('');
    try {
      const cat = categories.find((c) => c.id === categoryId);
      const data: Omit<Expense, 'id'> = {
        amount: parsed,
        categoryId,
        categoryName: DOMPurify.sanitize(cat?.name ?? 'Other'),
        note: DOMPurify.sanitize(note.trim()),
        date: new Date(date).getTime(),
        paymentMode,
        profileId,
        receiptBase64: receiptBase64 || undefined,
      };

      if (isEditing && editExpense) {
        await updateExpense(editExpense.id, data);
        updateExpenseLocal({ ...data, id: editExpense.id } as Expense);
      } else {
        const id = await addExpense(data);
        addExpenseLocal({ ...data, id } as Expense);
        // Fire budget alerts after adding a new expense
        if (budgets.length > 0) {
          const allExp = useExpenseStore.getState().expenses;
          checkAndScheduleBudgetAlerts(allExp, budgets, categories, currency)
            .catch(() => {}); // non-blocking
        }
      }
      if (receiptBase64) {
        presentToast({ message: 'Receipt saved with expense', duration: 1500, color: 'success' });
      }
      handleClose();
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleClose}
      initialBreakpoint={0.9}
      breakpoints={[0, 0.9, 1]}
      style={{ '--backdrop-opacity': 0.5 }}
    >
      <IonContent className="force-dark">
        <div style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: 'calc(env(safe-area-inset-top, 1rem) + 0.5rem)' }}>
          <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
            <h2 style={{ color: 'var(--vs-text)', margin: 0, fontWeight: 700, fontSize: 'var(--text-h2)' }}>{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>
            <button onClick={handleClose} style={{ background: 'var(--vs-surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={20} color="var(--vs-muted)" strokeWidth={1.5} />
            </button>
          </div>

          {/* Amount */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--vs-border)' }}>
            <span style={{ fontSize: '2rem', color: 'var(--danger-400)' }}>{currency}</span>
            <input
              type="text" inputMode="decimal" placeholder="0.00"
              value={amount}
              maxLength={15}
              onKeyDown={(e) => { if (['-', '+', 'e', 'E', ','].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const filtered = e.target.value.replace(/[^0-9.]/g, '');
                const parts = filtered.split('.');
                setAmount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered);
              }}
              className="amount-large"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--vs-text)', width: '100%' }}
            />
          </div>

          {/* Category */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.5rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.5rem 0.5rem 0' }}>Category</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', padding: '0.5rem' }}>
              {categories.map((cat) => {
                const IconCmp = (icons as any)[cat.icon] || Box;
                return (
                  <button key={cat.id} onClick={() => setCategoryId(cat.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 0.25rem', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${categoryId === cat.id ? 'var(--primary-500)' : 'transparent'}`,
                    background: categoryId === cat.id ? 'var(--primary-900)' : 'var(--vs-elevated)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: categoryId === cat.id ? 'var(--primary-800)' : 'var(--vs-bg)', borderRadius: 'var(--radius-sm)', color: categoryId === cat.id ? 'var(--primary-400)' : 'var(--vs-muted)' }}>
                      <IconCmp size={18} strokeWidth={1.5} />
                    </div>
                    <span style={{ color: categoryId === cat.id ? '#fff' : 'var(--vs-muted)', fontSize: 'var(--text-micro)', textAlign: 'center', lineHeight: 1.2, fontWeight: 500 }}>
                      {cat.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Note (optional)</p>
            <textarea
              placeholder="What was this for?" value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              maxLength={500}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--vs-text)', fontSize: 'var(--text-body)', resize: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {/* Date */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Date & Time</p>
            <input
              type="datetime-local" value={date}
              max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => {
                const selected = new Date(e.target.value);
                if (selected <= new Date()) setDate(e.target.value);
              }}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--vs-text)', fontSize: 'var(--text-body)', width: '100%', colorScheme: 'dark' }}
            />
          </div>

          {/* Payment Mode */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.5rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.5rem 0.5rem 0' }}>Payment Mode</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', padding: '0.5rem' }}>
              {(['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'] as PaymentMode[]).map((mode) => {
                const isSel = paymentMode === mode;
                const ModeIcon = mode === 'Cash' ? icons.Banknote : mode === 'Card' ? icons.CreditCard : mode === 'UPI' ? icons.Smartphone : mode === 'Bank Transfer' ? icons.Building2 : icons.MoreHorizontal;
                return (
                  <button key={mode} onClick={() => setPaymentMode(mode)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isSel ? 'var(--primary-500)' : 'var(--vs-border)'}`,
                    background: isSel ? 'var(--primary-900)' : 'var(--vs-elevated)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}>
                    <ModeIcon size={16} color={isSel ? 'var(--primary-400)' : 'var(--vs-muted)'} />
                    <span style={{ color: isSel ? '#fff' : 'var(--vs-text)', fontSize: '0.75rem', fontWeight: isSel ? 600 : 500 }}>{mode.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Receipt Camera */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Receipt (optional)</p>
            {receiptBase64 ? (
              <div style={{ position: 'relative' }}>
                <img src={receiptBase64} alt="Receipt" style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: 200, objectFit: 'cover' }} />
                <button
                  onClick={() => setReceiptBase64(null)}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: 'var(--radius-full)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Trash2 color="#fff" size={16} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleCaptureReceipt}
                style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '2px dashed var(--vs-border)', background: 'transparent', color: 'var(--vs-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: 'var(--text-body)' }}
              >
                <CameraIcon size={20} strokeWidth={1.5} />
                Capture Receipt
              </button>
            )}
          </div>

          {error && <p style={{ color: 'var(--danger-500)', textAlign: 'center', fontSize: 'var(--text-caption)', margin: 0 }}>{error}</p>}

          {/* Save */}
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)', border: 'none',
            background: 'var(--danger-600)',
            color: '#fff', fontSize: 'var(--text-body)', fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}>
            {saving ? <IonSpinner name="crescent" style={{ width: 20, height: 20 }} /> : (isEditing ? <><Edit2 size={18} /> Update Expense</> : <><Save size={18} /> Save Expense</>)}
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default AddExpenseSheet;
