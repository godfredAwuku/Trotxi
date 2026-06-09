import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

/// App configuration.
///
/// The API base URL is resolved automatically per platform so that a plain
/// `flutter run` works on macOS, iOS simulator, web, and desktop. The Android
/// emulator is the one exception — it reaches the host machine at 10.0.2.2.
///
/// Override for a physical device on your LAN (or any custom host) with:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.50:3000
class AppConfig {
  static const String _override = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    if (_override.isNotEmpty) return _override;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }
}
