import 'package:flutter/material.dart';

import 'src/api_client.dart';
import 'src/auth_screen.dart';
import 'src/home_screen.dart';
import 'src/models.dart';

void main() {
  runApp(const TrotxiApp());
}

class TrotxiApp extends StatefulWidget {
  const TrotxiApp({super.key});

  @override
  State<TrotxiApp> createState() => _TrotxiAppState();
}

class _TrotxiAppState extends State<TrotxiApp> {
  final ApiClient _api = ApiClient();
  AppUser? _user;

  void _onAuthed(AuthResult result) {
    _api.setToken(result.token);
    setState(() => _user = result.user);
  }

  void _signOut() {
    _api.setToken(null);
    setState(() => _user = null);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Trotxi',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1B998B)),
        useMaterial3: true,
      ),
      home: _user == null
          ? AuthScreen(api: _api, onAuthed: _onAuthed)
          : HomeScreen(api: _api, user: _user!, onSignOut: _signOut),
    );
  }
}
