import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import 'api_client.dart';
import 'models.dart';
import 'theme.dart';

/// Live vehicle tracking for a trip: the route drawn from its stops, with the
/// vehicle marker polled from GET /trips/:id/position every few seconds.
class LiveMapScreen extends StatefulWidget {
  const LiveMapScreen({super.key, required this.api, required this.trip});

  final ApiClient api;
  final Trip trip;

  @override
  State<LiveMapScreen> createState() => _LiveMapScreenState();
}

class _LiveMapScreenState extends State<LiveMapScreen> {
  final MapController _map = MapController();
  List<LatLng> _routePoints = [];
  List<Stop> _stops = [];
  VehiclePosition? _vehicle;
  Timer? _timer;
  bool _loading = true;
  String? _error;

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
      _stops = route.stops;
      _routePoints = route.stops.map((s) => LatLng(s.lat, s.lng)).toList();
      await _poll();
      _timer = Timer.periodic(const Duration(seconds: 3), (_) => _poll());
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _poll() async {
    try {
      final pos = await widget.api.tripPosition(widget.trip.id);
      if (!mounted) return;
      setState(() => _vehicle = pos);
      _map.move(LatLng(pos.lat, pos.lng), _map.camera.zoom);
    } catch (_) {
      // transient; keep last known position
    }
  }

  @override
  Widget build(BuildContext context) {
    final center = _routePoints.isNotEmpty ? _routePoints.first : const LatLng(5.6037, -0.187);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live map'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
              : Stack(
                  children: [
                    FlutterMap(
                      mapController: _map,
                      options: MapOptions(initialCenter: center, initialZoom: 13),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.trotxi.commuter',
                        ),
                        PolylineLayer(
                          polylines: [
                            Polyline(points: _routePoints, strokeWidth: 4, color: AppColors.primary),
                          ],
                        ),
                        MarkerLayer(
                          markers: [
                            for (final s in _stops)
                              Marker(
                                point: LatLng(s.lat, s.lng),
                                width: 14,
                                height: 14,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppColors.primary, width: 3),
                                  ),
                                ),
                              ),
                            if (_vehicle != null)
                              Marker(
                                point: LatLng(_vehicle!.lat, _vehicle!.lng),
                                width: 44,
                                height: 44,
                                child: Transform.rotate(
                                  angle: _vehicle!.bearing * 3.1415926 / 180,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryDark,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white, width: 3),
                                      boxShadow: [
                                        BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 6),
                                      ],
                                    ),
                                    child: const Icon(Icons.navigation, color: Colors.white, size: 22),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 16,
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              const Icon(Icons.directions_bus_filled, color: AppColors.primary),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(widget.trip.routeName,
                                        style: const TextStyle(fontWeight: FontWeight.w700)),
                                    if (_vehicle != null)
                                      Text('Next stop: ${_vehicle!.nextStop}',
                                          style: TextStyle(
                                              color: AppColors.ink.withValues(alpha: 0.6), fontSize: 13)),
                                  ],
                                ),
                              ),
                              if (_vehicle != null)
                                Text('${(_vehicle!.progress * 100).round()}%',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w800, color: AppColors.primaryDark)),
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
