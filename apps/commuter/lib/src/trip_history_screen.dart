import 'package:flutter/material.dart';

import 'api_client.dart';
import 'models.dart';
import 'theme.dart';

/// The rider's boarding history (GET /boardings/me).
class TripHistoryScreen extends StatefulWidget {
  const TripHistoryScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<TripHistoryScreen> createState() => _TripHistoryScreenState();
}

class _TripHistoryScreenState extends State<TripHistoryScreen> {
  List<BoardingHistoryItem> _items = [];
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
      _items = await widget.api.boardingHistory();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _date(DateTime dt) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} ${months[dt.month - 1]}, $h:$m';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip history'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
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
                  if (_items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 90),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(Icons.history_rounded, size: 48, color: Color(0xFFB7C2C7)),
                            SizedBox(height: 12),
                            Text('No trips yet', style: TextStyle(fontWeight: FontWeight.w600)),
                            SizedBox(height: 4),
                            Text('Your boardings will show up here.',
                                style: TextStyle(color: Color(0xFF7E8C92))),
                          ],
                        ),
                      ),
                    ),
                  for (final item in _items) ...[
                    _HistoryCard(item: item, dateLabel: _date(item.createdAt)),
                    const SizedBox(height: 10),
                  ],
                ],
              ),
            ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.item, required this.dateLabel});
  final BoardingHistoryItem item;
  final String dateLabel;

  @override
  Widget build(BuildContext context) {
    final completed = item.status == 'completed';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.directions_bus_rounded, color: AppColors.primary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.routeName ?? 'Trip',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(dateLabel,
                      style: TextStyle(color: AppColors.ink.withValues(alpha: 0.55), fontSize: 13)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('-${item.tokensSpent}',
                    style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primaryDark)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: (completed ? AppColors.ink : AppColors.primary).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    completed ? 'Completed' : 'Active',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: completed ? AppColors.ink.withValues(alpha: 0.6) : AppColors.primaryDark,
                    ),
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
