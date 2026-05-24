import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  IonModal, IonContent, IonSpinner,
} from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { X, Save, Edit2, icons, Box, Camera as CameraIcon, Trash2, Banknote, CreditCard, Smartphone, Building2, MoreHorizontal } from 'lucide-react';
import type { Income, PaymentMode } from '../../types';
import { addIncome, updateIncome } from '../../services/incomeService';
import { useIncomeStore } from '../../store/incomeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

interface AddIncomeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  editIncome?: Income | null;
}

const AddIncomeSheet: React.FC<AddIncomeSheetProps> = ({ isOpen, onClose, profileId, editIncome }) => {
  const { incomeCategories, loadIncomeCategories, addIncomeLocal, updateIncomeLocal } = useIncomeStore();
  const { currency } = useSettingsStore();
  const { setPreventAutoLock } = useAuthStore();
  const isEditing = !!editIncome;

  const [amount, setAmount]         = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote]             = useState('');
  const [date, setDate]             = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadIncomeCategories(profileId);
  }, [isOpen, profileId]);

  useEffect(() => {
    if (editIncome) {
      setAmount(String(editIncome.amount));
      setCategoryId(editIncome.categoryId);
      setNote(editIncome.note ?? '');
      setDate(format(new Date(editIncome.date), "yyyy-MM-dd'T'HH:mm"));
      setPaymentMode(editIncome.paymentMode || 'Cash');
      setReceiptBase64(editIncome.receiptBase64 ?? null);
    } else {
      setAmount(''); setCategoryId(null); setNote('');
      setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setPaymentMode('Cash');
      setReceiptBase64(null);
    }
    setError('');
  }, [editIncome, isOpen]);

  const handleCaptureReceipt = async () => {
    try {
      setPreventAutoLock(true);
      const photo = await Camera.getPhoto({
        quality: 60,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        width: 1200,
      });

      if (photo.base64String) {
        const sizeInBytes = Math.round((photo.base64String.length * 3) / 4);
        if (sizeInBytes > 5 * 1024 * 1024) {
          setError('Receipt image is too large. Please select an image under 5MB.');
          return;
        }
        setReceiptBase64(`data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`);
      }
    } catch {
      // user cancelled or permission denied
    } finally {
      setTimeout(() => setPreventAutoLock(false), 500);
    }
  };

  const handleClose = () => { setError(''); onClose(); };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) { setError('Enter a valid amount.'); return; }
    if (!categoryId) { setError('Select an income source.'); return; }

    setSaving(true);
    try {
      const data: Omit<Income, 'id'> = {
        amount: parsed, categoryId,
        note: DOMPurify.sanitize(note.trim()),
        date: new Date(date).getTime(),
        profileId,
        paymentMode,
        receiptBase64: receiptBase64 ?? undefined,
      };
      if (isEditing && editIncome) {
        await updateIncome(editIncome.id, data);
        updateIncomeLocal({ ...data, id: editIncome.id } as Income);
      } else {
        const id = await addIncome(data);
        addIncomeLocal({ ...data, id } as Income);
      }
      handleClose();
    } catch { setError('Failed to save. Try again.'); }
    finally { setSaving(false); }
  };

  const paymentModes: { mode: PaymentMode; icon: React.ElementType }[] = [
    { mode: 'Cash',          icon: Banknote },
    { mode: 'Card',          icon: CreditCard },
    { mode: 'UPI',           icon: Smartphone },
    { mode: 'Bank Transfer', icon: Building2 },
    { mode: 'Other',         icon: MoreHorizontal },
  ];

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose} initialBreakpoint={0.92} breakpoints={[0, 0.92, 1]} style={{ '--backdrop-opacity': 0.5 }}>
      <IonContent className="force-dark">
        <div style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: 'calc(env(safe-area-inset-top, 1rem) + 0.5rem)' }}>
          <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
            <h2 style={{ color: 'var(--vs-text)', margin: 0, fontWeight: 700, fontSize: 'var(--text-h2)' }}>{isEditing ? 'Edit Income' : 'Add Income'}</h2>
            <button onClick={handleClose} style={{ background: 'var(--vs-surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={20} color="var(--vs-muted)" strokeWidth={1.5} />
            </button>
          </div>

          {/* Amount */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--vs-border)' }}>
            <span style={{ fontSize: '2rem', color: 'var(--primary-500)' }}>{currency}</span>
            <input
              type="text" inputMode="decimal" placeholder="0.00"
              value={amount}
              maxLength={15}
              onKeyDown={(e) => { if (['-', '+', 'e', 'E', ','].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const val = e.target.value;
                const filtered = val.replace(/[^0-9.]/g, '');
                if (val !== filtered) e.target.value = filtered;
                const parts = filtered.split('.');
                setAmount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered);
              }}
              className="amount-large"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--vs-text)', width: '100%' }} />
          </div>

          {/* Source Selector */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.5rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.5rem 0.5rem 0' }}>Source</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', padding: '0.5rem' }}>
              {incomeCategories.map((cat) => {
                const IconCmp = (icons as any)[cat.icon] || Box;
                const isSelected = categoryId === cat.id;
                return (
                  <button key={cat.id} onClick={() => setCategoryId(cat.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 0.25rem', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isSelected ? 'var(--primary-500)' : 'transparent'}`,
                    background: isSelected ? 'var(--primary-900)' : 'var(--vs-elevated)',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: isSelected ? 'var(--primary-800)' : 'var(--vs-bg)', borderRadius: 'var(--radius-sm)', color: isSelected ? 'var(--primary-400)' : 'var(--vs-muted)' }}>
                      <IconCmp size={18} strokeWidth={1.5} />
                    </div>
                    <span style={{ color: isSelected ? '#fff' : 'var(--vs-muted)', fontSize: 'var(--text-micro)', textAlign: 'center', fontWeight: 500 }}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Mode */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.5rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.5rem 0.5rem 0' }}>Received Via</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', padding: '0.5rem' }}>
              {paymentModes.map(({ mode, icon: ModeIcon }) => {
                const isSel = paymentMode === mode;
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

          {/* Note */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Note (optional)</p>
            <textarea placeholder="e.g. March salary" value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              maxLength={500}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--vs-text)', fontSize: 'var(--text-body)', resize: 'none', fontFamily: 'inherit' }} />
          </div>

          {/* Date */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Date & Time</p>
            <input type="datetime-local" value={date}
              max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => {
                const selected = new Date(e.target.value);
                if (selected <= new Date()) setDate(e.target.value);
              }}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--vs-text)', fontSize: 'var(--text-body)', width: '100%', colorScheme: 'dark' }} />
          </div>

          {/* Receipt */}
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

          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)', border: 'none',
            background: 'var(--primary-600)',
            color: '#fff', fontSize: 'var(--text-body)', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            opacity: saving ? 0.7 : 1
          }}>
            {saving ? <IonSpinner name="crescent" style={{ width: 20, height: 20 }} /> : (isEditing ? <><Edit2 size={18} /> Update Income</> : <><Save size={18} /> Save Income</>)}
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default AddIncomeSheet;
