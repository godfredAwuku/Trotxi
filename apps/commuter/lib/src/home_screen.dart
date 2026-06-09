import 'package:flutter/material.dart';

import 'api_client.dart';
import 'models.dart';

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
  bool _loading = true;
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
      _sub = await widget.api.mySubscription();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _run(Future<Subscription> Function() action) async {
    setState(() => _error = null);
    try {
      final sub = await action();
      setState(() => _sub = sub);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trotxi'),
        actions: [IconButton(onPressed: widget.onSignOut, icon: const Icon(Icons.logout))],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('Hi, ${widget.user.email}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 24),
            if (_loading)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
            else if (_sub == null)
              _NoSubscription(onSubscribe: () => _run(widget.api.subscribe))
            else
              _SubscriptionCard(sub: _sub!, onRedeem: () => _run(() => widget.api.redeem())),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
          ],
        ),
      ),
    );
  }
}

class _NoSubscription extends StatelessWidget {
  const _NoSubscription({required this.onSubscribe});
  final VoidCallback onSubscribe;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const Text('No active subscription'),
            const SizedBox(height: 8),
            const Text('Subscribe to get 100 commute tokens for the month.',
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onSubscribe, child: const Text('Subscribe — commuter monthly')),
          ],
        ),
      ),
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  const _SubscriptionCard({required this.sub, required this.onRedeem});
  final Subscription sub;
  final VoidCallback onRedeem;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(sub.plan, style: Theme.of(context).textTheme.titleLarge),
            Text('Status: ${sub.status}'),
            const SizedBox(height: 16),
            Center(
              child: Column(
                children: [
                  Text('${sub.tokenBalance}',
                      style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold)),
                  const Text('tokens remaining'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(onPressed: onRedeem, child: const Text('Redeem a trip (-1 token)')),
            ),
          ],
        ),
      ),
    );
  }
}
