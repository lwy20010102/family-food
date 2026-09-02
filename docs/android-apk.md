# Android APK

The Android project is in `frontend/android`. It wraps the deployed FamilyFood
web app so the existing Render API and Supabase data remain unchanged.

## Build with GitHub Actions

Pushing Android project changes to `main` starts the `Build Android APK`
workflow automatically. The generated debug APK is available from the completed
workflow run under `Artifacts` as `FamilyFood-android-debug`.

The downloaded artifact is a zip file. Extract it to get `app-debug.apk`, then
copy that APK to an Android phone and allow installation from the file manager
when Android asks.

## One-time setup on Windows

1. Install Android Studio from the official Android developer website.
2. In the installer, keep Android SDK, Android SDK Platform, Android SDK Build-Tools,
   and Android Virtual Device selected.
3. Open Android Studio once and finish the setup wizard.
4. Set `ANDROID_HOME` to the Android SDK folder if Android Studio does not set it
   automatically.

## Build a debug APK

From the `frontend` directory:

```powershell
pnpm install --frozen-lockfile
pnpm run android:sync
pnpm run android:build:debug
```

The APK will be generated at:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on an Android phone with Android Studio, or copy the APK to the phone
and allow installation from that file manager when Android asks.

The app currently loads the deployed Vercel site. Future web deployments become
available in the installed app without rebuilding the APK. The phone still needs
internet access for login and synchronized family data.
