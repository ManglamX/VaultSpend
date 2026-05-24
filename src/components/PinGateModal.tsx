import React, { useState, useEffect } from 'react';
import { IonModal, IonContent, IonSpinner } from '@ionic/react';
import { ShieldCheck, Delete } from 'lucide-react';
import { unlockWithPin } from '../services/authService';

interface PinGateModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onVerified: () => void;
  onCancel: () => void;
}

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

const PinGateModal: React.FC<PinGateModalProps> = ({
  isOpen, title = 'Confirm Your PIN', subtitle = 'Enter your app PIN to continue', onVerified, onCancel
}) => {
  const [pin, setPin]           = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [lockout, setLockout]   = useState(0); // seconds remaining

  // Countdown timer
  useEffect(() => {
    if (lockout <= 0) return;
    const t = setInterval(() => setLockout(s => s <= 1 ? 0 : s - 1), 1000);
    return () => clearInterval(t);
  }, [lockout]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) { setPin(''); setError(''); setLockout(0); setLoading(false); }
  }, [isOpen]);

  const handleDigit = async (d: string) => {
    if (loading || lockout > 0) return;

    if (d === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (d === '') return; // empty placeholder for layout

    const next = pin + d;
    setPin(next);

    if (next.length === 6) {
      setLoading(true);
      setError('');
      try {
        const result = await unlockWithPin(next);
        if (result.success) {
          onVerified();
        } else if (result.lockoutSecondsLeft) {
          setLockout(result.lockoutSecondsLeft);
          setError(`Too many attempts. Locked for ${result.lockoutSecondsLeft}s.`);
        } else {
          setError('Incorrect PIN. Try again.');
        }
      } finally {
        setLoading(false);
        setPin('');
      }
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onCancel} initialBreakpoint={0.75} breakpoints={[0, 0.75]} style={{ '--backdrop-opacity': 0.7 }}>
      <IonContent className="force-dark">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', gap: '1.5rem' }}>

          {/* Icon + Title */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-900)', border: '1px solid var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={28} color="var(--primary-400)" strokeWidth={1.5} />
            </div>
            <h2 style={{ color: 'var(--vs-text)', fontWeight: 700, fontSize: 'var(--text-h2)', margin: 0 }}>{title}</h2>
            <p style={{ color: 'var(--vs-muted)', fontSize: 'var(--text-caption)', margin: 0, textAlign: 'center' }}>{subtitle}</p>
          </div>

          {/* PIN dots */}
          <div style={{ display: 'flex', gap: '0.875rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: pin.length > i ? 'var(--primary-500)' : 'var(--vs-border)',
                transition: 'background 0.15s ease',
                boxShadow: pin.length > i ? '0 0 8px var(--primary-500)' : 'none',
              }} />
            ))}
          </div>

          {/* Error / Lockout */}
          {error && (
            <p style={{ color: lockout > 0 ? 'var(--accent-400)' : 'var(--danger-400)', fontSize: 'var(--text-caption)', margin: 0, textAlign: 'center' }}>
              {lockout > 0 ? `🔒 Locked — try again in ${lockout}s` : error}
            </p>
          )}

          {loading && <IonSpinner name="crescent" style={{ width: 24, height: 24, color: 'var(--primary-400)' }} />}

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', width: '100%', maxWidth: 280 }}>
            {DIGITS.map((d, i) => (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                disabled={d === '' || loading || lockout > 0}
                style={{
                  padding: '1rem', borderRadius: 'var(--radius-xl)',
                  border: 'none',
                  background: d === '' ? 'transparent' : 'var(--vs-surface)',
                  color: 'var(--vs-text)',
                  fontSize: d === '⌫' ? '1.1rem' : '1.3rem',
                  fontWeight: 600, cursor: d === '' ? 'default' : 'pointer',
                  opacity: (loading || lockout > 0) && d !== '' ? 0.4 : 1,
                  transition: 'background 0.1s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {d === '⌫' ? <Delete size={20} /> : d}
              </button>
            ))}
          </div>

          {/* Cancel */}
          <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--vs-muted)', fontSize: 'var(--text-body)', cursor: 'pointer', padding: '0.5rem' }}>
            Cancel
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default PinGateModal;
