import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.seudominio.trotebox',
  appName: 'TroteBox',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff'
    }
  }
};

export default config;
