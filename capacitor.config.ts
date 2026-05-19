import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vaultspend.app',
  appName: 'VaultSpend',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
    captureInput: false,
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#3b82f6',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0f1e',
      showSpinner: false,
    }
  }
};

export default config;
