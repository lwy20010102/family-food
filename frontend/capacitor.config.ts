import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.familyfood.app",
  appName: "FamilyFood",
  webDir: "capacitor-web",
  server: {
    // Keep the app connected to the deployed web app so future web releases
    // become available without rebuilding the APK.
    url: "https://family-food-git-main-lwy20010102.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
