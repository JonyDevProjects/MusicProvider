import { describe, it, expect, vi } from 'vitest';
import { parseDuration, parseYoutubeSearchHtml, scrapeYoutube } from '../../src/core/ytScraper.js';
import type { HttpLike } from '../../src/core/types.js';

describe('Core YouTube Scraper', () => {
  describe('parseDuration', () => {
    it('should parse mm:ss format', () => {
      expect(parseDuration('3:45')).toBe(225);
      expect(parseDuration('0:30')).toBe(30);
    });

    it('should parse hh:mm:ss format', () => {
      expect(parseDuration('1:02:30')).toBe(3750);
    });

    it('should return 0 for invalid or empty text', () => {
      expect(parseDuration('')).toBe(0);
      expect(parseDuration('live')).toBe(0);
    });
  });

  describe('parseYoutubeSearchHtml', () => {
    it('should parse valid ytInitialData HTML', () => {
      const mockInitialData = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          videoRenderer: {
                            videoId: 'dQw4w9WgXcQ',
                            title: { runs: [{ text: 'Rick Astley - Never Gonna Give You Up' }] },
                            lengthText: { simpleText: '3:33' },
                            thumbnail: {
                              thumbnails: [
                                { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg' },
                                { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }
                              ]
                            },
                            ownerText: { runs: [{ text: 'RickAstleyVEVO' }] }
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      };

      const html = `<html><head><script>var ytInitialData = ${JSON.stringify(mockInitialData)};</script></head><body></body></html>`;

      const results = parseYoutubeSearchHtml(html, 5);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up',
        duration: 213,
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        channel: 'RickAstleyVEVO'
      });
    });

    it('should throw error if ytInitialData is missing', () => {
      const html = '<html><body>No data here</body></html>';
      expect(() => parseYoutubeSearchHtml(html)).toThrow('No ytInitialData found in HTML');
    });
  });

  describe('scrapeYoutube with HttpLike', () => {
    it('should fetch via HttpLike and parse results', async () => {
      const mockInitialData = {
        contents: {
          twoColumnSearchResultsRenderer: {
            primaryContents: {
              sectionListRenderer: {
                contents: [
                  {
                    itemSectionRenderer: {
                      contents: [
                        {
                          videoRenderer: {
                            videoId: 'abc12345678',
                            title: { runs: [{ text: 'Sample Song' }] },
                            lengthText: { simpleText: '4:00' },
                            thumbnail: { thumbnails: [{ url: 'https://thumb.jpg' }] },
                            ownerText: { runs: [{ text: 'Sample Artist' }] }
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      };

      const html = `var ytInitialData = ${JSON.stringify(mockInitialData)};</script>`;

      const mockHttp: HttpLike = {
        fetch: vi.fn().mockResolvedValue({
          status: 200,
          body: html
        })
      };

      const results = await scrapeYoutube(mockHttp, 'Sample Song', 10);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        'https://www.youtube.com/results?search_query=Sample%20Song',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
            'Accept-Language': 'en-US,en;q=0.9'
          })
        })
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('abc12345678');
      expect(results[0].title).toBe('Sample Song');
    });

    it('should invoke fallbackFn if scraping fails', async () => {
      const mockHttp: HttpLike = {
        fetch: vi.fn().mockRejectedValue(new Error('Network error'))
      };

      const fallbackFn = vi.fn().mockResolvedValue([
        {
          id: 'fallback123',
          title: 'Fallback Song',
          duration: 120,
          thumbnail: null,
          channel: 'Fallback Artist'
        }
      ]);

      const results = await scrapeYoutube(mockHttp, 'Test', 5, fallbackFn);

      expect(fallbackFn).toHaveBeenCalledWith('Test', 5);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('fallback123');
    });
  });
});
