class AuthResult {
  AuthResult({required this.token, required this.user});

  final String token;
  final AppUser user;

  factory AuthResult.fromJson(Map<String, dynamic> json) => AuthResult(
        token: json['token'] as String,
        user: AppUser.fromJson(json['user'] as Map<String, dynamic>),
      );
}

class AppUser {
  AppUser({required this.id, required this.email, required this.role, required this.passCode});

  final String id;
  final String email;
  final String role;
  final String passCode;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        email: json['email'] as String,
        role: json['role'] as String,
        passCode: (json['passCode'] as String?) ?? '',
      );
}

class RouteInfo {
  RouteInfo({
    required this.id,
    required this.name,
    required this.origin,
    required this.destination,
    required this.fareTokens,
  });

  final String id;
  final String name;
  final String origin;
  final String destination;
  final int fareTokens;

  factory RouteInfo.fromJson(Map<String, dynamic> json) => RouteInfo(
        id: json['id'] as String,
        name: json['name'] as String,
        origin: json['origin'] as String,
        destination: json['destination'] as String,
        fareTokens: json['fareTokens'] as int,
      );
}

class Trip {
  Trip({
    required this.id,
    required this.routeId,
    required this.routeName,
    required this.origin,
    required this.destination,
    required this.fareTokens,
    required this.vehicleLabel,
    required this.scheduledAt,
    required this.status,
  });

  final String id;
  final String routeId;
  final String routeName;
  final String origin;
  final String destination;
  final int fareTokens;
  final String? vehicleLabel;
  final DateTime scheduledAt;
  final String status;

  factory Trip.fromJson(Map<String, dynamic> json) => Trip(
        id: json['id'] as String,
        routeId: json['routeId'] as String,
        routeName: json['routeName'] as String,
        origin: json['origin'] as String,
        destination: json['destination'] as String,
        fareTokens: json['fareTokens'] as int,
        vehicleLabel: json['vehicleLabel'] as String?,
        scheduledAt: DateTime.parse(json['scheduledAt'] as String).toLocal(),
        status: json['status'] as String,
      );
}

class BoardResult {
  BoardResult({required this.subscription, required this.trip});

  final Subscription subscription;
  final Trip trip;

  factory BoardResult.fromJson(Map<String, dynamic> json) => BoardResult(
        subscription: Subscription.fromJson(json['subscription'] as Map<String, dynamic>),
        trip: Trip.fromJson(json['trip'] as Map<String, dynamic>),
      );
}

class CheckoutResult {
  CheckoutResult({required this.paymentStatus, required this.subscription});

  final String paymentStatus; // paid | pending
  final Subscription? subscription;

  factory CheckoutResult.fromJson(Map<String, dynamic> json) => CheckoutResult(
        paymentStatus: (json['payment'] as Map<String, dynamic>)['status'] as String,
        subscription: json['subscription'] == null
            ? null
            : Subscription.fromJson(json['subscription'] as Map<String, dynamic>),
      );
}

class Stop {
  Stop({required this.name, required this.lat, required this.lng, required this.seq});

  final String name;
  final double lat;
  final double lng;
  final int seq;

  factory Stop.fromJson(Map<String, dynamic> json) => Stop(
        name: json['name'] as String,
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        seq: json['seq'] as int,
      );
}

class RouteDetail {
  RouteDetail({
    required this.id,
    required this.name,
    required this.origin,
    required this.destination,
    required this.fareTokens,
    required this.stops,
  });

  final String id;
  final String name;
  final String origin;
  final String destination;
  final int fareTokens;
  final List<Stop> stops;

  factory RouteDetail.fromJson(Map<String, dynamic> json) => RouteDetail(
        id: json['id'] as String,
        name: json['name'] as String,
        origin: json['origin'] as String,
        destination: json['destination'] as String,
        fareTokens: json['fareTokens'] as int,
        stops: (json['stops'] as List<dynamic>)
            .map((s) => Stop.fromJson(s as Map<String, dynamic>))
            .toList(),
      );
}

class BoardingHistoryItem {
  BoardingHistoryItem({
    required this.id,
    required this.routeName,
    required this.origin,
    required this.destination,
    required this.tokensSpent,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String? routeName;
  final String? origin;
  final String? destination;
  final int tokensSpent;
  final String status;
  final DateTime createdAt;

  factory BoardingHistoryItem.fromJson(Map<String, dynamic> json) => BoardingHistoryItem(
        id: json['id'] as String,
        routeName: json['routeName'] as String?,
        origin: json['origin'] as String?,
        destination: json['destination'] as String?,
        tokensSpent: json['tokensSpent'] as int,
        status: json['status'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
      );
}

/// Current active ride from GET /boardings/active. Null when the rider is idle.
class ActiveRide {
  ActiveRide({required this.boardingId, required this.trip});

  final String boardingId;
  final Trip? trip;

  static ActiveRide? fromJson(Map<String, dynamic> json) {
    if (json['active'] != true) return null;
    final boarding = json['boarding'] as Map<String, dynamic>;
    final trip = json['trip'] as Map<String, dynamic>?;
    return ActiveRide(
      boardingId: boarding['id'] as String,
      trip: trip == null ? null : Trip.fromJson(trip),
    );
  }
}

class Subscription {
  Subscription({
    required this.id,
    required this.plan,
    required this.status,
    required this.tokenBalance,
    required this.expiresAt,
  });

  final String id;
  final String plan;
  final String status;
  final int tokenBalance;
  final DateTime expiresAt;

  factory Subscription.fromJson(Map<String, dynamic> json) => Subscription(
        id: json['id'] as String,
        plan: json['plan'] as String,
        status: json['status'] as String,
        tokenBalance: json['tokenBalance'] as int,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
      );
}
