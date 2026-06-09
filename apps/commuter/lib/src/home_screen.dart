import 'package:flutter/material.dart';

import 'api_client.dart';
import 'boarding_pass_screen.dart';
import 'models.dart';
import 'theme.dart';
import 'trips_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.api, required this.user, required this.onSignOut});

  final ApiClient api;
  final AppUser user;
  final VoidCallback onSignOut;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Subscription? _sub;
  ActiveRide? _activeRide;
  bool _loading = true;
  bool _acting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        widget.api.mySubscription(),
        widget.api.activeRide(),
      ]);
      _sub = results[0] as Subscription?;
      _activeRide = results[1] as ActiveRide?;
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _subscribe() async {
    setState(() {
      _acting = true;
      _error = null;
    });
    try {
      _sub = await widget.api.subscribe();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _openTrips() async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => TripsScreen(api: widget.api, passCode: widget.user.passCode)),
    );
    _refresh();
  }

  Future<void> _openPass() async {
    final trip = _activeRide?.trip;
    if (trip == null) return;
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => BoardingPassScreen(api: widget.api, passCode: widget.user.passCode, trip: trip),
      ),
    );
    _refresh();
  }

  Future<void> _endRide() async {
    setState(() => _acting = true);
    try {
      await widget.api.completeRide();
      await _refresh();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  String get _initial =>
      widget.user.email.isNotEmpty ? widget.user.email[0].toUpperCase() : '?';

  @override
  Widget build(BuildContext context) {
    final onRide = _activeRide != null;
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: AppColors.primary,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _TopBar(initial: _initial, email: widget.user.email, onSignOut: widget.onSignOut),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_loading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 80),
                      child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                    )
                  else if (_sub == null)
                    _NoSubscription(busy: _acting, onSubscribe: _subscribe)
                  else ...[
                    _TokenCard(
                      sub: _sub!,
                      onRide: onRide,
                      onPrimary: onRide ? _openPass : _openTrips,
                    ),
                    if (onRide) ...[
                      const SizedBox(height: 16),
                      _ActiveRideCard(
                        ride: _activeRide!,
                        busy: _acting,
                        onViewPass: _openPass,
                        onEnd: _endRide,
                      ),
                    ],
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(_error!, style: const TextStyle(color: AppColors.danger)),
                  ],
                  if (_sub != null) ...[
                    const SizedBox(height: 28),
                    const Text('Quick actions',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    _ActionTile(
                      icon: Icons.route_outlined,
                      title: 'Browse trips',
                      subtitle: onRide ? 'Finish your ride to board another' : 'Find and board upcoming rides',
                      onTap: _openTrips,
                    ),
                    const SizedBox(height: 10),
                    const _ActionTile(icon: Icons.map_outlined, title: 'Live map', subtitle: 'Track your vehicle in real time (coming soon)'),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.initial, required this.email, required this.onSignOut});
  final String initial;
  final String email;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 20, 12, 20),
      decoration: const BoxDecoration(
        gradient: AppColors.brandGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: Colors.white.withValues(alpha: 0.22),
            child: Text(initial,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Welcome back',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13)),
                Text(email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
              ],
            ),
          ),
          IconButton(
            onPressed: onSignOut,
            icon: const Icon(Icons.logout_rounded, color: Colors.white),
            tooltip: 'Sign out',
          ),
        ],
      ),
    );
  }
}

class _TokenCard extends StatelessWidget {
  const _TokenCard({required this.sub, required this.onRide, required this.onPrimary});
  final Subscription sub;
  final bool onRide;
  final VoidCallback onPrimary;

  @override
  Widget build(BuildContext context) {
    final expiry = '${sub.expiresAt.year}-${sub.expiresAt.month.toString().padLeft(2, '0')}-${sub.expiresAt.day.toString().padLeft(2, '0')}';
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppColors.brandGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.28),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Commuter Monthly',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontWeight: FontWeight.w600)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(sub.status.toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('${sub.tokenBalance}',
                  style: const TextStyle(color: Colors.white, fontSize: 60, fontWeight: FontWeight.w800, height: 1)),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text('/ 100 tokens',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 16)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text('Renews $expiry',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13)),
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primaryDark,
              ),
              onPressed: onPrimary,
              child: Text(onRide ? 'View boarding pass' : 'Board a trip'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActiveRideCard extends StatelessWidget {
  const _ActiveRideCard({
    required this.ride,
    required this.busy,
    required this.onViewPass,
    required this.onEnd,
  });
  final ActiveRide ride;
  final bool busy;
  final VoidCallback onViewPass;
  final VoidCallback onEnd;

  @override
  Widget build(BuildContext context) {
    final trip = ride.trip;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.directions_bus_filled, color: AppColors.primary),
                const SizedBox(width: 8),
                const Text('On a ride', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const Spacer(),
                Container(
                  width: 9, height: 9,
                  decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                ),
              ],
            ),
            if (trip != null) ...[
              const SizedBox(height: 8),
              Text(trip.routeName, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('${trip.origin}  →  ${trip.destination}',
                  style: TextStyle(color: AppColors.ink.withValues(alpha: 0.6), fontSize: 13)),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: onViewPass,
                    child: const Text('View pass'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: busy ? null : onEnd,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: const BorderSide(color: AppColors.danger),
                      minimumSize: const Size.fromHeight(54),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('End ride'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _NoSubscription extends StatelessWidget {
  const _NoSubscription({required this.busy, required this.onSubscribe});
  final bool busy;
  final VoidCallback onSubscribe;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.confirmation_number_outlined, color: AppColors.primary, size: 36),
            ),
            const SizedBox(height: 18),
            const Text('No active plan',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              'Subscribe to Commuter Monthly and get 100 tokens for reliable daily rides.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.ink.withValues(alpha: 0.6), height: 1.4),
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: busy ? null : onSubscribe,
              child: busy
                  ? const SizedBox(
                      height: 20, width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                  : const Text('Subscribe  ·  100 tokens'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({required this.icon, required this.title, required this.subtitle, this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: TextStyle(color: AppColors.ink.withValues(alpha: 0.55), fontSize: 13)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: AppColors.ink.withValues(alpha: 0.3)),
            ],
          ),
        ),
      ),
    );
  }
}
