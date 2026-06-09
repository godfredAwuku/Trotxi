/// App configuration.
///
/// The API base URL differs per platform when running locally:
///  - Android emulator reaches the host machine at 10.0.2.2
///  - iOS simulator and desktop reach it at localhost
///
/// Override at build time with:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.50:3000
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );
}
