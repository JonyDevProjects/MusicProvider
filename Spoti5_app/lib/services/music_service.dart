import '../models/track.dart';

class StreamResult {
  final String url;
  final Map<String, String>? headers;
  final int? durationSeconds;

  const StreamResult({
    required this.url,
    this.headers,
    this.durationSeconds,
  });
}

abstract class MusicService {
  Future<List<Track>> searchTracks(String query);
  Future<StreamResult> getStream(String videoId);
}
