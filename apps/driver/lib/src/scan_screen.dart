import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'api_client.dart';
import 'models.dart';
import 'theme.dart';

/// Conductor scans a rider's QR pass (or types the code) and verifies it
/// against POST /pass/verify to confirm a valid active ride before boarding.
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final _manual = TextEditingController();
  final _scanner = MobileScannerController();
  bool _verifying = false;
  bool _handled = false;

  @override
  void dispose() {
    _manual.dispose();
    _scanner.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled || _verifying) return;
    final code = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
    if (code != null && code.isNotEmpty) {
      _handled = true;
      _verify(code);
    }
  }

  Future<void> _verify(String passCode) async {
    setState(() => _verifying = true);
    PassVerification? result;
    String? error;
    try {
      result = await widget.api.verifyPass(passCode.trim());
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
    if (!mounted) return;
    await _showResult(result, error);
    _handled = false; // allow scanning the next rider
  }

  Future<void> _showResult(PassVerification? r, String? error) {
    final ok = r != null && r.valid && r.hasActiveRide;
    final color = error != null || r == null
        ? AppColors.danger
        : (r.hasActiveRide ? AppColors.good : AppColors.accent);
    return showModalBottomSheet(
      context: context,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(ok ? Icons.check_circle : Icons.cancel, color: color, size: 56),
            const SizedBox(height: 12),
            Text(
              error != null || r == null
                  ? 'Invalid pass'
                  : r.hasActiveRide
                      ? 'Valid — let them board'
                      : 'No active ride on this pass',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: color),
            ),
            const SizedBox(height: 8),
            if (r?.riderEmail != null) Text(r!.riderEmail!),
            if (r?.routeName != null) Text('Route: ${r!.routeName}'),
            if (error != null) Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Scan next')),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan rider pass'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          SizedBox(
            height: 320,
            child: Stack(
              fit: StackFit.expand,
              children: [
                MobileScanner(controller: _scanner, onDetect: _onDetect),
                if (_verifying) Container(color: Colors.black54, child: const Center(child: CircularProgressIndicator(color: Colors.white))),
                IgnorePointer(
                  child: Center(
                    child: Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white, width: 3),
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Point the camera at the rider’s QR code.',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  Text('No camera (e.g. simulator)? Enter the pass code:',
                      style: TextStyle(color: AppColors.ink.withValues(alpha: 0.6))),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _manual,
                    decoration: const InputDecoration(labelText: 'Pass code', prefixIcon: Icon(Icons.qr_code)),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _verifying ? null : () => _verify(_manual.text),
                    child: const Text('Verify pass'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
