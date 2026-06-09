import 'package:flutter/material.dart';

import 'api_client.dart';
import 'models.dart';
import 'theme.dart';

/// Browse upcoming trips and board one (spends the route fare in tokens).
/// Pops `true` if the rider boarded, so the caller can refresh the balance.
class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  List<Trip> _trips = [];
  final Set<String> _boarded = {};
  bool _loading = true;
  String? _busyTripId;
  String? _error;
  bool _didBoard = false;

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
      _trips = await widget.api.upcomingTrips();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _board(Trip trip) async {
    setState(() {
      _busyTripId = trip.id;
      _error = null;
    });
    try {
      final result = await widget.api.boardTrip(trip.id);
      _didBoard = true;
      _boarded.add(trip.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.primaryDark,
            content: Text(
              'Boarded ${trip.routeName} · ${result.subscription.tokenBalance} tokens left',
            ),
          ),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busyTripId = null);
    }
  }

  String _time(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {},
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Upcoming trips'),
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.of(context).pop(_didBoard),
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : RefreshIndicator(
                color: AppColors.primary,
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_error != null) ...[
                      Text(_error!, style: const TextStyle(color: AppColors.danger)),
                      const SizedBox(height: 12),
                    ],
                    if (_trips.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 80),
                        child: Center(child: Text('No upcoming trips right now.')),
                      ),
                    for (final trip in _trips) ...[
                      _TripCard(
                        trip: trip,
                        time: _time(trip.scheduledAt),
                        boarded: _boarded.contains(trip.id),
                        busy: _busyTripId == trip.id,
                        onBoard: () => _board(trip),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({
    required this.trip,
    required this.time,
    required this.boarded,
    required this.busy,
    required this.onBoard,
  });

  final Trip trip;
  final String time;
  final bool boarded;
  final bool busy;
  final VoidCallback onBoard;

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
                Expanded(
                  child: Text(trip.routeName,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: (isActive ? AppColors.primary : AppColors.accent).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    isActive ? 'BOARDING NOW' : time,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isActive ? AppColors.primaryDark : const Color(0xFF9A6B2E),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.trip_origin, size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Expanded(child: Text(trip.origin, style: const TextStyle(fontSize: 13))),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(left: 6),
              child: Container(height: 14, width: 1.5, color: const Color(0xFFD7E0E3)),
            ),
            Row(
              children: [
                const Icon(Icons.place, size: 14, color: AppColors.accent),
                const SizedBox(width: 6),
                Expanded(child: Text(trip.destination, style: const TextStyle(fontSize: 13))),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Icon(Icons.directions_bus_rounded, size: 16, color: AppColors.ink.withValues(alpha: 0.5)),
                const SizedBox(width: 6),
                Text(trip.vehicleLabel ?? 'Vehicle TBA',
                    style: TextStyle(fontSize: 12, color: AppColors.ink.withValues(alpha: 0.6))),
                const Spacer(),
                Text('${trip.fareTokens} token${trip.fareTokens > 1 ? 's' : ''}',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primaryDark)),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: (boarded || busy) ? null : onBoard,
                style: boarded
                    ? FilledButton.styleFrom(backgroundColor: const Color(0xFFB7C2C7))
                    : null,
                child: busy
                    ? const SizedBox(
                        height: 18, width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                    : Text(boarded ? 'Boarded ✓' : 'Board this trip'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
