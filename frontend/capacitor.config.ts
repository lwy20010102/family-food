import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.familyfood.app",
  appName: "FamilyFood",
  webDir: "capacitor-web",
  server: {
    // Load through the existing Render API service. It proxies the web app so
    // phones that cannot connect to Vercel can still use the APK.
    url: "https://family-food-api.onrender.com",
    errorPath: "error.html",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
