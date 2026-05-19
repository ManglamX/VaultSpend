import React, { useEffect } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import { IonReactRouter } from '@ionic/react-router';
import {
  IonLabel, IonRouterOutlet,
  IonTabBar, IonTabButton, IonTabs,
} from '@ionic/react';
import { Home, ReceiptText, PieChart, Target, Settings as SettingsIcon } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';

import Dashboard from './features/dashboard/Dashboard';
import Expenses from './features/expenses/Expenses';
import Analytics from './features/analytics/Analytics';
import Budgets from './features/budgets/Budgets';
import Settings from './features/settings/Settings';
import LockScreen from './features/auth/LockScreen';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { useSettingsStore } from './store/settingsStore';
import { useAuthStore } from './store/authStore';

const App: React.FC = () => {
  const isLocked = useAuthStore(state => state.isLocked);

  useEffect(() => {
    const handleBackButton = (ev: any) => {
      ev.detail.register(10, (processNextHandler: () => void) => {
        const path = window.location.pathname;
        const rootPaths = ['/dashboard', '/expenses', '/analytics', '/budgets', '/settings', '/'];
        
        if (rootPaths.includes(path)) {
          CapApp.exitApp();
        } else {
          processNextHandler();
        }
      });
    };

    document.addEventListener('ionBackButton', handleBackButton);
    return () => {
      document.removeEventListener('ionBackButton', handleBackButton);
    };
  }, []);

  const { screenshotsEnabled } = useSettingsStore();
  const { setLocked } = useAuthStore();

  useEffect(() => {
    if (screenshotsEnabled) {
      PrivacyScreen.disable().catch(() => {});
    } else {
      PrivacyScreen.enable().catch(() => {});
    }
  }, [screenshotsEnabled]);

  useEffect(() => {
    // Lock on background
    const handleStateChange = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        // Double check flag directly from store state to avoid closure issues
        const { preventAutoLock } = useAuthStore.getState();
        if (!preventAutoLock) {
          setLocked(true);
        }
      }
    });

    return () => {
      handleStateChange.then(h => h.remove());
    };
  }, [setLocked]);

  return (
    <IonReactRouter>
      {/* 
          Instead of replacing the tree, we overlay the lock screen.
          This preserves background state (like open sheets) when auto-locking.
      */}
      <div style={{ display: isLocked ? 'none' : 'block', height: '100%' }}>
        <IonTabs>
          <IonRouterOutlet>
            <Switch>
              <Route exact path="/dashboard" component={Dashboard} />
              <Route exact path="/expenses" component={Expenses} />
              <Route exact path="/analytics" component={Analytics} />
              <Route exact path="/budgets" component={Budgets} />
              <Route exact path="/settings" component={Settings} />
              <Route exact path="/">
                <Redirect to="/dashboard" />
              </Route>
            </Switch>
          </IonRouterOutlet>

          <IonTabBar slot="bottom" id="app-tab-bar" style={{ '--background': 'transparent', '--border': 'none', borderTop: 'none' }}>
            <IonTabButton tab="dashboard" href="/dashboard">
              <div className="tab-icon-container"><Home size={22} strokeWidth={1.5} /></div>
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="expenses" href="/expenses">
              <div className="tab-icon-container"><ReceiptText size={22} strokeWidth={1.5} /></div>
              <IonLabel>Log</IonLabel>
            </IonTabButton>
            <IonTabButton tab="analytics" href="/analytics">
              <div className="tab-icon-container"><PieChart size={22} strokeWidth={1.5} /></div>
              <IonLabel>Stats</IonLabel>
            </IonTabButton>
            <IonTabButton tab="budgets" href="/budgets">
              <div className="tab-icon-container"><Target size={22} strokeWidth={1.5} /></div>
              <IonLabel>Budget</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <div className="tab-icon-container"><SettingsIcon size={22} strokeWidth={1.5} /></div>
              <IonLabel>More</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </div>

      {isLocked && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'var(--vs-bg)' }}>
          <LockScreen />
        </div>
      )}
    </IonReactRouter>
  );
};

export default App;
