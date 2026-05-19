import React, { useState } from 'react';
import {
  IonModal, IonContent, IonSpinner, IonDatetime
} from '@ionic/react';
import { X, Save, Calendar, Bell, AlignLeft, Tag, Banknote, CreditCard, Smartphone, Building2, MoreHorizontal } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useExpenseStore } from '../../store/expenseStore';
import { useBillStore } from '../../store/billStore';
import { addBill, updateBill } from '../../services/billService';
import { useSettingsStore } from '../../store/settingsStore';
import type { Bill, PaymentMode } from '../../types';

interface AddBillSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  editBill?: Bill | null;
}

const AddBillSheet: React.FC<AddBillSheetProps> = ({ isOpen, onClose, profileId, editBill }) => {
  const { categories } = useExpenseStore();
  const { addBillLocal, updateBillLocal } = useBillStore();
  const { currency } = useSettingsStore();

  const [name, setName] = useState(editBill?.name || '');
  const [amount, setAmount] = useState(editBill?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState<number>(editBill?.categoryId || categories[0]?.id || 1);
  const [dueDate, setDueDate] = useState<string>(editBill?.dueDate ? new Date(editBill.dueDate).toISOString() : new Date().toISOString());
  const [notes, setNotes] = useState(editBill?.notes || '');
  const [notifyOption, setNotifyOption] = useState<Bill['notifyOption']>(editBill?.notifyOption || 'due_date');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(editBill?.paymentMode || 'Cash');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setAmount('');
    setCategoryId(categories[0]?.id || 1);
    setDueDate(new Date().toISOString());
    setNotes('');
    setNotifyOption('due_date');
    setPaymentMode('Cash');
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!name.trim()) { setError('Enter a product/bill name.'); return; }
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }

    setSaving(true);
    setError('');

    try {
      const billData = {
        name: DOMPurify.sanitize(name.trim()),
        amount: amt,
        categoryId,
        dueDate: new Date(dueDate).getTime(),
        notes: DOMPurify.sanitize(notes.trim()),
        notifyOption,
        paymentMode,
        profileId,
        isPaid: editBill?.isPaid || false
      };

      if (editBill) {
        await updateBill(editBill.id, billData);
        updateBillLocal({ ...billData, id: editBill.id });
      } else {
        const id = await addBill(billData);
        addBillLocal({ ...billData, id });
      }
      handleClose();
    } catch (e) {
      setError('Failed to save bill.');
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
        <div style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
          <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto', marginTop: '-0.25rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
            <h2 style={{ color: 'var(--vs-text)', margin: 0, fontWeight: 700, fontSize: 'var(--text-h2)' }}>
                {editBill ? 'Edit Bill' : 'Track Product/Bill'}
            </h2>
            <button onClick={handleClose} style={{ background: 'var(--vs-surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={20} color="var(--vs-muted)" strokeWidth={1.5} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Name Input */}
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.75rem 1rem', border: '1px solid var(--vs-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Tag size={20} color="var(--primary-500)" />
                <input 
                    placeholder="Product Name (e.g. iPhone, Rent)" 
                    value={name} onChange={e => setName(e.target.value)}
                    maxLength={100}
                    style={{ background: 'transparent', border: 'none', color: 'var(--vs-text)', fontSize: '1rem', width: '100%', outline: 'none' }}
                />
            </div>

            {/* Amount */}
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.75rem 1rem', border: '1px solid var(--vs-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-500)' }}>{currency}</span>
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
                    style={{ background: 'transparent', border: 'none', color: 'var(--vs-text)', fontSize: '1.25rem', fontWeight: 700, width: '100%', outline: 'none' }}
                />
            </div>

            {/* Due Date */}
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Calendar size={18} color="var(--accent-500)" />
                    <span style={{ color: 'var(--stone-400)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Due Date</span>
                 </div>
                 <IonDatetime 
                    presentation="date" 
                    value={dueDate} 
                    onIonChange={e => setDueDate(e.detail.value as string)}
                    style={{ '--background': 'transparent', color: 'var(--vs-text)' }}
                 />
            </div>

            {/* Notify Me */}
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Bell size={18} color="var(--primary-400)" />
                    <span style={{ color: 'var(--stone-400)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Alert Schedule</span>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {(['due_date', 'week_before', 'daily'] as const).map(opt => (
                        <button 
                            key={opt}
                            onClick={() => setNotifyOption(opt)}
                            style={{
                                padding: '0.6rem 0.2rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600,
                                border: notifyOption === opt ? '1px solid var(--primary-500)' : '1px solid var(--vs-border)',
                                background: notifyOption === opt ? 'var(--primary-900)' : 'var(--vs-elevated)',
                                color: notifyOption === opt ? 'var(--primary-400)' : 'var(--stone-500)'
                            }}
                        >
                            {opt === 'due_date' ? 'On Due' : opt === 'week_before' ? '7 Days Before' : 'Daily'}
                        </button>
                    ))}
                 </div>
            </div>

            {/* Payment Mode */}
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', border: '1px solid var(--vs-border)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <CreditCard size={18} color="var(--primary-400)" />
                    <span style={{ color: 'var(--stone-400)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Payment Mode</span>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {(['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'] as PaymentMode[]).map(mode => {
                        const isSel = paymentMode === mode;
                        const ModeIcon = mode === 'Cash' ? Banknote : mode === 'Card' ? CreditCard : mode === 'UPI' ? Smartphone : mode === 'Bank Transfer' ? Building2 : MoreHorizontal;
                        return (
                          <button 
                              key={mode}
                              onClick={() => setPaymentMode(mode)}
                              style={{
                                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                                  padding: '0.6rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600,
                                  border: isSel ? '1px solid var(--primary-500)' : '1px solid var(--vs-border)',
                                  background: isSel ? 'var(--primary-900)' : 'var(--vs-elevated)',
                                  color: isSel ? '#fff' : 'var(--stone-500)'
                              }}
                          >
                              <ModeIcon size={14} color={isSel ? 'var(--primary-400)' : 'var(--stone-500)'} />
                              {mode.split(' ')[0]}
                          </button>
                        );
                    })}
                 </div>
            </div>

            {/* Notes */}
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.75rem 1rem', border: '1px solid var(--vs-border)', display: 'flex', gap: '0.75rem' }}>
                <AlignLeft size={20} color="var(--stone-500)" style={{ marginTop: '0.2rem' }} />
                <textarea 
                    placeholder="Notes (optional)..." 
                    value={notes} onChange={e => setNotes(e.target.value)}
                    maxLength={500}
                    style={{ background: 'transparent', border: 'none', color: 'var(--vs-text)', fontSize: '0.95rem', width: '100%', outline: 'none', minHeight: '60px', resize: 'none' }}
                />
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger-500)', textAlign: 'center', fontSize: 'var(--text-caption)' }}>{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)', border: 'none',
              background: 'var(--primary-600)', color: '#ffffff', fontSize: '1rem', fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem'
            }}
          >
            {saving ? <IonSpinner name="crescent" /> : <><Save size={20} /> Save Tracker</>}
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default AddBillSheet;
