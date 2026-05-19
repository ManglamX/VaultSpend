import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Info, X } from 'lucide-react';
import { generateInsights } from './insightsEngine';
import { useExpenseStore } from '../../store/expenseStore';
import { useIncomeStore } from '../../store/incomeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getFixedExpenses } from '../../services/fixedExpenseService';
import { useProfileStore } from '../../store/profileStore';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export const InsightsWidget: React.FC = () => {
  const { expenses, categories } = useExpenseStore();
  const { income } = useIncomeStore();
  const { activeProfileId } = useProfileStore();
  const { currency } = useSettingsStore();

  const [fixedBills, setFixedBills] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);

  React.useEffect(() => {
    if (activeProfileId) {
      getFixedExpenses(activeProfileId).then(setFixedBills);
    }
  }, [activeProfileId]);

  const insights = useMemo(() => {
    const now = new Date();
    const currentStart = startOfMonth(now).getTime();
    const currentEnd = endOfMonth(now).getTime();
    const lastStart = startOfMonth(subMonths(now, 1)).getTime();
    const lastEnd = endOfMonth(subMonths(now, 1)).getTime();

    const currMonthExp = expenses.filter(e => e.date >= currentStart && e.date <= currentEnd);
    const lastMonthExp = expenses.filter(e => e.date >= lastStart && e.date <= lastEnd);
    const currMonthInc = income.filter(i => i.date >= currentStart && i.date <= currentEnd);

    return generateInsights(currMonthExp, lastMonthExp, categories, currMonthInc, fixedBills, currency);
  }, [expenses, categories, income, fixedBills, currency]);

  const activeInsights = insights.filter((_, idx) => !dismissed.includes(idx));

  if (activeInsights.length === 0) return null;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <p style={{ color: 'var(--vs-text)', fontWeight: 700, margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Smart Insights</p>
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollSnapType: 'x mandatory' }}>
        {activeInsights.map((insight, idx) => {
          let bg = 'var(--vs-card)';
          let color = 'var(--vs-text)';
          let icon = Info;

          if (insight.type === 'increase') {
            bg = 'rgba(163,67,67,0.1)'; color = 'var(--danger-500)'; icon = TrendingUp;
          } else if (insight.type === 'decrease') {
            bg = 'rgba(47,130,83,0.1)'; color = 'var(--primary-600)'; icon = TrendingDown;
          } else if (insight.type === 'warning') {
            bg = 'rgba(198,128,50,0.1)'; color = 'var(--accent-500)'; icon = AlertCircle;
          } else if (insight.type === 'info') {
            bg = 'rgba(112,108,97,0.1)'; color = 'var(--stone-600)'; icon = Info;
          }

          const IconCmp = icon;

          return (
            <div key={idx} style={{ 
              minWidth: '220px', maxWidth: '280px', flex: '0 0 auto', scrollSnapAlign: 'start',
              background: bg, border: `1px solid ${color}40`, borderRadius: 16, padding: '1rem',
              position: 'relative'
            }}>
              <button 
                aria-label="Dismiss insight"
                onClick={() => setDismissed([...dismissed, idx])}
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: color, opacity: 0.6, cursor: 'pointer', display: 'flex' }}>
                <X size={20} strokeWidth={1.5} />
              </button>
              <div style={{ marginBottom: '0.5rem' }}>
                <IconCmp size={24} color={color} strokeWidth={1.5} />
              </div>
              <p style={{ color: 'var(--vs-text)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
                {insight.message}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
