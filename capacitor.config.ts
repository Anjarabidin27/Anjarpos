import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.malikatour.app',
  appName: 'Malika Tour',
  webDir: 'dist',
  server: {
    url: 'https://6d973c9f-1c04-4079-9785-c7427ebdf9bb.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0088FF",
      showSpinner: false,
    },
  },
};

export default config;
