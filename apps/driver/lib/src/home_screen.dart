import 'package:flutter/material.dart';

import 'api_client.dart';
import 'drive_screen.dart';
import 'models.dart';
import 'scan_screen.dart';
import 'theme.dart';

class DriverHome extends StatefulWidget {
  const DriverHome({super.key, required this.api, required this.user, required this.onSignOut});
  final ApiClient api;
  final DriverUser user;
  final VoidCallback onSignOut;

  @override
  State<DriverHome> createState() => _DriverHomeState();
}

class _DriverHomeState extends State<DriverHome> {
  List<Trip> _trips = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _trips = await widget.api.trips();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _time(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ScanScreen(api: widget.api)),
        ),
        icon: const Icon(Icons.qr_code_scanner),
        label: const Text('Scan pass'),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _load,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            Container(
              padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 20, 12, 20),
              decoration: const BoxDecoration(
                gradient: AppColors.brandGradient,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.directions_bus_filled, color: Colors.white, size: 30),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Trotxi Driver',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20)),
                        Text(widget.user.email,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13)),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: widget.onSignOut,
                    icon: const Icon(Icons.logout_rounded, color: Colors.white),
                    tooltip: 'Sign out',
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Today's trips",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  if (_loading)
                    const Padding(
                        padding: EdgeInsets.symmetric(vertical: 60),
                        child: Center(child: CircularProgressIndicator(color: AppColors.primary)))
                  else if (_error != null)
                    Text(_error!, style: const TextStyle(color: AppColors.danger))
                  else if (_trips.isEmpty)
                    const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No trips scheduled.')))
                  else
                    for (final trip in _trips) ...[
                      _TripCard(trip: trip, time: _time(trip.scheduledAt), onDrive: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => DriveScreen(api: widget.api, trip: trip)),
                        );
                      }),
                      const SizedBox(height: 12),
                    ],
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.trip, required this.time, required this.onDrive});
  final Trip trip;
  final String time;
  final VoidCallback onDrive;

  @override
  Widget build(BuildContext context) {
    final isActive = trip.status == 'active';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(trip.routeName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: (isActive ? AppColors.good : AppColors.accent).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(isActive ? 'ACTIVE' : time,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isActive ? AppColors.good : const Color(0xFF9A6B2E))),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text('${trip.origin}  →  ${trip.destination}',
                style: TextStyle(color: AppColors.ink.withValues(alpha: 0.6), fontSize: 13)),
            if (trip.vehicleLabel != null) ...[
              const SizedBox(height: 2),
              Text(trip.vehicleLabel!, style: TextStyle(color: AppColors.ink.withValues(alpha: 0.5), fontSize: 12)),
            ],
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onDrive,
                icon: const Icon(Icons.navigation_rounded, size: 18),
                label: const Text('Start driving'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
