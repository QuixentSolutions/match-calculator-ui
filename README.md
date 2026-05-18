# Match Calculator — Mobile App (Frontend)

React Native mobile app built with Expo for the Match Calculator matrimonial compatibility platform.

---

## Tech Stack

- React Native 0.81
- Expo SDK 54
- Expo Router (file-based navigation)
- TypeScript

---

## Prerequisites

- Node.js >= 18
- Expo Go app on your phone **or** Android/iOS emulator
- Backend API running (see `match-calculator-api`)

---

## Setup

```bash
npm install
```

Create a `.env` file in this folder:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000
EXPO_PUBLIC_MATCH_API_URL=http://localhost:5001
```

> If using a physical device, replace `localhost` with your machine's local IP (e.g. `192.168.1.5`)

---

## Running the App

```bash
# Start Expo dev server
npm start

# Android emulator
npm run android

# iOS simulator
npm run ios

# Web browser
npm run web
```

---

## Folder Structure

```
match-calculator-ui/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx        # Mobile number entry
│   │   ├── otp.tsx          # OTP verification
│   │   └── profile.tsx      # Profile setup
│   ├── (main)/
│   │   ├── home.tsx         # Connect with partner (code entry)
│   │   ├── matches.tsx      # Active match view
│   │   ├── questions.tsx    # Compatibility quiz
│   │   ├── score.tsx        # Compatibility result
│   │   ├── chat.tsx         # In-app messaging
│   │   └── edit-profile.tsx # Edit profile
│   └── _layout.tsx          # Root layout & auth guard
├── api/
│   └── client.ts            # API call functions
├── constants/
│   └── theme.ts             # Colors, spacing, fonts
├── context/
│   └── auth.tsx             # Auth state (token, user)
├── types/
│   └── index.ts             # Shared TypeScript types
└── utils/
    └── storage.ts           # Secure local storage helpers
```

---

## Screens

| Screen | Description |
|---|---|
| Login | Enter 10-digit mobile number to receive OTP |
| OTP | Enter 6-digit OTP to verify and log in |
| Profile | Set up name, gender, age range, city and bio |
| Connect (Home) | Generate your code or enter partner's code |
| Matches | View your active match and quiz progress |
| Questions | Answer compatibility questions |
| Score | See your compatibility percentage and breakdown |
| Chat | Message your connected partner |
| Edit Profile | Update your profile details |
