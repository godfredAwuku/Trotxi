# Trotxi Driver App (Flutter)

The driver/conductor app:
- **Auth** — register/sign in as a driver (role `driver`).
- **Today's trips** — the trips to run.
- **Drive** — streams device GPS and publishes each fix to `POST /trips/:id/position`,
  so commuters see the vehicle move on their live map in real time.
- **Scan pass** — scans a rider's QR (their `passCode`) via the camera, or accepts
  a typed code, and verifies it against `POST /pass/verify` to confirm a valid
  active ride before boarding.

## Run

Start the backend first (repo root): `make up && make migrate && make seed && make dev`.

```bash
cd apps/driver
flutter pub get
flutter run            # localhost API auto-detected on iOS/macOS
```

## Notes / simulator limitations
- **Camera QR scanning needs a physical device** — the iOS simulator has no camera.
  On the simulator, use the **"Enter the pass code"** field on the Scan screen
  (copy the rider's pass code from the commuter app's boarding pass).
- **GPS on the simulator**: set a location via Xcode -> Features -> Location.
  The Drive screen will publish it.
- Permissions are declared in ios/Runner/Info.plist
  (NSCameraUsageDescription, NSLocationWhenInUseUsageDescription).
