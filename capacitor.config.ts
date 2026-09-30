import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.forwardfitness',
  appName: 'Forward Fitness',
  // Capacitor loads the app from the ./mobile folder produced by `CAP=1 vite build`.
  webDir: 'mobile',
  ios: {
    contentInset: 'always',
  },
};

export default config;
