import 'package:flutter/material.dart';

import 'api_client.dart';
import 'theme.dart';

const int kPlanPriceGhs = 250;

class _Network {
  const _Network(this.id, this.label);
  final String id;
  final String label;
}

const _networks = [
  _Network('mtn', 'MTN MoMo'),
  _Network('telecel', 'Telecel Cash'),
  _Network('airteltigo', 'AirtelTigo Money'),
];

/// Mobile-money checkout for the Commuter Monthly plan.
/// Pops `true` once the subscription is active.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _phone = TextEditingController();
  String _network = 'mtn';
  bool _busy = false;
  String? _error;
  String? _pending;

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
      _pending = null;
    });
    try {
      final result = await widget.api.checkout(phone: _phone.text.trim(), network: _network);
      if (!mounted) return;
      if (result.subscription != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.primaryDark,
            content: Text('Payment successful — 100 tokens added'),
          ),
        );
        Navigator.of(context).pop(true);
      } else {
        setState(() => _pending =
            'Approve the prompt on your phone to complete payment. This will activate once confirmed.');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscribe'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: AppColors.brandGradient,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Commuter Monthly',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('100 tokens · 30 days of reliable commutes',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.9))),
                const SizedBox(height: 14),
                const Text('GHS $kPlanPriceGhs',
                    style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Pay with mobile money',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: _networks
                .map((n) => ChoiceChip(
                      label: Text(n.label),
                      selected: _network == n.id,
                      onSelected: (_) => setState(() => _network = n.id),
                      selectedColor: AppColors.primary.withValues(alpha: 0.18),
                    ))
                .toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Mobile money number',
              hintText: '0244 123 456',
              prefixIcon: Icon(Icons.smartphone),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
          ],
          if (_pending != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(_pending!, style: const TextStyle(color: Color(0xFF9A6B2E))),
            ),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _busy ? null : _pay,
            child: _busy
                ? const SizedBox(
                    height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                : const Text('Pay GHS $kPlanPriceGhs'),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text('Secured mobile-money payment',
                style: TextStyle(color: AppColors.ink.withValues(alpha: 0.45), fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
