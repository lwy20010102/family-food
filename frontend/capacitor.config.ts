import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.familyfood.app",
  appName: "FamilyFood",
  webDir: "capacitor-web",
  server: {
    // Use the project's stable Vercel domain instead of a branch deployment URL.
    // Web releases remain available in the installed app without rebuilding it.
    url: "https://family-food-lwy20010102.vercel.app",
    errorPath: "error.html",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
