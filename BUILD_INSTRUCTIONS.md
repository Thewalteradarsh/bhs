# Hear App - Native Build Instructions

This guide explains how to compile the React web application into a native Android APK using Capacitor and the Gradle wrapper from the command line.

## Prerequisites
- Node.js & NPM installed
- Android SDK installed (via Android Studio)
- `ANDROID_HOME` environment variable configured

## Step 1: Compile the Web Bundle
First, build the highly-optimized, code-split React application and synchronize the assets into the native Android project directory.

```bash
npm run build:native
```
*This executes `vite build && cap sync android` under the hood.*

## Step 2: Generate the Debug APK (For Testing)
If you want to test the app on your local device without signing it for the Google Play Store, generate a debug APK.

```bash
npm run build:apk:debug
```
Once the Gradle build finishes, you can find the APK at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Step 3: Generate the Release APK (For Production)
When you are ready to publish, generate the Release APK.

```bash
npm run build:apk:release
```
Once the Gradle build finishes, the unsigned release APK is located at:
`android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Step 4: Signing the Release APK
You must sign the release APK using the Android `apksigner` tool before it can be installed on devices or uploaded to the Play Store.

1. Generate a Keystore (if you haven't already):
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Sign the APK:
   ```bash
   apksigner sign --ks my-release-key.keystore --out Hear-Release.apk android/app/build/outputs/apk/release/app-release-unsigned.apk
   ```

Your native Android music streaming app is now ready for deployment!
