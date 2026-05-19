import React from 'react';
import { createRoot } from 'react-dom/client';
import { setupIonicReact, IonApp } from '@ionic/react';
import App from './App';

/* CSS imports done in index.css, so just import that */
import './index.css';

/* Core setup for Ionic */
setupIonicReact({
  mode: 'md', // Force Material Design for Android look and feel
  rippleEffect: true,
});

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <IonApp>
      <App />
    </IonApp>
  </React.StrictMode>
);
