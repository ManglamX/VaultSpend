import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import PinPad from './PinPad';
import { unlockWithPin, getPersistentLockout } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { Hourglass } from 'lucide-react';

const MAX_ATTEMPTS = 5;


const UnlockPin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setLocked, pinAttempts, incrementAttempts, resetAttempts, setLockout, lockoutUntil } = useAuthStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (lockoutUntil) {
      const timer = setInterval(() => {
        const currentTime = Date.now();
        setNow(currentTime);
        if (currentTime >= lockoutUntil) {
          resetAttempts();
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutUntil, resetAttempts]);

  // Sync with persistent DB state on mount
  useEffect(() => {
    const sync = async () => {
      const until = await getPersistentLockout();
      if (until) setLockout(until - Date.now());
      // We don't need to increment local attempts visually as the persistent state handles the lockout check
    };
    sync();
  }, [setLockout]);

  const isLockedOut = lockoutUntil !== null && now < lockoutUntil;
  const lockoutSecondsLeft = lockoutUntil ? Math.ceil((lockoutUntil - now) / 1000) : 0;

  const handlePin = async (pin: string) => {
    if (isLockedOut) return;
    setLoading(true);
    setError('');

    try {
      const { success, lockoutSecondsLeft: left } = await unlockWithPin(pin);
      if (success) {
        resetAttempts();
        setLocked(false);
      } else {
        incrementAttempts();
        if (left) {
          setLockout(left * 1000);
          setError(`Too many attempts. Wait ${left} seconds.`);
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - (pinAttempts + 1)} attempts remaining.`);
        }
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div style={{
          minHeight: '100vh',
          background: '#1C1917', // Warm Stone 900 (dark mode)
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '18px',
              background: '#2F8253', // Primary 600
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.75rem',
              boxShadow: '0 15px 30px rgba(47, 130, 83, 0.25)',
              overflow: 'hidden'
            }}>
              <img src="/logo.png" alt="VaultSpend Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h1 style={{ color: '#FAFAFA', fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              VaultSpend
            </h1>
            <p style={{ color: '#A8A29E', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Enter your PIN to unlock
            </p>
          </div>

          {/* Card */}
          <div style={{
            width: '100%', maxWidth: '340px',
            background: '#292524', // Warm Stone 800
            borderRadius: '24px',
            border: '1px solid #44403C', // Warm Stone 700
            padding: '1rem',
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <IonSpinner name="crescent" style={{ color: '#5E8F7A' }} />
                <p style={{ color: '#A8A29E', marginTop: '1rem' }}>Unlocking vault…</p>
              </div>
            ) : isLockedOut ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Hourglass size={48} color="#D97A46" strokeWidth={1} /></div>
                <p style={{ color: '#E15A5A', fontWeight: 600 }}>App locked</p>
                <p style={{ color: '#A8A29E', marginTop: '0.5rem' }}>
                  Try again in {lockoutSecondsLeft}s
                </p>
              </div>
            ) : (
              <PinPad
                length={6}
                onComplete={handlePin}
                error={error}
                label="Enter 6-digit PIN"
                disabled={loading}
              />
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default UnlockPin;
