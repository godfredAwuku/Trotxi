import 'package:flutter/material.dart';

import 'api_client.dart';
import 'boarding_pass_screen.dart';
import 'models.dart';
import 'theme.dart';

/// Shows the route (stops) for a trip, then lets the rider board it.
/// Pops `true` if a boarding happened, so callers can refresh.
class RouteDetailScreen extends StatefulWidget {
  const RouteDetailScreen({
    super.key,
    required this.api,
    required this.trip,
    required this.passCode,
  });

  final ApiClient api;
  final Trip trip;
  final String passCode;

  @override
  State<RouteDetailScreen> createState() => _RouteDetailScreenState();
}

class _RouteDetailScreenState extends State<RouteDetailScreen> {
  RouteDetail? _route;
  bool _loading = true;
  bool _boarding = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      _route = await widget.api.routeDetail(widget.trip.routeId);
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _board() async {
    setState(() {
      _boarding = true;
      _error = null;
    });
    try {
      final result = await widget.api.boardTrip(widget.trip.id);
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => BoardingPassScreen(
            api: widget.api,
            passCode: widget.passCode,
            trip: result.trip,
          ),
        ),
      );
      if (mounted) Navigator.of(context).pop(true); // signal home to refresh
    } catch (e) {
      setState(() {
        _error = e.toString();
        _boarding = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Route'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(trip.routeName,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('${trip.origin}  →  ${trip.destination}',
                    style: TextStyle(color: AppColors.ink.withValues(alpha: 0.6))),
                const SizedBox(height: 20),
                if (_route != null) _StopsTimeline(stops: _route!.stops),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: const TextStyle(color: AppColors.danger)),
                ],
                const SizedBox(height: 24),
                Row(
                  children: [
                    const Icon(Icons.confirmation_number_outlined, size: 18, color: AppColors.primaryDark),
                    const SizedBox(width: 6),
                    Text('Fare: ${trip.fareTokens} token${trip.fareTokens > 1 ? 's' : ''}',
                        style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primaryDark)),
                  ],
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _boarding ? null : _board,
                  child: _boarding
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                      : const Text('Board this trip'),
                ),
              ],
            ),
    );
  }
}

class _StopsTimeline extends StatelessWidget {
  const _StopsTimeline({required this.stops});
  final List<Stop> stops;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Stops', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 12),
            for (int i = 0; i < stops.length; i++)
              _StopRow(stop: stops[i], isFirst: i == 0, isLast: i == stops.length - 1),
          ],
        ),
      ),
    );
  }
}

class _StopRow extends StatelessWidget {
  const _StopRow({required this.stop, required this.isFirst, required this.isLast});
  final Stop stop;
  final bool isFirst;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final color = isFirst
        ? AppColors.primary
        : isLast
            ? AppColors.accent
            : AppColors.ink.withValues(alpha: 0.4);
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                width: 14,
                height: 14,
                margin: const EdgeInsets.only(top: 2),
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              if (!isLast)
                Expanded(child: Container(width: 2, color: const Color(0xFFD7E0E3))),
            ],
          ),
          const SizedBox(width: 12),
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(stop.name, style: const TextStyle(fontSize: 15)),
          ),
        ],
      ),
    );
  }
}
