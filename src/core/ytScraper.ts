import type { HttpLike, SearchResult } from './types.js';

export function parseDuration(text: string): number {
  if (!text) return 0;
  const parts = text.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export function parseYoutubeSearchHtml(html: string, limit: number = 10): SearchResult[] {
  // Try multiple regex patterns to support different YouTube HTML layouts & minifications
  let jsonStr: string | null = null;

  const patterns = [
    /var ytInitialData = (\{.+?\});<\/script>/,
    /ytInitialData\s*=\s*(\{.+?\});\s*(?:var|<\/script>)/,
    /window\["ytInitialData"\]\s*=\s*(\{.+?\});/,
    /ytInitialData\s*=\s*(\{.+?\});/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        JSON.parse(match[1]); // Validate JSON integrity
        jsonStr = match[1];
        break;
      } catch {
        // Continue to next pattern if parsing failed
      }
    }
  }

  if (!jsonStr) {
    throw new Error('No ytInitialData found in HTML');
  }

  const json = JSON.parse(jsonStr);
  const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
  if (!contents) {
    throw new Error('Invalid ytInitialData structure');
  }

  let videos: any[] = [];
  for (const section of contents) {
    if (section.itemSectionRenderer?.contents) {
      const found = section.itemSectionRenderer.contents
        .filter((c: any) => c.videoRenderer)
        .map((c: any) => c.videoRenderer);
      videos = videos.concat(found);
    }
  }

  return videos.slice(0, limit).map(v => {
    const thumbs = v.thumbnail?.thumbnails || [];
    const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : null;
    const durationStr = v.lengthText?.simpleText || '';
    return {
      id: v.videoId,
      title: v.title?.runs?.[0]?.text || 'Unknown',
      duration: parseDuration(durationStr),
      thumbnail,
      channel: v.ownerText?.runs?.[0]?.text || 'Unknown'
    };
  });
}

export async function scrapeYoutube(
  http: HttpLike,
  query: string,
  limit: number = 10,
  fallbackFn?: (query: string, limit: number) => Promise<SearchResult[]>
): Promise<SearchResult[]> {
  try {
    console.log(`[Core:Scraper] Starting YouTube scrape for: "${query}"`);
    const res = await http.fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (res.status !== 200) {
      console.warn(`[Core:Scraper] YouTube returned status ${res.status}`);
    }

    const html = typeof res.body === 'string' ? res.body : '';
    const results = parseYoutubeSearchHtml(html, limit);
    console.log(`[Core:Scraper] Scrape parsed ${results.length} videos`);
    return results;
  } catch (error) {
    console.error(`[Core:Scraper] YouTube scrape failed:`, error);
    if (fallbackFn) {
      console.log(`[Core:Scraper] Using fallback function...`);
      return fallbackFn(query, limit);
    }
    throw error;
  }
}
