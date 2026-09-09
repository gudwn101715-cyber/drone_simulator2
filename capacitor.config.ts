import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.seouldrone.simulator',
  appName: 'Seoul Drone Simulator',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    buildOptions: {
      keystorePath: undefined,
      releaseType: 'APK'
    }
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true
    }
  }
};

export default config;

