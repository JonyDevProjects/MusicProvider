class Track {
  final String id;
  final String title;
  final String? artist;
  final String? thumbnail;
  final int? duration;

  Track({
    required this.id,
    required this.title,
    this.artist,
    this.thumbnail,
    this.duration,
  });

  factory Track.fromJson(Map<String, dynamic> json) {
    return Track(
      id: json['id'] as String,
      title: json['title'] as String,
      artist: json['channel'] as String?,
      thumbnail: json['thumbnail'] as String?,
      duration: json['duration'] as int?,
    );
  }
}
