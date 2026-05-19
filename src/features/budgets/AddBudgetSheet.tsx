import React, { useState } from 'react';
import {
  IonModal, IonContent, IonSpinner
} from '@ionic/react';
import { X, Box, Save, Edit2 } from 'lucide-react';
import * as icons from 'lucide-react';
import type { Budget } from '../../types';
import { useExpenseStore } from '../../store/expenseStore';
import { useBudgetStore } from '../../store/budgetStore';
import { addBudget, updateBudget } from '../../services/budgetService';
import { useSettingsStore } from '../../store/settingsStore';

interface AddBudgetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  editBudget?: Budget | null;
}

const AddBudgetSheet: React.FC<AddBudgetSheetProps> = ({ isOpen, onClose, profileId, editBudget }) => {
  const { categories, loadCategories } = useExpenseStore();
  const { addBudgetLocal, updateBudgetLocal, budgets } = useBudgetStore();
  const { currency } = useSettingsStore();
  const isEditing = !!editBudget;

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [limitStr, setLimitStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) loadCategories(profileId);
  }, [isOpen, profileId]);

  // Pre-fill when editing
  React.useEffect(() => {
    if (isOpen && editBudget) {
      setCategoryId(editBudget.categoryId);
      setLimitStr(editBudget.limit.toString());
    } else if (!isOpen) {
      setCategoryId(null);
      setLimitStr('');
      setError('');
    }
  }, [isOpen, editBudget]);

  // Categories for the current profile
  const availableCategories = categories;

  const getExistingBudget = (catId: number) => budgets.find(b => b.categoryId === catId);

  const reset = () => {
    setCategoryId(null);
    setLimitStr('');
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    const limit = parseFloat(limitStr);
    if (!limitStr || isNaN(limit) || limit <= 0) {
      setError('Enter a valid monthly limit.');
      return;
    }
    if (!categoryId) {
      setError('Select a category.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const budgetData = {
        categoryId,
        limit,
        period: 'monthly' as const,
        profileId,
      };

      if (isEditing && editBudget) {
        await updateBudget(editBudget.id, budgetData);
        updateBudgetLocal({ ...budgetData, id: editBudget.id });
      } else {
        const existing = budgets.find(b => b.categoryId === categoryId);
        if (existing) {
          await updateBudget(existing.id, budgetData);
          updateBudgetLocal({ ...budgetData, id: existing.id });
        } else {
          const id = await addBudget(budgetData);
          addBudgetLocal({ ...budgetData, id });
        }
      }
      handleClose();
    } catch (e) {
      setError('Failed to save budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleClose}
      initialBreakpoint={0.7}
      breakpoints={[0, 0.7, 0.9]}
      style={{ '--backdrop-opacity': 0.5 }}
    >
      <IonContent className="force-dark">
        <div style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: 'calc(env(safe-area-inset-top, 1rem) + 0.5rem)' }}>
          <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto', marginTop: '-0.25rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
            <h2 style={{ color: 'var(--vs-text)', margin: 0, fontWeight: 700, fontSize: 'var(--text-h2)' }}>{isEditing ? 'Edit Budget' : 'Set Budget'}</h2>
            <button onClick={handleClose} style={{ background: 'var(--vs-surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={20} color="var(--vs-muted)" strokeWidth={1.5} />
            </button>
          </div>

          {/* Amount Input */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--vs-border)' }}>
            <span style={{ fontSize: '2.5rem', color: 'var(--primary-500)' }}>{currency}</span>
            <input
              type="text" inputMode="decimal" placeholder="0.00"
              value={limitStr}
              maxLength={15}
              onKeyDown={(e) => { if (['-', '+', 'e', 'E', ','].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const val = e.target.value;
                const filtered = val.replace(/[^0-9.]/g, '');
                if (val !== filtered) {
                  e.target.value = filtered;
                }
                const parts = filtered.split('.');
                setLimitStr(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered);
              }}
              className="amount-large"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--vs-text)', width: '100%',
              }}
            />
          </div>

          {/* Category Selector */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '0.5rem', border: '1px solid var(--vs-border)' }}>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.5rem 0.5rem 0' }}>Select Category</p>
            {availableCategories.length === 0 ? (
              <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-body)', padding: '1rem', textAlign: 'center' }}>
                No categories found. Create some in Settings first.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', padding: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                {availableCategories.map(cat => {
                  const hasBudget = budgets.some(b => b.categoryId === cat.id);
                  const isSelected = categoryId === cat.id;
                  const IconComponent = (icons as any)[cat.icon] || Box;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setCategoryId(cat.id);
                        const b = getExistingBudget(cat.id);
                        if (b) setLimitStr(b.limit.toString());
                        else setLimitStr('');
                      }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                        padding: '0.75rem 0.25rem', borderRadius: 'var(--radius-lg)',
                        border: `2px solid ${isSelected ? 'var(--primary-500)' : 'transparent'}`,
                        background: isSelected ? 'var(--primary-900)' : 'var(--vs-elevated)',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        width: 36, height: 36, 
                        background: isSelected ? 'var(--primary-700)' : `${cat.color}15`, 
                        borderRadius: 'var(--radius-lg)', 
                        color: isSelected ? '#fff' : cat.color 
                      }}>
                        <IconComponent size={20} strokeWidth={isSelected ? 2.5 : 1.5} />
                      </div>
                      <span style={{
                        color: isSelected ? '#fff' : 'var(--vs-text)',
                        fontSize: '10px', textAlign: 'center', lineHeight: 1.2, fontWeight: isSelected ? 700 : 500,
                        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{cat.name.split(' ')[0]}</span>
                      {hasBudget && !isSelected && (
                        <div style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-500)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Error */}
          {error && <p style={{ color: 'var(--danger-500)', textAlign: 'center', fontSize: 'var(--text-caption)', margin: 0 }}>{error}</p>}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || availableCategories.length === 0}
            style={{
              width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)', border: 'none',
              background: 'var(--primary-600)',
              color: '#ffffff', fontSize: 'var(--text-body)', fontWeight: 600,
              cursor: (saving || availableCategories.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (saving || availableCategories.length === 0) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {saving ? <IonSpinner name="crescent" /> : (isEditing ? <><Edit2 size={18} /> Update Budget</> : <><Save size={18} /> Set Budget</>)}
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default AddBudgetSheet;
