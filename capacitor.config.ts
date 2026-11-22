import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.appbuilderlee2.fuelmate',
  appName: 'FuelMate',
  webDir: 'dist',
  server: { iosScheme: 'capacitor', hostname: 'localhost' },
};

export default config;
