import '../models/track.dart';
import 'music_service.dart';
import 'api_service.dart';
import 'yt_explode_service.dart';

class HybridMusicService implements MusicService {
  final MusicService _apiService = ApiService();
  final MusicService _ytExplodeService = createYtExplodeService();

  @override
  Future<List<Track>> searchTracks(String query) {
    // Opción A: Delegamos la búsqueda pura a la librería Dart local
    // Esto puentea el overhead de invocar `yt-dlp` en el servidor,
    // logrando que los resultados visuales sean instantáneos.
    return _ytExplodeService.searchTracks(query);
  }

  @override
  Future<StreamResult> getStream(String videoId) {
    // Delegamos la extracción de stream al proxy backend.
    // Esto es crítico para evitar bloqueos por rate limits en youtube_explode_dart
    // y beneficiarnos del proxy cache y rotación de firmas de yt-dlp.
    return _apiService.getStream(videoId);
  }

  @override
  Future<void> warmupCache(List<String> videoIds) {
    // Calentamos el caché en el backend (que es quien servirá los streams)
    return _apiService.warmupCache(videoIds);
  }
}
