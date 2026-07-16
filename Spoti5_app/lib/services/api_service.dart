import 'dart:convert';
import 'dart:io' if (dart.library.html) 'stub_io.dart';
import 'package:http/http.dart' as http;
import '../models/track.dart';

class ApiService {
  // En emulador de Android usa 10.0.2.2. En iOS, Web o Desktop usa localhost.
  static String get baseUrl {
    if (Platform.isAndroid) return 'http://10.0.2.2:3000/api';
    return 'http://localhost:3000/api';
  }

  Future<List<Track>> searchTracks(String query) async {
    final response = await http.get(Uri.parse('$baseUrl/search?q=$query'));
    
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Track.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load search results');
    }
  }

  Future<String> getStreamUrl(String videoId) async {
    final response = await http.get(Uri.parse('$baseUrl/info?url=$videoId'));
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['streamUrl'] as String;
    } else {
      throw Exception('Failed to load stream URL');
    }
  }
}
