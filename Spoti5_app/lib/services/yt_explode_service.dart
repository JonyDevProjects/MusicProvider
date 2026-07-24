import 'yt_explode_service_stub.dart'
    if (dart.library.io) 'yt_explode_service_io.dart' as impl;

import 'music_service.dart';

MusicService createYtExplodeService() => impl.YtExplodeService();
