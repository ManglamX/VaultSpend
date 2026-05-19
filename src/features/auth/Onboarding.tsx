import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import {
  IonContent, IonPage, IonSpinner
} from '@ionic/react';
import { ChevronRight, CheckCircle, User, Bell, ShieldCheck, ArrowRight } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import PinPad from './PinPad';
import { setupPin } from '../../services/authService';
import { seedDefaultCategories } from '../../services/categoryService';
import { seedDefaultIncomeCategories } from '../../services/incomeCategoryService';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { addProfile } from '../../services/profileService';

// This wizard will handle: Splash -> Set PIN -> Confirm PIN -> Profile -> Done
const Onboarding: React.FC = () => {
  const [step, setStep] = useState<number>(2);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  
  const { setLocked, setHasPin } = useAuthStore();
  const { setActiveProfileId, setProfiles } = useProfileStore();

  const handleNext = () => setStep(s => s + 1);

  const handlePinCreate = (enteredPin: string) => {
    setPin(enteredPin);
    setError('');
    handleNext();
  };

  const handlePinConfirm = async (enteredPin: string) => {
    if (enteredPin !== pin) {
      setError('PINs do not match. Try again.');
      setStep(4);
      setPin('');
      return;
    }
    setError('');
    handleNext();
  };

  const requestNotifications = async () => {
    try {
      await LocalNotifications.requestPermissions();
    } catch {
      // ignore
    }
    handleNext();
  };

  const handleComplete = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    setLoading(true);
    try {
      // 1. Setup crypto with PIN
      await setupPin(pin);
      
      // 2. Create default profile in the DB
      const newProfile = { name: DOMPurify.sanitize(name.trim()), currency: '₹' };
      const profileId = await addProfile(newProfile);
      
      setActiveProfileId(profileId);
      setProfiles([{ ...newProfile, id: profileId }]);

      // 3. Seed categories
      await seedDefaultCategories(profileId);
      await seedDefaultIncomeCategories(profileId);
      
      setHasPin(true);
      setLocked(false);
    } catch (e) {
      console.error(e);
      setError('Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div style={{
          minHeight: '100vh',
          background: '#1C1917', // Warm Stone 900
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2rem',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <IonSpinner name="crescent" style={{ color: 'var(--primary-600)' }} />
              <p style={{ color: 'var(--stone-400)', marginTop: '1rem' }}>Setting up your vault…</p>
            </div>
          ) : (
            <div className="force-dark" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              {/* Step 1: Splash */}
              {step === 1 && (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease', maxWidth: 400 }}>
                  <div style={{ padding: '2rem' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 20px 40px rgba(47, 130, 83, 0.3)', animation: 'pulse 2s infinite', overflow: 'hidden' }}>
                      <img src="/logo.png" alt="VaultSpend Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <h1 style={{ color: 'var(--stone-50)', fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>VaultSpend</h1>
                    <p style={{ color: 'var(--primary-400)', fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem', marginBottom: '2rem' }}>v1.0.0</p>
                    <p style={{ color: 'var(--stone-400)', fontSize: '1.1rem', lineHeight: 1.5, marginBottom: '3rem', padding: '0 1rem' }}>
                      Welcome to your new modern expense tracker.
                    </p>
                    <button onClick={handleNext} style={{
                      background: 'var(--primary-600)', color: '#fff',
                      border: 'none', padding: '1rem 2.5rem', borderRadius: 30,
                      fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      boxShadow: '0 10px 25px rgba(47, 130, 83, 0.3)',
                    }}>
                      Next <ArrowRight size={20} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Benefit */}
              {step === 2 && (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease', maxWidth: 400 }}>
                  <div style={{ padding: '2rem' }}>
                    <ShieldCheck size={80} color="var(--primary-500)" strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 1.5rem' }} />
                    <h1 style={{ color: 'var(--stone-50)', fontSize: '2rem', fontWeight: 800 }}>100% Private</h1>
                    <p style={{ color: 'var(--stone-400)', fontSize: '1.1rem', lineHeight: 1.5, marginBottom: '3rem', padding: '0 1rem' }}>
                      Your data never leaves your device. No cloud storage, no servers, full anonymity.
                    </p>
                    <button onClick={handleNext} style={{
                      background: 'var(--primary-600)', color: '#fff',
                      border: 'none', padding: '1rem 2.5rem', borderRadius: 30,
                      fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      boxShadow: '0 10px 25px rgba(47, 130, 83, 0.3)',
                    }}>
                      Next <ArrowRight size={20} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Notifications */}
              {step === 3 && (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease', maxWidth: 400 }}>
                  <div style={{ padding: '2rem' }}>
                    <Bell size={80} color="var(--accent-500)" strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 1.5rem' }} />
                    <h1 style={{ color: 'var(--stone-50)', fontSize: '2rem', fontWeight: 800 }}>Stay on Budget</h1>
                    <p style={{ color: 'var(--stone-400)', fontSize: '1.1rem', lineHeight: 1.5, marginBottom: '3rem', padding: '0 1rem' }}>
                      Get gentle alerts when you are nearing your category limits.
                    </p>
                    <button onClick={requestNotifications} style={{
                      background: 'var(--accent-600)', color: '#fff',
                      border: 'none', padding: '1rem 2.5rem', borderRadius: 30,
                      fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      boxShadow: '0 10px 25px rgba(217, 122, 70, 0.3)',
                    }}>
                      Get Started <ChevronRight size={20} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Create PIN */}
              {step === 4 && (
                <div style={{ width: '100%', maxWidth: 380, animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', overflow: 'hidden' }}>
                      <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <h2 style={{ color: 'var(--stone-50)', fontSize: '1.5rem', margin: '1rem 0 0.5rem' }}>Secure your Vault</h2>
                    <p style={{ color: 'var(--stone-400)' }}>Create a 6-digit PIN</p>
                  </div>
                  <PinPad length={6} onComplete={handlePinCreate} error={error} label="New PIN" />
                </div>
              )}

              {/* Step 5: Confirm PIN */}
              {step === 5 && (
                <div style={{ width: '100%', maxWidth: 380, animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <CheckCircle size={48} color="var(--primary-500)" strokeWidth={1.5} style={{ display: 'block', margin: '0 auto' }} />
                    <h2 style={{ color: 'var(--stone-50)', fontSize: '1.5rem', margin: '1rem 0 0.5rem' }}>Confirm PIN</h2>
                    <p style={{ color: 'var(--stone-400)' }}>Enter your PIN again</p>
                  </div>
                  <PinPad length={6} onComplete={handlePinConfirm} error={error} label="Confirm PIN" />
                </div>
              )}

              {/* Step 6: Profile */}
              {step === 6 && (
                <div style={{ width: '100%', maxWidth: 380, animation: 'fadeIn 0.3s ease', background: 'var(--stone-800)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--stone-700)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <User size={48} color="var(--primary-400)" strokeWidth={1.5} style={{ display: 'block', margin: '0 auto' }} />
                    <h2 style={{ color: 'var(--stone-50)', fontSize: '1.5rem', margin: '1rem 0 0.5rem' }}>About You</h2>
                    <p style={{ color: 'var(--stone-400)' }}>What should we call you?</p>
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <input 
                      type="text" value={name} onChange={e => { setName(e.target.value); setError(''); }}
                      placeholder="Your Name"
                      maxLength={50}
                      style={{
                        width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--stone-600)',
                        background: 'var(--stone-900)', color: '#fff', fontSize: '1.1rem', outline: 'none'
                      }}
                    />
                  </div>
                  
                  {error && <p style={{ color: 'var(--danger-500)', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
                  
                  <button onClick={handleComplete} style={{
                    width: '100%', background: 'var(--primary-600)', color: '#fff',
                    border: 'none', padding: '1rem', borderRadius: 'var(--radius-xl)',
                    fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                    Complete Setup
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Onboarding;
