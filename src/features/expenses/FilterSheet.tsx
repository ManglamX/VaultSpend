import React, { useState } from 'react';
import { IonModal, IonContent } from '@ionic/react';
import { Box, SlidersHorizontal } from 'lucide-react';
import * as icons from 'lucide-react';
import type { Category, PaymentMode } from '../../types';
import { type ExpenseFilters, isFiltersActive } from './filters';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ExpenseFilters;
  categories: Category[];
  onChange: (f: ExpenseFilters) => void;
  onReset: () => void;
}

const PRESETS = [
  { label: 'Today', key: 'today' },
  { label: 'This Week', key: 'week' },
  { label: 'This Month', key: 'month' },
  { label: 'Custom', key: 'custom' },
] as const;

function getPresetRange(key: string): { from: number; to: number } | null {
  const now = new Date();
  if (key === 'today') return { from: startOfDay(now).getTime(), to: endOfDay(now).getTime() };
  if (key === 'week')  return { from: startOfWeek(now, { weekStartsOn: 1 }).getTime(), to: endOfWeek(now, { weekStartsOn: 1 }).getTime() };
  if (key === 'month') return { from: startOfMonth(now).getTime(), to: endOfMonth(now).getTime() };
  return null;
}

const chip = (active: boolean, label: string, onClick: () => void) => (
  <button
    key={label}
    onClick={onClick}
    style={{
      padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)', cursor: 'pointer',
      background: active ? 'var(--primary-600)' : 'var(--vs-elevated)',
      color: active ? '#fff' : 'var(--stone-600)',
      border: active ? 'none' : '1px solid var(--vs-border)',
      fontSize: 'var(--text-caption)', fontWeight: 600, transition: 'all 0.2s',
    }}
  >
    {label}
  </button>
);

const FilterSheet: React.FC<FilterSheetProps> = ({ isOpen, onClose, filters, categories, onChange, onReset }) => {
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [datePreset, setDatePreset] = useState<string | null>(null);

  const setField = <K extends keyof ExpenseFilters>(k: K, v: ExpenseFilters[K]) =>
    onChange({ ...filters, [k]: v });

  const toggleCat = (id: number) => {
    const ids = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter(c => c !== id)
      : [...filters.categoryIds, id];
    setField('categoryIds', ids);
  };

  const togglePaymentMode = (mode: PaymentMode) => {
    const modes = filters.paymentModes.includes(mode)
      ? filters.paymentModes.filter(m => m !== mode)
      : [...filters.paymentModes, mode];
    setField('paymentModes', modes);
  };

  const applyPreset = (key: string) => {
    setDatePreset(key);
    if (key !== 'custom') setField('dateRange', getPresetRange(key));
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      setField('dateRange', {
        from: new Date(customFrom).getTime(),
        to: endOfDay(new Date(customTo)).getTime(),
      });
    }
  };

  const active = isFiltersActive(filters);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} breakpoints={[0, 0.92]} initialBreakpoint={0.92}>
      <IonContent className="force-dark">
        <div style={{ padding: '1.25rem 1rem', paddingBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: 'calc(env(safe-area-inset-top, 1rem) + 0.5rem)' }}>
          <div style={{ width: 40, height: 4, background: 'var(--stone-700)', borderRadius: 2, margin: '0 auto', marginTop: '-0.25rem' }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: 'var(--vs-text)', margin: 0, fontWeight: 700, fontSize: 'var(--text-h2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={20} strokeWidth={2} color="var(--primary-600)" /> Filters
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {active && (
                <button onClick={() => { onReset(); setDatePreset(null); setCustomFrom(''); setCustomTo(''); }}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--vs-error-bg)', color: 'var(--vs-error-text)', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-caption)' }}>
                  Reset
                </button>
              )}
              <button onClick={onClose}
                style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary-600)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-body)' }}>
                Apply ✓
              </button>
            </div>
          </div>

          {/* Search */}
          <div>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>Search Notes</p>
            <input
              type="text"
              value={filters.search}
              onChange={e => setField('search', e.target.value ?? '')}
              placeholder="Search details…"
              style={{ width: '100%', padding: '0.65rem', background: 'var(--vs-surface)', border: '1px solid var(--vs-border)', borderRadius: 'var(--radius-md)', color: 'var(--vs-text)', fontSize: 'var(--text-body)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Categories */}
          <div>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>
              Categories {filters.categoryIds.length > 0 && <span style={{ color: 'var(--primary-600)' }}>({filters.categoryIds.length})</span>}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {categories.map(cat => {
                const IconCmp = (icons as any)[cat.icon] || Box;
                return (
                  <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                    padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                    background: filters.categoryIds.includes(cat.id) ? `${cat.color}1F` : 'var(--vs-surface)',
                    color: filters.categoryIds.includes(cat.id) ? cat.color : 'var(--stone-600)',
                    border: filters.categoryIds.includes(cat.id) ? `1.5px solid ${cat.color}` : '1px solid var(--vs-border)',
                    fontSize: 'var(--text-label)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}>
                    <IconCmp size={14} strokeWidth={2} /> {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>Date Range</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {PRESETS.map(p => chip(datePreset === p.key, p.label, () => applyPreset(p.key)))}
              {filters.dateRange && chip(true, 'Clear', () => { setDatePreset(null); setField('dateRange', null); })}
            </div>
            {datePreset === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                {[['From', customFrom, setCustomFrom], ['To', customTo, setCustomTo]].map(([label, val, set]) => (
                  <div key={label as string}>
                    <p style={{ color: 'var(--stone-600)', fontSize: 'var(--text-micro)', fontWeight: 600, margin: '0 0 0.25rem' }}>{label as string}</p>
                    <input type="date" value={val as string} onChange={e => { (set as (v: string) => void)(e.target.value); setTimeout(applyCustom, 100); }}
                      style={{ width: '100%', padding: '0.65rem', background: 'var(--vs-surface)', border: '1px solid var(--vs-border)', borderRadius: 'var(--radius-md)', color: 'var(--vs-text)', fontSize: 'var(--text-body)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Amount Range */}
          <div>
            <p style={{ color: 'var(--stone-600)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>Amount Range</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                ['Min ₹', filters.amountMin, (v: number | null) => setField('amountMin', v)],
                ['Max ₹', filters.amountMax, (v: number | null) => setField('amountMax', v)],
              ].map(([label, val, set]) => (
                <div key={label as string}>
                  <p style={{ color: 'var(--stone-600)', fontSize: 'var(--text-micro)', fontWeight: 600, margin: '0 0 0.25rem' }}>{label as string}</p>
                  <input
                    type="number" inputMode="decimal" placeholder="Any"
                    value={(val as number | null) ?? ''}
                    onChange={e => (set as (v: number | null) => void)(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: '100%', padding: '0.65rem', background: 'var(--vs-surface)', border: '1px solid var(--vs-border)', borderRadius: 'var(--radius-md)', color: 'var(--vs-text)', fontSize: 'var(--text-body)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Payment Mode Filter */}
          <div>
            <p style={{ color: 'var(--stone-600)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>Payment Mode</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'] as PaymentMode[]).map(mode => {
                const active = filters.paymentModes.includes(mode);
                const Icon = mode === 'Cash' ? icons.Banknote : mode === 'Card' ? icons.CreditCard : mode === 'UPI' ? icons.Smartphone : mode === 'Bank Transfer' ? icons.Building2 : icons.MoreHorizontal;
                return (
                  <button key={mode} onClick={() => togglePaymentMode(mode)} style={{
                    padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                    background: active ? 'var(--primary-600)' : 'var(--vs-surface)',
                    color: active ? '#fff' : 'var(--stone-600)',
                    border: active ? 'none' : '1px solid var(--vs-border)',
                    fontSize: 'var(--text-label)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}>
                    <Icon size={14} /> {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p style={{ color: 'var(--stone-600)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>Sort By</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['date', 'amount', 'category'] as const).map(s =>
                chip(filters.sortBy === s, s.charAt(0).toUpperCase() + s.slice(1), () => setField('sortBy', s))
              )}
              <div style={{ borderLeft: '1px solid var(--vs-border)', paddingLeft: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                {chip(filters.sortDir === 'desc', '↓ Desc', () => setField('sortDir', 'desc'))}
                {chip(filters.sortDir === 'asc',  '↑ Asc',  () => setField('sortDir', 'asc'))}
              </div>
            </div>
          </div>

        </div>
      </IonContent>
    </IonModal>
  );
};

export default FilterSheet;
