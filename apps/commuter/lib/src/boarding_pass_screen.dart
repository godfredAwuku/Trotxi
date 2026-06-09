import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'api_client.dart';
import 'models.dart';
import 'theme.dart';

/// The rider's boarding pass: route summary + their unique QR code to scan
/// before entering the vehicle, plus an "End ride" action.
class BoardingPassScreen extends StatefulWidget {
  const BoardingPassScreen({
    super.key,
    required this.api,
    required this.passCode,
    required this.trip,
  });

  final ApiClient api;
  final String passCode;
  final Trip trip;

  @override
  State<BoardingPassScreen> createState() => _BoardingPassScreenState();
}

class _BoardingPassScreenState extends State<BoardingPassScreen> {
  bool _ending = false;
  String? _error;

  Future<void> _endRide() async {
    setState(() {
      _ending = true;
      _error = null;
    });
    try {
      await widget.api.completeRide();
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() {
        _error = e.toString();
        _ending = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Boarding pass'),
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
                Text(trip.routeName,
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text('${trip.origin}  →  ${trip.destination}',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.9))),
                if (trip.vehicleLabel != null) ...[
                  const SizedBox(height: 4),
                  Text(trip.vehicleLabel!,
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8EC)),
              ),
              child: Column(
                children: [
                  QrImageView(
                    data: widget.passCode,
                    version: QrVersions.auto,
                    size: 220,
                    eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: AppColors.ink,
                    ),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('Pass ${widget.passCode.substring(0, 8).toUpperCase()}',
                      style: TextStyle(color: AppColors.ink.withValues(alpha: 0.5), fontSize: 12)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Show this QR code to the conductor before you enter the vehicle.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.ink.withValues(alpha: 0.6)),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.danger)),
          ],
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: _ending ? null : _endRide,
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.danger,
              side: const BorderSide(color: AppColors.danger),
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: _ending
                ? const SizedBox(
                    height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2.2))
                : const Text('End ride'),
          ),
        ],
      ),
    );
  }
}
