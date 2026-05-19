import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  IonModal, IonContent, IonSpinner,
} from '@ionic/react';
import { X, Save, Edit2, icons, Box } from 'lucide-react';
import type { Income } from '../../types';
import { addIncome, updateIncome } from '../../services/incomeService';
import { useIncomeStore } from '../../store/incomeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { format } from 'date-fns';

interface AddIncomeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  editIncome?: Income | null;
}

// No static INCOME_SOURCES here anymore

const AddIncomeSheet: React.FC<AddIncomeSheetProps> = ({ isOpen, onClose, profileId, editIncome }) => {
  const { incomeCategories, loadIncomeCategories, addIncomeLocal, updateIncomeLocal } = useIncomeStore();
  const { currency } = useSettingsStore();
  const isEditing = !!editIncome;

  const [amount, setAmount]   = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote]       = useState('');
  const [date, setDate]       = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (isOpen) loadIncomeCategories(profileId);
  }, [isOpen, profileId]);

  useEffect(() => {
    if (editIncome) {
      setAmount(String(editIncome.amount));
      setCategoryId(editIncome.categoryId);
      setNote(editIncome.note ?? '');
      setDate(format(new Date(editIncome.date), "yyyy-MM-dd'T'HH:mm"));
    } else {
      setAmount(''); setCategoryId(null); setNote('');
      setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    }
    setError('');
  }, [editIncome, isOpen]);

  const handleClose = () => { setError(''); onClose(); };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) { setError('Enter a valid amount.'); return; }
    if (!categoryId) { setError('Select an income source.'); return; }

    setSaving(true);
    try {
      const data: Omit<Income, 'id'> = {
        amount: parsed, categoryId, note: DOMPurify.sanitize(note.trim()),
        date: new Date(date).getTime(), profileId,
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

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose} initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]} style={{ '--backdrop-opacity': 0.5 }}>
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
                const filtered = e.target.value.replace(/[^0-9.]/g, '');
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
