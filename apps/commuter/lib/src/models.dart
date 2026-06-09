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
  AppUser({required this.id, required this.email, required this.role});

  final String id;
  final String email;
  final String role;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        email: json['email'] as String,
        role: json['role'] as String,
      );
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
