import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import 'api_client.dart';
import 'models.dart';
import 'scan_screen.dart';
import 'theme.dart';

/// Active driving screen. Walks the vehicle along the route's stops and
/// publishes each position to POST /trips/:id/position, so commuters see the
/// bus move on their live map (source: "live").
///
/// On a physical device this is where device GPS (geolocator) would feed the
/// same publish call; on the simulator we drive a deterministic path.
class DriveScreen extends StatefulWidget {
  const DriveScreen({super.key, required this.api, required this.trip});
  final ApiClient api;
  final Trip trip;

  @override
  State<DriveScreen> createState() => _DriveScreenState();
}

class _DriveScreenState extends State<DriveScreen> {
  final MapController _map = MapController();
  List<LatLng> _route = [];
  Timer? _timer;
  double _t = 0; // 0..1 progress along the route
  LatLng? _pos;
  int _fixes = 0;
  DateTime? _lastSent;
  bool _publishing = false;
  String _status = 'Loading route…';

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _init() async {
    try {
      final route = await widget.api.routeDetail(widget.trip.routeId);
      _route = route.stops.map((s) => LatLng(s.lat, s.lng)).toList();
      if (_route.length < 2) {
        setState(() => _status = 'Route has no stops to drive.');
        return;
      }
      setState(() {
        _publishing = true;
        _status = 'On duty — sharing live location';
      });
      _timer = Timer.periodic(const Duration(seconds: 2), (_) => _tick());
      _tick();
    } catch (e) {
      setState(() => _status = e.toString());
    }
  }

  Future<void> _tick() async {
    final segments = _route.length - 1;
    final pos = _t * segments;
    final i = math.min(pos.floor(), segments - 1);
    final frac = pos - i;
    final from = _route[i];
    final to = _route[i + 1];
    final here = LatLng(
      from.latitude + (to.latitude - from.latitude) * frac,
      from.longitude + (to.longitude - from.longitude) * frac,
    );
    final bearing = _bearing(from, to);

    setState(() => _pos = here);
    _map.move(here, _map.camera.zoom);

    try {
      await widget.api.publishPosition(widget.trip.id, here.latitude, here.longitude, bearing: bearing);
      if (mounted) {
        setState(() {
          _fixes++;
          _lastSent = DateTime.now();
        });
      }
    } catch (_) {/* transient */}

    _t += 0.02; // advance ~ each tick
    if (_t >= 1) _t = 0; // loop the route
  }

  double _bearing(LatLng a, LatLng b) {
    final dy = b.latitude - a.latitude;
    final dx = b.longitude - a.longitude;
    return (math.atan2(dx, dy) * 180 / math.pi + 360) % 360;
  }

  void _endShift() {
    _timer?.cancel();
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final center = _pos ?? (_route.isNotEmpty ? _route.first : const LatLng(5.6037, -0.187));
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
            options: MapOptions(initialCenter: center, initialZoom: 14),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.trotxi.driver',
              ),
              if (_route.isNotEmpty)
                PolylineLayer(polylines: [Polyline(points: _route, strokeWidth: 4, color: AppColors.primary)]),
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
                    Text(
                      'Fixes published: $_fixes'
                      '${_lastSent != null ? '  ·  ${_lastSent!.hour.toString().padLeft(2, '0')}:${_lastSent!.minute.toString().padLeft(2, '0')}:${_lastSent!.second.toString().padLeft(2, '0')}' : ''}',
                      style: TextStyle(color: AppColors.ink.withValues(alpha: 0.6), fontSize: 13),
                    ),
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
