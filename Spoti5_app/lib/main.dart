import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:spoti5_app/native/frb_generated.dart';
import 'screens/home_screen.dart';
import 'providers/player_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize the Flutter Rust Bridge for platforms that have the native
  // library bundled (macOS, iOS, Linux). On Android the FRB plugin is not
  // registered yet, so init() throws — catch and continue; the factory will
  // fall back to YtExplodeService (pure Dart) automatically.
  try {
    await RustLib.init();
    debugPrint('RustLib initialized successfully');
  } catch (e) {
    debugPrint('RustLib init skipped: $e');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => PlayerProvider()),
      ],
      child: const Spoti5App(),
    ),
  );
}

class Spoti5App extends StatelessWidget {
  const Spoti5App({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Spoti5',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.green,
          brightness: Brightness.dark,
        ),
      ),
      home: const HomeScreen(),
    );
  }
}
