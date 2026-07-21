import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/track.dart';
import '../services/api_service.dart';
import '../providers/player_provider.dart';
import '../widgets/player_bar.dart';
import '../native/ytdlp_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ApiService _apiService = ApiService();
  final YtDlpService _ytDlpService = YtDlpService.instance;
  
  List<Track> _searchResults = [];
  bool _isSearching = false;
  String? _error;

  @override
  void initState() {
    super.initState();
  }

  Future<void> _performSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _isSearching = true;
      _error = null;
    });

    try {
      List<Track> results;
      final playerProvider = context.read<PlayerProvider>();
      
      if (playerProvider.useNative && playerProvider.nativeAvailable) {
        try {
          // Try native Rust library first
          final searchResults = await _ytDlpService.search(query);
          results = searchResults.map((sr) => Track(
            id: sr.id,
            title: sr.title,
            artist: sr.channel,
            thumbnail: sr.thumbnail,
            duration: sr.duration?.toInt(),
          )).toList();
        } catch (nativeError) {
          // Fallback to legacy API if native fails
          if (kDebugMode) {
            print('Native search failed, falling back to legacy API: $nativeError');
          }
          results = await _apiService.searchTracks(query);
        }
      } else {
        // Use legacy API service
        results = await _apiService.searchTracks(query);
      }
      
      setState(() {
        _searchResults = results;
      });
    } catch (e) {
      setState(() {
        _error = 'Error searching tracks: $e';
      });
    } finally {
      setState(() {
        _isSearching = false;
      });
    }
  }

  String _formatDuration(int? seconds) {
    if (seconds == null) return '--:--';
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Spoti5'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search songs, artists...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20),
                    ),
                    onSubmitted: (_) => _performSearch(),
                  ),
                ),
                const SizedBox(width: 8),
                Tooltip(
                  message: 'Search Button',
                  child: IconButton(
                    icon: const Icon(Icons.send),
                    color: Theme.of(context).colorScheme.primary,
                    onPressed: _performSearch,
                  ),
                ),
              ],
            ),
          ),
          
          // Error Message
          if (_error != null)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.red),
              ),
            ),

          // Search Results
          Expanded(
            child: _isSearching
                ? const Center(child: CircularProgressIndicator())
                : _searchResults.isEmpty
                    ? const Center(
                        child: Text(
                          'No results. Try searching for a song!',
                          style: TextStyle(color: Colors.grey),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _searchResults.length,
                        itemBuilder: (context, index) {
                          final track = _searchResults[index];
                          return Semantics(
                            label: 'TrackResult-${track.title} (${_formatDuration(track.duration)})',
                            button: true,
                            child: ListTile(
                              leading: ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: track.thumbnail != null
                                    ? Image.network(
                                        track.thumbnail!,
                                        width: 50,
                                        height: 50,
                                        fit: BoxFit.cover,
                                      )
                                    : Container(
                                        width: 50,
                                        height: 50,
                                        color: Colors.grey,
                                        child: const Icon(Icons.music_note),
                                      ),
                              ),
                              title: Text(
                                track.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              subtitle: Text(
                                track.artist ?? 'Unknown Artist',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              trailing: Text(_formatDuration(track.duration)),
                              onTap: () {
                                context.read<PlayerProvider>().playTrack(track);
                              },
                            ),
                          );
                        },
                      ),
          ),

          // Player Bar at the bottom
          const PlayerBar(),
        ],
      ),
    );
  }
}
