import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';
import 'models.dart';

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Thin client over the Trotxi REST API.
class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  String? _token;

  void setToken(String? token) => _token = token;

  Uri _uri(String path) => Uri.parse('${AppConfig.apiBaseUrl}$path');

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  dynamic _decode(http.Response res) {
    final body = res.body.isEmpty ? {} : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      final message =
          body is Map && body['message'] != null ? body['message'] as String : 'Request failed (${res.statusCode})';
      throw ApiException(message);
    }
    return body;
  }

  Future<AuthResult> register(String email, String password) async {
    final res = await _client.post(
      _uri('/auth/register'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    return AuthResult.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<AuthResult> login(String email, String password) async {
    final res = await _client.post(
      _uri('/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    return AuthResult.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<Subscription> subscribe() async {
    final res = await _client.post(
      _uri('/subscriptions'),
      headers: _headers,
      body: jsonEncode({'plan': 'commuter_monthly'}),
    );
    return Subscription.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<CheckoutResult> checkout({
    required String phone,
    required String network,
    String plan = 'commuter_monthly',
  }) async {
    final res = await _client.post(
      _uri('/payments/checkout'),
      headers: _headers,
      body: jsonEncode({'plan': plan, 'phone': phone, 'network': network}),
    );
    return CheckoutResult.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<Subscription?> mySubscription() async {
    final res = await _client.get(_uri('/subscriptions/me'), headers: _headers);
    if (res.statusCode == 404) return null;
    return Subscription.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<Subscription> redeem({int tokens = 1}) async {
    final res = await _client.post(
      _uri('/subscriptions/redeem'),
      headers: _headers,
      body: jsonEncode({'tokens': tokens}),
    );
    return Subscription.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<List<Trip>> upcomingTrips() async {
    final res = await _client.get(_uri('/trips'), headers: _headers);
    final list = _decode(res) as List<dynamic>;
    return list.map((j) => Trip.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<RouteDetail> routeDetail(String routeId) async {
    final res = await _client.get(_uri('/routes/$routeId'), headers: _headers);
    return RouteDetail.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<VehiclePosition> tripPosition(String tripId) async {
    final res = await _client.get(_uri('/trips/$tripId/position'), headers: _headers);
    return VehiclePosition.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<BoardResult> boardTrip(String tripId) async {
    final res = await _client.post(
      _uri('/trips/$tripId/board'),
      headers: _headers,
      body: jsonEncode(const <String, dynamic>{}),
    );
    return BoardResult.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<ActiveRide?> activeRide() async {
    final res = await _client.get(_uri('/boardings/active'), headers: _headers);
    return ActiveRide.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<void> completeRide() async {
    final res = await _client.post(
      _uri('/boardings/active/complete'),
      headers: _headers,
      body: jsonEncode(const <String, dynamic>{}),
    );
    _decode(res);
  }

  Future<List<BoardingHistoryItem>> boardingHistory() async {
    final res = await _client.get(_uri('/boardings/me'), headers: _headers);
    final list = _decode(res) as List<dynamic>;
    return list.map((j) => BoardingHistoryItem.fromJson(j as Map<String, dynamic>)).toList();
  }
}
