class AuthResult {
  AuthResult({required this.token, required this.user});
  final String token;
  final DriverUser user;
  factory AuthResult.fromJson(Map<String, dynamic> json) => AuthResult(
        token: json['token'] as String,
        user: DriverUser.fromJson(json['user'] as Map<String, dynamic>),
      );
}

class DriverUser {
  DriverUser({required this.id, required this.email, required this.role});
  final String id;
  final String email;
  final String role;
  factory DriverUser.fromJson(Map<String, dynamic> json) => DriverUser(
        id: json['id'] as String,
        email: json['email'] as String,
        role: json['role'] as String,
      );
}

class Trip {
  Trip({
    required this.id,
    required this.routeId,
    required this.routeName,
    required this.origin,
    required this.destination,
    required this.vehicleLabel,
    required this.scheduledAt,
    required this.status,
  });
  final String id;
  final String routeId;
  final String routeName;
  final String origin;
  final String destination;
  final String? vehicleLabel;
  final DateTime scheduledAt;
  final String status;
  factory Trip.fromJson(Map<String, dynamic> json) => Trip(
        id: json['id'] as String,
        routeId: json['routeId'] as String,
        routeName: json['routeName'] as String,
        origin: json['origin'] as String,
        destination: json['destination'] as String,
        vehicleLabel: json['vehicleLabel'] as String?,
        scheduledAt: DateTime.parse(json['scheduledAt'] as String).toLocal(),
        status: json['status'] as String,
      );
}

/// Result of scanning/looking up a rider's QR pass code.
class PassVerification {
  PassVerification({
    required this.valid,
    required this.riderEmail,
    required this.hasActiveRide,
    required this.routeName,
  });
  final bool valid;
  final String? riderEmail;
  final bool hasActiveRide;
  final String? routeName;

  factory PassVerification.fromJson(Map<String, dynamic> json) {
    final ride = json['ride'] as Map<String, dynamic>?;
    final trip = ride?['trip'] as Map<String, dynamic>?;
    return PassVerification(
      valid: json['valid'] == true,
      riderEmail: (json['rider'] as Map<String, dynamic>?)?['email'] as String?,
      hasActiveRide: json['hasActiveRide'] == true,
      routeName: trip?['routeName'] as String?,
    );
  }
}
