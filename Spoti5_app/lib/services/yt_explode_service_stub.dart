import '../models/track.dart';
import 'music_service.dart';

class YtExplodeService implements MusicService {
  @override
  Future<List<Track>> searchTracks(String query) {
    throw UnsupportedError('youtube_explode_dart is not available on web');
  }

  @override
  Future<StreamResult> getStream(String videoId) {
    throw UnsupportedError('youtube_explode_dart is not available on web');
  }
}
