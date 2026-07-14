import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:audio_video_progress_bar/audio_video_progress_bar.dart';
import '../providers/player_provider.dart';

class PlayerBar extends StatelessWidget {
  const PlayerBar({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final playerProvider = context.watch<PlayerProvider>();
    final track = playerProvider.currentTrack;

    if (track == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                // Thumbnail
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: track.thumbnail != null
                      ? Image.network(
                          track.thumbnail!,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                        )
                      : Container(
                          width: 48,
                          height: 48,
                          color: Colors.grey,
                          child: const Icon(Icons.music_note),
                        ),
                ),
                const SizedBox(width: 12),
                // Title & Artist
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        track.title,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (track.artist != null)
                        Text(
                          track.artist!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                // Play/Pause Button
                if (playerProvider.isLoading)
                  const Padding(
                    padding: EdgeInsets.all(12.0),
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                else
                  StreamBuilder<bool>(
                    stream: playerProvider.audioPlayer.playingStream,
                    builder: (context, snapshot) {
                      final playing = snapshot.data ?? false;
                      return IconButton(
                        icon: Icon(playing ? Icons.pause : Icons.play_arrow),
                        iconSize: 32,
                        onPressed: playerProvider.togglePlayPause,
                      );
                    },
                  ),
              ],
            ),
            const SizedBox(height: 8),
            // Progress Bar
            StreamBuilder<Duration>(
              stream: playerProvider.audioPlayer.positionStream,
              builder: (context, positionSnapshot) {
                final position = positionSnapshot.data ?? Duration.zero;
                final duration = playerProvider.audioPlayer.duration ?? Duration.zero;
                
                return ProgressBar(
                  progress: position,
                  total: duration,
                  onSeek: (duration) {
                    playerProvider.audioPlayer.seek(duration);
                  },
                  timeLabelTextStyle: const TextStyle(fontSize: 12),
                  thumbRadius: 6,
                  barHeight: 4,
                  baseBarColor: Colors.black12,
                  progressBarColor: Theme.of(context).colorScheme.primary,
                  thumbColor: Theme.of(context).colorScheme.primary,
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
