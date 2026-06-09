# Trotxi Commuter App (Flutter)

The commuter-facing mobile app: register/sign in, subscribe to a monthly plan,
view your token balance, and redeem a token per trip.

## Status

This is a hand-written scaffold (`lib/` + `pubspec.yaml`). The platform folders
(`android/`, `ios/`, etc.) are **not** generated yet.

## First-time setup

You need Flutter installed (`flutter --version`). Then, from this directory:

```bash
# Generate the platform folders without overwriting lib/ or pubspec.yaml
flutter create .

flutter pub get
```

## Run

Start the backend first (from the repo root):

```bash
make up        # Postgres, Redis, EMQX
make dev       # API on http://localhost:3000
```

Then run the app. The API base URL defaults to `http://10.0.2.2:3000`
(the Android-emulator alias for your host machine). Override it for other targets:

```bash
# Android emulator (default)
flutter run

# iOS simulator / desktop / web
flutter run --dart-define=API_BASE_URL=http://localhost:3000

# Physical device on your LAN
flutter run --dart-define=API_BASE_URL=http://<your-machine-ip>:3000
```

## Structure

```
lib/
├── main.dart              # App entry, holds auth state, swaps Auth <-> Home
└── src/
    ├── config.dart        # API base URL (compile-time --dart-define)
    ├── api_client.dart    # REST client over the Trotxi API
    ├── models.dart        # AuthResult, AppUser, Subscription
    ├── auth_screen.dart   # Register / sign in
    └── home_screen.dart   # Subscription + token balance + redeem
```
