import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trotxi_driver/main.dart';

void main() {
  testWidgets('driver app starts on the sign-in screen', (WidgetTester tester) async {
    await tester.pumpWidget(const DriverApp());

    expect(find.text('Trotxi Driver'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Email'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Sign in'), findsOneWidget);
  });
}
