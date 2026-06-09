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
      final message = body is Map && body['message'] != null
          ? body['message'] as String
          : 'Request failed (${res.statusCode})';
      throw ApiException(message);
    }
    return body;
  }

  Future<AuthResult> register(String email, String password) async {
    final res = await _client.post(
      _uri('/auth/register'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password, 'role': 'driver'}),
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

  Future<List<Trip>> trips() async {
    final res = await _client.get(_uri('/trips'), headers: _headers);
    final list = _decode(res) as List<dynamic>;
    return list.map((j) => Trip.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<RouteDetail> routeDetail(String routeId) async {
    final res = await _client.get(_uri('/routes/$routeId'), headers: _headers);
    return RouteDetail.fromJson(_decode(res) as Map<String, dynamic>);
  }

  Future<void> publishPosition(String tripId, double lat, double lng, {double? bearing}) async {
    final res = await _client.post(
      _uri('/trips/$tripId/position'),
      headers: _headers,
      body: jsonEncode({'lat': lat, 'lng': lng, if (bearing != null) 'bearing': bearing}),
    );
    _decode(res);
  }

  Future<PassVerification> verifyPass(String passCode) async {
    final res = await _client.post(
      _uri('/pass/verify'),
      headers: _headers,
      body: jsonEncode({'passCode': passCode}),
    );
    return PassVerification.fromJson(_decode(res) as Map<String, dynamic>);
  }
}
