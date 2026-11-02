# Avero Academy Mobile (iOS & Android)

Native mobile application for **Avero Academy — Nursing Council Exam Prep & CBT Question Bank**, built using **Expo SDK 58**, **Expo Router**, and **React Native**.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd mobile
bun install
```

### 2. Environment Configuration
Create a `.env` file in `/mobile` (optional for local testing):
```env
# Default connects to production API:
EXPO_PUBLIC_API_URL=https://www.avero.academy

# Or for local testing against your local Next.js server:
# On physical device (replace with your machine's LAN IP):
# EXPO_PUBLIC_API_URL=http://192.168.1.X:3000
# On Android Emulator:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
# On iOS Simulator:
# EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 3. Run the Development Server
```bash
bun start
# or: npx expo start
```

- **Physical Device:** Install **Expo Go** from the Apple App Store or Google Play Store, then scan the QR code displayed in the terminal.
- **iOS Simulator:** Press `i` in the terminal (macOS required).
- **Android Emulator:** Press `a` in the terminal.
- **Web Preview:** Press `w` in the terminal.

---

## 📱 App Structure

```
mobile/
├── app/
│   ├── _layout.tsx         # Root Layout (QueryClientProvider, AuthProvider, StatusBar)
│   ├── index.tsx           # Route splash guard (checks authentication & redirects)
│   ├── (auth)/             # Authentication screens
│   │   ├── login.tsx       # Sign in with email & password
│   │   ├── signup.tsx      # Create account with specialty & graduation year
│   │   └── forgot-password.tsx
│   ├── (tabs)/             # Main bottom navigation
│   │   ├── home.tsx        # Dashboard, streak count, daily goal, quick actions
│   │   ├── courses.tsx     # Past question modules & subject filters
│   │   ├── mock-exam.tsx   # Council CBT Simulator (Paper 1, Paper 2, Custom)
│   │   ├── flashcards.tsx  # Spaced repetition retention deck with 3D flip card
│   │   └── profile.tsx     # Student profile, settings, Pro status, sign out
│   └── exam/               # Active CBT Exam Engine
│       ├── [id].tsx        # Fullscreen timed exam room with question grid & auto-submit
│       └── result/[attemptId].tsx # Detailed score, council benchmark & rationale review
├── constants/
│   └── theme.ts            # Avero brand palette (#0B1528, #00D2B4, #10B981)
├── context/
│   └── AuthContext.tsx     # Global JWT auth, user state & session management
└── lib/
    ├── api.ts              # API client with auto-injected Bearer tokens
    └── storage.ts          # Hardware-backed SecureStore token persistence
```

---

## 📦 Building for App Store & Google Play (EAS)

1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Configure build: `eas build:configure`
4. Build Android APK/AAB: `eas build --platform android`
5. Build iOS IPA: `eas build --platform ios`
