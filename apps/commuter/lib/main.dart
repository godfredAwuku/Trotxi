import 'package:flutter/material.dart';

import 'src/api_client.dart';
import 'src/auth_screen.dart';
import 'src/home_screen.dart';
import 'src/models.dart';
import 'src/theme.dart';

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
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: AnimatedSwitcher(
        duration: const Duration(milliseconds: 350),
        child: _user == null
            ? AuthScreen(key: const ValueKey('auth'), api: _api, onAuthed: _onAuthed)
            : HomeScreen(
                key: const ValueKey('home'),
                api: _api,
                user: _user!,
                onSignOut: _signOut,
              ),
      ),
    );
  }
}
