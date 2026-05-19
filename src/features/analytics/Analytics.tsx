import React, { useMemo, useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonToolbar, IonSegment, IonSegmentButton, IonLabel,
} from '@ionic/react';
import { BarChart3, Box } from 'lucide-react';
import * as icons from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useExpenseStore } from '../../store/expenseStore';
import { useDateStore } from '../../store/dateStore';
import { useSettingsStore } from '../../store/settingsStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Analytics: React.FC = () => {
  const { expenses, categories } = useExpenseStore();
  const { viewDate, offsetMonth } = useDateStore();
  const { currency } = useSettingsStore();
  const [view, setView] = useState<'category' | 'trend'>('category');

  const monthKey = format(viewDate, 'MMMM yyyy');

  const totalSpend = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  // ── Doughnut: Category Breakdown ──────────────────────────────────
  const categoryData = useMemo(() => {
    const totals: Record<number, number> = {};
    expenses.forEach(e => { totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount; });

    const labels: string[] = [];
    const data: number[] = [];
    const backgroundColors: string[] = [];

    Object.entries(totals)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .forEach(([catIdStr, val]) => {
        const cat = categories.find(c => c.id === Number(catIdStr));
        if (cat) {
          labels.push(cat.name);
          data.push(val);
          backgroundColors.push(cat.color);
        }
      });

    return { labels, datasets: [{ data, backgroundColor: backgroundColors, borderWidth: 0, hoverOffset: 8 }] };
  }, [expenses, categories]);

  // ── Bar Chart: Trend ─────────────────────────────────────────
  const trendData = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = viewDate.getMonth() === new Date().getMonth() ? new Date() : endOfMonth(viewDate);
    // If it's a full month in the past, maybe show weeks? No, let's just group by day for the month
    const daily: Record<string, number> = {};
    const days = eachDayOfInterval({ start, end });
    days.forEach(d => daily[format(d, 'MMM dd')] = 0);

    expenses.forEach(e => {
      const key = format(new Date(e.date), 'MMM dd');
      if (daily[key] !== undefined) daily[key] += e.amount;
    });
    return {
      labels: Object.keys(daily),
      datasets: [{
        label: 'Spend',
        data: Object.values(daily),
        backgroundColor: Object.values(daily).map((_, i, arr) => {
          const max = Math.max(...arr);
          return i === arr.indexOf(max) ? '#D97A46' : '#2F8253'; // accent-500 and primary-600
        }),
        borderRadius: 6,
      }]
    };
  }, [expenses]);

  // ── Category breakdown list ────────────────────────────────────────
  const sortedCats = useMemo(() => {
    const totals: Record<number, number> = {};
    expenses.forEach(e => { totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount; });
    return Object.entries(totals)
      .map(([catId, amount]) => ({ cat: categories.find(c => c.id === Number(catId)), amount }))
      .filter(x => x.cat)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, categories]);

  const chartCommonOptions = {
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'var(--vs-border)' }, ticks: { color: 'var(--vs-muted)' } },
      x: { grid: { display: false }, ticks: { color: 'var(--vs-muted)' } },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <IonPage className="vs-page-enter">
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': 'transparent', '--border-style': 'none' }}>
          <div style={{ padding: '1rem 1.25rem 0.5rem', paddingTop: 'calc(env(safe-area-inset-top, 20px) + 1rem)' }}>
            <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.2rem' }}>Insights</p>
            <h1 style={{ color: 'var(--vs-text)', fontSize: '1.8rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>Analytics</h1>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>

          {/* Month Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', background: 'var(--vs-surface)', padding: '0.4rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--vs-border)' }}>
            <button onClick={() => offsetMonth(-1)} style={{ background: 'var(--vs-elevated)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'var(--stone-700)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ color: 'var(--stone-900)', fontWeight: 600, fontSize: 'var(--text-body)' }}>{monthKey}</span>
            <button onClick={() => offsetMonth(1)} style={{ background: 'var(--vs-elevated)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'var(--stone-700)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>

          <IonSegment
            value={view}
            onIonChange={e => setView(e.detail.value as 'category' | 'trend')}
            style={{ '--background': 'var(--vs-surface)', marginBottom: '1.5rem', borderRadius: 'var(--radius-xl)' }}
          >
            <IonSegmentButton value="category" style={{ minHeight: 34, '--color': 'var(--stone-600)', '--color-checked': 'var(--stone-900)' }}>
              <IonLabel style={{ fontSize: 'var(--text-label)', margin: 0 }}>By Category</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="trend" style={{ minHeight: 34, '--color': 'var(--stone-600)', '--color-checked': 'var(--stone-900)' }}>
              <IonLabel style={{ fontSize: 'var(--text-label)', margin: 0 }}>Trend</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {/* Chart Card */}
          <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--vs-border)' }}>
            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--vs-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}><BarChart3 size={48} strokeWidth={1} color="var(--stone-300)" /></div>
                <p style={{ margin: 0, color: 'var(--stone-500)', fontSize: 'var(--text-body)' }}>Add some expenses to see charts</p>
              </div>
            ) : view === 'category' ? (
              <div style={{ height: '280px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Doughnut
                  data={categoryData}
                  options={{
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: ctx => ` ${currency}${(ctx.raw as number).toLocaleString()}` } },
                    },
                    cutout: '68%',
                  }}
                />
              </div>
            ) : (
              <div style={{ height: '240px' }}>
                <Bar data={trendData} options={chartCommonOptions as any} />
              </div>
            )}
          </div>

          {/* Category Breakdown List */}
          {view === 'category' && sortedCats.length > 0 && (
            <div style={{ background: 'var(--vs-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--vs-border)', overflow: 'hidden' }}>
              <p style={{ color: 'var(--vs-text)', fontWeight: 700, padding: '1.25rem 1rem 0.5rem', margin: 0, fontSize: 'var(--text-h3)' }}>Breakdown</p>
              {sortedCats.map(({ cat, amount }, idx) => {
                const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
                const IconCmp = (icons as any)[cat!.icon] || Box;
                return (
                  <div key={cat!.id} style={{
                    padding: '0.75rem 1rem',
                    borderTop: idx === 0 ? 'none' : '1px solid var(--vs-border)',
                    animation: `slideInRight 0.3s ease ${idx * 0.06}s both`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
                        background: `${cat!.color}1F`, color: cat!.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><IconCmp size={18} strokeWidth={1.5} /></span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--stone-900)', fontWeight: 600, fontSize: 'var(--text-body)' }}>{cat!.name}</span>
                          <span className="amount" style={{ color: 'var(--stone-600)', fontWeight: 500, fontSize: 'var(--text-caption)' }}>{currency}{amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'var(--vs-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, width: `${pct}%`,
                        background: cat!.color, transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <p style={{ color: 'var(--stone-500)', fontSize: 'var(--text-micro)', margin: '4px 0 0', textAlign: 'right' }}>{pct.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Analytics;
