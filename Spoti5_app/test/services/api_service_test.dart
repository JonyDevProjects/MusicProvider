import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';
import 'package:spoti5_app/services/api_service.dart';

class MockClient extends Mock implements http.Client {}

class FakeUri extends Fake implements Uri {}

void main() {
  setUpAll(() {
    registerFallbackValue(FakeUri());
  });

  group('ApiService', () {
    late MockClient mockClient;
    late ApiService apiService;

    setUp(() {
      mockClient = MockClient();
      ApiService.mockClient = mockClient;
      apiService = ApiService();
    });

    tearDown(() {
      ApiService.mockClient = null;
    });

    test('searchTracks parses response correctly', () async {
      final mockResponse = [
        {
          'id': '123',
          'title': 'Test Track',
          'channel': 'Test Author',
          'thumbnail': 'thumb.jpg',
          'duration': 120,
        }
      ];

      when(() => mockClient.get(any())).thenAnswer(
        (_) async => http.Response(json.encode(mockResponse), 200),
      );

      final tracks = await apiService.searchTracks('test');

      expect(tracks.length, 1);
      expect(tracks.first.id, '123');
      expect(tracks.first.title, 'Test Track');
      expect(tracks.first.artist, 'Test Author');
      expect(tracks.first.thumbnail, 'thumb.jpg');
      expect(tracks.first.duration, 120);
      
      verify(() => mockClient.get(
        any(that: predicate<Uri>((uri) => uri.path.contains('/search') && uri.queryParameters['q'] == 'test'))
      )).called(1);
    });

    test('searchTracks throws exception on failure', () async {
      when(() => mockClient.get(any())).thenAnswer(
        (_) async => http.Response('Error', 500),
      );

      expect(
        () => apiService.searchTracks('test'),
        throwsA(isA<Exception>().having((e) => e.toString(), 'message', contains('Failed to load search results'))),
      );
    });

    test('getStream returns StreamResult and triggers pre-resolve', () async {
      when(() => mockClient.get(any())).thenAnswer(
        (_) async => http.Response('OK', 200),
      );

      final result = await apiService.getStream('123');

      expect(result.url, contains('/audio/stream?videoId=123'));
      
      verify(() => mockClient.get(
        any(that: predicate<Uri>((uri) => uri.path.contains('/audio/resolve') && uri.queryParameters['videoId'] == '123'))
      )).called(1);
    });

    test('warmupCache fires requests for each videoId', () async {
      when(() => mockClient.get(any())).thenAnswer(
        (_) async => http.Response('OK', 200),
      );

      await apiService.warmupCache(['1', '2', '3']);
      
      // Allow async fire-and-forget requests to complete
      await Future.delayed(const Duration(milliseconds: 50));

      verify(() => mockClient.get(any(that: predicate<Uri>((uri) => uri.path.contains('/audio/resolve'))))).called(3);
    });
  });
}
