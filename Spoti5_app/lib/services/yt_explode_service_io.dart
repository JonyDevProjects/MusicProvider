import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import '../models/track.dart';
import 'music_service.dart';

class YtExplodeService implements MusicService {
  final YoutubeExplode _yt = YoutubeExplode();

  @override
  Future<List<Track>> searchTracks(String query) async {
    final searchList = await _yt.search.search(query);
    return searchList.take(10).map((video) => Track(
      id: video.id.value,
      title: video.title,
      artist: video.author,
      thumbnail: video.thumbnails.highResUrl,
      duration: video.duration?.inSeconds,
    )).toList();
  }

  @override
  Future<StreamResult> getStream(String videoId) async {
    final video = await _yt.videos.get(VideoId(videoId));
    final manifest = await _yt.videos.streamsClient.getManifest(VideoId(videoId));
    final audioOnly = manifest.audioOnly.sortByBitrate();
    final streamInfo = audioOnly.last;

    return StreamResult(
      url: streamInfo.url.toString(),
      headers: {'User-Agent': 'Mozilla/5.0'},
      durationSeconds: video.duration?.inSeconds,
    );
  }

  void close() {
    _yt.close();
  }
}
