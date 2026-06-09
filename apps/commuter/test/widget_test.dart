import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trotxi_commuter/main.dart';

void main() {
  testWidgets('app starts on the auth screen', (WidgetTester tester) async {
    await tester.pumpWidget(const TrotxiApp());

    // The unauthenticated entry point is the sign-in screen.
    expect(find.text('Trotxi'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Email'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Password'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Sign in'), findsOneWidget);
  });
}
