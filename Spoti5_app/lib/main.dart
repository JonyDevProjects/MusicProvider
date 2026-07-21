import 'package:flutter/material.dart';
import 'package:flutter_rust_bridge/flutter_rust_bridge_for_generated.dart';
import 'package:provider/provider.dart';
import 'screens/home_screen.dart';
import 'providers/player_provider.dart';
import 'native/frb_generated.dart';
import 'native/ytdlp_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Try to initialize Rust library, fall back to legacy API if not available
  bool rustAvailable = false;
  try {
    // On iOS/macOS, the Rust library is statically linked via CocoaPods.
    // Try process-based symbol resolution first (works for statically linked libs),
    // then fall back to default dynamic library loading.
    try {
      await RustLib.init(externalLibrary: ExternalLibrary.process(iKnowHowToUseIt: true));
    } catch (_) {
      await RustLib.init();
    }
    rustAvailable = true;
  } catch (e) {
    debugPrint('Rust library not available, using legacy API: $e');
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
