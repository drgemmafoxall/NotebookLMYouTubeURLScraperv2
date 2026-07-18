const BASE = 'https://www.googleapis.com/youtube/v3';

export interface VideoItem {
  videoId: string;
  publishedAt: string;
  url: string;
}

export type FetchProgress = {
  page: number;
  total: number;
};

function getQuarterRange(quarter: string): { monthStart: number; monthEnd: number } | null {
  switch (quarter) {
    case 'Q1': return { monthStart: 1, monthEnd: 3 };
    case 'Q2': return { monthStart: 4, monthEnd: 6 };
    case 'Q3': return { monthStart: 7, monthEnd: 9 };
    case 'Q4': return { monthStart: 10, monthEnd: 12 };
    default: return null;
  }
}

function buildDateRange(year: number, quarter: string): { after: string; before: string } | null {
  const range = getQuarterRange(quarter);
  if (!range) return null;
  const after = new Date(year, range.monthStart - 1, 1).toISOString();
  const lastDay = new Date(year, range.monthEnd, 0);
  lastDay.setHours(23, 59, 59, 999);
  const before = lastDay.toISOString();
  return { after, before };
}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    let message = `YouTube API error (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function resolveChannelId(input: string, apiKey: string): Promise<string> {
  const cleaned = input.trim().replace(/^https?:\/\/(www\.)?youtube\.com\//, '').replace(/\/$/, '');

  // Direct channel ID (UCxxxxxxxx)
  if (/^UC[\w-]{22}$/.test(cleaned)) return cleaned;

  // Handle format: @handle or handle
  const handle = cleaned.startsWith('@') ? cleaned : `@${cleaned.replace(/^@/, '')}`;

  const data = await apiGet<{ items?: Array<{ id: string }> }>('/channels', {
    part: 'id',
    forHandle: handle,
    key: apiKey,
    maxResults: '1',
  });

  if (data.items && data.items.length > 0) return data.items[0].id;

  // Fallback: try as custom URL / search
  const searchData = await apiGet<{ items?: Array<{ snippet: { channelId: string } }> }>('/search', {
    part: 'snippet',
    q: cleaned,
    type: 'channel',
    key: apiKey,
    maxResults: '1',
  });

  if (searchData.items && searchData.items.length > 0) {
    return searchData.items[0].snippet.channelId;
  }

  throw new Error('Could not find a channel matching that URL or handle.');
}

export async function getUploadsPlaylistId(channelId: string, apiKey: string): Promise<string> {
  const data = await apiGet<{ items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }> }>('/channels', {
    part: 'contentDetails',
    id: channelId,
    key: apiKey,
  });

  const uploads = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error('Could not retrieve the uploads playlist for this channel.');
  return uploads;
}

export async function fetchAllVideoItems(
  playlistId: string,
  apiKey: string,
  onProgress: (p: FetchProgress) => void
): Promise<VideoItem[]> {
  const items: VideoItem[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    page++;
    onProgress({ page, total: items.length });

    const params: Record<string, string> = {
      part: 'snippet',
      playlistId,
      maxResults: '50',
      key: apiKey,
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await apiGet<{
      nextPageToken?: string;
      items?: Array<{ snippet: { resourceId: { videoId: string }; publishedAt: string } }>;
    }>('/playlistItems', params);

    for (const item of data.items ?? []) {
      const videoId = item.snippet.resourceId.videoId;
      items.push({
        videoId,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

export function filterByYearQuarter(items: VideoItem[], year: number, quarter: string): VideoItem[] {
  return items.filter((item) => {
    const date = new Date(item.publishedAt);
    if (date.getFullYear() !== year) return false;
    const range = getQuarterRange(quarter);
    if (!range) return true; // "All Quarters" — year only
    const month = date.getMonth() + 1;
    return month >= range.monthStart && month <= range.monthEnd;
  });
}

export { buildDateRange };
