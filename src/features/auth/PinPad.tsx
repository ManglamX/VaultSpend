import React, { useState } from 'react';
import { IonRippleEffect } from '@ionic/react';

interface PinPadProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
}

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

const PinPad: React.FC<PinPadProps> = ({
  length = 6,
  onComplete,
  disabled = false,
  error,
  label = 'Enter PIN',
}) => {
  const [pin, setPin] = useState('');

  const handleKey = (key: string) => {
    if (disabled) return;
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      return;
    }
    if (key === '') return;
    const next = pin + key;
    setPin(next);
    if (next.length === length) {
      // slight delay for visual feedback
      setTimeout(() => {
        onComplete(next);
        setPin('');
      }, 120);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
      padding: '1.25rem 0.5rem',
    }}>
      {/* Label */}
      <p style={{ color: '#94a3b8', fontSize: '1rem', letterSpacing: '0.05em' }}>
        {label}
      </p>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: '2px solid',
              borderColor: i < pin.length ? '#2F8253' : '#44403C', // Primary-600 : Stone-700
              backgroundColor: i < pin.length ? '#2F8253' : 'transparent',
              transition: 'all 0.15s ease',
              transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>
      )}

      {/* Keypad grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 72px)',
        gap: '1rem',
        justifyContent: 'center',
        width: '100%',
      }}>
        {KEYS.map((key, idx) => (
          <button
            key={idx}
            onClick={() => handleKey(key)}
            disabled={disabled || key === ''}
            className="ion-activatable"
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              border: 'none',
              background: key === '' ? 'transparent' : '#322E2C', // Slightly darker Stone
              color: '#FAFAFA',
              fontSize: key === '⌫' ? '1.5rem' : '1.75rem',
              fontWeight: 600,
              cursor: key === '' ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.1s ease, background 0.1s ease',
            }}
            onMouseDown={e => {
              if (key !== '') (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)';
            }}
            onMouseUp={e => {
              if (key !== '') (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {key}
            {key !== '' && <IonRippleEffect />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PinPad;
