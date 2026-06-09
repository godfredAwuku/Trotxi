import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import 'api_client.dart';
import 'models.dart';
import 'scan_screen.dart';
import 'theme.dart';

/// Active driving screen: streams the device GPS and publishes each fix to the
/// backend so commuters see the vehicle move on their live map.
class DriveScreen extends StatefulWidget {
  const DriveScreen({super.key, required this.api, required this.trip});
  final ApiClient api;
  final Trip trip;

  @override
  State<DriveScreen> createState() => _DriveScreenState();
}

class _DriveScreenState extends State<DriveScreen> {
  final MapController _map = MapController();
  StreamSubscription<Position>? _sub;
  LatLng? _pos;
  int _fixes = 0;
  DateTime? _lastSent;
  String _status = 'Starting…';
  bool _publishing = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _start() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      setState(() => _status = 'Location services are disabled.');
      return;
    }
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      setState(() => _status = 'Location permission denied.');
      return;
    }
    setState(() {
      _publishing = true;
      _status = 'On duty — sharing live location';
    });
    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 5),
    ).listen(_onFix, onError: (e) => setState(() => _status = 'GPS error: $e'));
  }

  Future<void> _onFix(Position p) async {
    final here = LatLng(p.latitude, p.longitude);
    setState(() => _pos = here);
    _map.move(here, _map.camera.zoom);
    try {
      await widget.api.publishPosition(
        widget.trip.id,
        p.latitude,
        p.longitude,
        bearing: p.heading >= 0 ? p.heading : null,
      );
      if (mounted) {
        setState(() {
          _fixes++;
          _lastSent = DateTime.now();
        });
      }
    } catch (_) {
      // keep driving; transient publish failures are fine
    }
  }

  void _endShift() {
    _sub?.cancel();
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final center = _pos ?? const LatLng(5.6037, -0.187);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.trip.routeName),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: 'Scan pass',
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => ScanScreen(api: widget.api)),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(initialCenter: center, initialZoom: 15),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.trotxi.driver',
              ),
              if (_pos != null)
                MarkerLayer(markers: [
                  Marker(
                    point: _pos!,
                    width: 44,
                    height: 44,
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.primaryDark,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 6)],
                      ),
                      child: const Icon(Icons.navigation, color: Colors.white, size: 22),
                    ),
                  ),
                ]),
            ],
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: _publishing ? AppColors.good : AppColors.danger,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_status, style: const TextStyle(fontWeight: FontWeight.w700))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('Fixes sent: $_fixes'
                        '${_lastSent != null ? '  ·  last ${_lastSent!.hour.toString().padLeft(2, '0')}:${_lastSent!.minute.toString().padLeft(2, '0')}:${_lastSent!.second.toString().padLeft(2, '0')}' : ''}',
                        style: TextStyle(color: AppColors.ink.withValues(alpha: 0.6), fontSize: 13)),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _endShift,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.danger,
                          side: const BorderSide(color: AppColors.danger),
                          minimumSize: const Size.fromHeight(50),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text('End shift'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
