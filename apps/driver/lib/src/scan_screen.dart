import 'package:flutter/material.dart';

import 'api_client.dart';
import 'models.dart';
import 'theme.dart';

/// Verify a rider's QR pass. On a physical device this screen hosts a camera
/// scanner (mobile_scanner); here it takes the pass code entered manually and
/// verifies it against POST /pass/verify.
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final _code = TextEditingController();
  bool _verifying = false;
  PassVerification? _result;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _verifying = true;
      _error = null;
      _result = null;
    });
    try {
      _result = await widget.api.verifyPass(_code.text.trim());
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify rider pass'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(Icons.qr_code_2, color: AppColors.primary, size: 36),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    'Enter the code shown under the rider’s QR pass. '
                    '(Camera scanning is enabled on a physical device.)',
                    style: TextStyle(color: AppColors.ink.withValues(alpha: 0.7), fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _code,
            decoration: const InputDecoration(labelText: 'Pass code', prefixIcon: Icon(Icons.qr_code)),
            onSubmitted: (_) => _verifying ? null : _verify(),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _verifying ? null : _verify,
            child: _verifying
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                : const Text('Verify pass'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 20),
            _ResultCard(ok: false, title: 'Invalid pass', lines: [_error!]),
          ],
          if (_result != null) ...[
            const SizedBox(height: 20),
            _ResultCard(
              ok: _result!.valid && _result!.hasActiveRide,
              title: !_result!.valid
                  ? 'Invalid pass'
                  : _result!.hasActiveRide
                      ? 'Valid — let them board'
                      : 'No active ride on this pass',
              lines: [
                if (_result!.riderEmail != null) _result!.riderEmail!,
                if (_result!.routeName != null) 'Route: ${_result!.routeName}',
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.ok, required this.title, required this.lines});
  final bool ok;
  final String title;
  final List<String> lines;

  @override
  Widget build(BuildContext context) {
    final color = ok ? AppColors.good : AppColors.danger;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Icon(ok ? Icons.check_circle : Icons.cancel, color: color, size: 48),
          const SizedBox(height: 10),
          Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: color)),
          for (final line in lines) ...[const SizedBox(height: 4), Text(line, textAlign: TextAlign.center)],
        ],
      ),
    );
  }
}
