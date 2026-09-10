import type { ExpoConfig } from "expo/config";

const appName = process.env.MEDCONNECT_APP_NAME ?? "MedConnect";
const slug = process.env.MEDCONNECT_APP_SLUG ?? "medconnect";
const scheme = process.env.MEDCONNECT_APP_SCHEME ?? "medconnect";
const iosBundleIdentifier =
  process.env.MEDCONNECT_IOS_BUNDLE_IDENTIFIER ?? "com.medconnect.patient";
const androidPackage = process.env.MEDCONNECT_ANDROID_PACKAGE ?? "com.medconnect.patient";
const appleTeamId = process.env.MEDCONNECT_APPLE_TEAM_ID ?? "X5FBW5LBB8";
const appGroupIdentifier =
  process.env.MEDCONNECT_IOS_APP_GROUP ?? `group.${iosBundleIdentifier}`;
const easProjectId =
  process.env.MEDCONNECT_EAS_PROJECT_ID ?? "ed2a71d7-947b-4566-bd40-129de63489cd";
const owner = process.env.MEDCONNECT_EXPO_OWNER ?? "ddevcat";
const updatesUrl =
  process.env.MEDCONNECT_UPDATES_URL ?? `https://u.expo.dev/${easProjectId}`;

const config: ExpoConfig = {
  name: appName,
  slug,
  scheme,
  version: process.env.MEDCONNECT_APP_VERSION ?? "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: iosBundleIdentifier,
    appleTeamId,
    supportsTablet: false,
    config: {
      usesNonExemptEncryption: false
    },
    entitlements: {
      "com.apple.security.application-groups": [appGroupIdentifier]
    },
    infoPlist: {
      NSFaceIDUsageDescription: "MedConnect uses biometrics to protect the patient session.",
      NSSupportsLiveActivities: true
    }
  },
  android: {
    package: androidPackage,
    predictiveBackGestureEnabled: true,
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#F0503C"
    },
    permissions: ["POST_NOTIFICATIONS"]
  },
  plugins: [
    "expo-router",
    [
      "expo-secure-store",
      {
        configureAndroidBackup: false,
        faceIDPermission: "MedConnect uses biometrics to protect the patient session."
      }
    ],
    [
      "expo-local-authentication",
      {
        faceIDPermission: "MedConnect uses Face ID to protect the patient session."
      }
    ],
    [
      "expo-notifications",
      {
        color: "#F0503C",
        defaultChannel: "appointments"
      }
    ],
    [
      "expo-camera",
      {
        cameraPermission: "MedConnect uses the camera to scan portal QR login codes.",
        microphonePermission: false,
        recordAudioAndroid: false
      }
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F0503C",
        image: "./assets/icon.png",
        imageWidth: 128,
        dark: {
          backgroundColor: "#0f1320",
          image: "./assets/icon.png"
        }
      }
    ],
    [
      "expo-widgets",
      {
        groupIdentifier: appGroupIdentifier,
        widgets: [
          {
            name: "LoyaltyWidget",
            displayName: "Punkty MedConnect",
            description: "Your loyalty points for completed visits.",
            supportedFamilies: ["systemSmall", "systemMedium"]
          }
        ]
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  runtimeVersion: {
    policy: "appVersion"
  },
  extra: {
    router: {},
    eas: {
      projectId: easProjectId
    }
  },
  owner,
  updates: {
    url: updatesUrl
  }
};

export default config;


