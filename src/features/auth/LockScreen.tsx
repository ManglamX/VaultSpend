import React, { useEffect, useState } from 'react';
import { IonSpinner } from '@ionic/react';
import Onboarding from './Onboarding';
import UnlockPin from './UnlockPin';
import { isAppSetUp } from '../../services/authService';

const LockScreen: React.FC = () => {
  const [checking, setChecking] = useState(true);
  const [isSetUp, setIsSetUp] = useState(false);

  useEffect(() => {
    isAppSetUp().then(result => {
      setIsSetUp(result);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1C1917', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <IonSpinner name="crescent" style={{ color: '#5E8F7A' }} />
      </div>
    );
  }

  return isSetUp ? <UnlockPin /> : <Onboarding />;
};

export default LockScreen;
