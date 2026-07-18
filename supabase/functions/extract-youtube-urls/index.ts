import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BASE = "https://www.googleapis.com/youtube/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VideoItem {
  videoId: string;
  publishedAt: string;
  url: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ ok: false, error: message }, status);
}

function getQuarterRange(quarter: string): { monthStart: number; monthEnd: number } | null {
  switch (quarter) {
    case "Q1": return { monthStart: 1, monthEnd: 3 };
    case "Q2": return { monthStart: 4, monthEnd: 6 };
    case "Q3": return { monthStart: 7, monthEnd: 9 };
    case "Q4": return { monthStart: 10, monthEnd: 12 };
    default: return null;
  }
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
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function resolveChannelId(input: string, apiKey: string): Promise<{ id: string; title: string }> {
  const cleaned = input.trim()
    .replace(/^https?:\/\/(www\.)?youtube\.com\//, "")
    .replace(/\/$/, "");

  if (/^UC[\w-]{22}$/.test(cleaned)) {
    const data = await apiGet<{ items?: Array<{ id: string; snippet: { title: string } }> }>("/channels", {
      part: "id,snippet",
      id: cleaned,
      key: apiKey,
    });
    return {
      id: cleaned,
      title: data.items?.[0]?.snippet?.title ?? cleaned,
    };
  }

  const handle = cleaned.startsWith("@") ? cleaned : `@${cleaned.replace(/^@/, "")}`;

  const data = await apiGet<{ items?: Array<{ id: string; snippet: { title: string } }> }>("/channels", {
    part: "id,snippet",
    forHandle: handle,
    key: apiKey,
    maxResults: "1",
  });

  if (data.items && data.items.length > 0) {
    return { id: data.items[0].id, title: data.items[0].snippet?.title ?? handle };
  }

  const searchData = await apiGet<{ items?: Array<{ snippet: { channelId: string; title: string } }> }>("/search", {
    part: "snippet",
    q: cleaned,
    type: "channel",
    key: apiKey,
    maxResults: "1",
  });

  if (searchData.items && searchData.items.length > 0) {
    return {
      id: searchData.items[0].snippet.channelId,
      title: searchData.items[0].snippet?.title ?? cleaned,
    };
  }

  throw new Error("Could not find a channel matching that URL or handle.");
}

async function getUploadsPlaylistId(channelId: string, apiKey: string): Promise<string> {
  const data = await apiGet<{ items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }> }>("/channels", {
    part: "contentDetails",
    id: channelId,
    key: apiKey,
  });

  const uploads = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("Could not retrieve the uploads playlist for this channel.");
  return uploads;
}

async function fetchAllVideoItems(playlistId: string, apiKey: string): Promise<VideoItem[]> {
  const items: VideoItem[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      part: "snippet",
      playlistId,
      maxResults: "50",
      key: apiKey,
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await apiGet<{
      nextPageToken?: string;
      items?: Array<{ snippet: { resourceId: { videoId: string }; publishedAt: string } }>;
    }>("/playlistItems", params);

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

function filterByYearQuarter(items: VideoItem[], year: number, quarter: string): VideoItem[] {
  return items.filter((item) => {
    const date = new Date(item.publishedAt);
    if (date.getFullYear() !== year) return false;
    const range = getQuarterRange(quarter);
    if (!range) return true;
    const month = date.getMonth() + 1;
    return month >= range.monthStart && month <= range.monthEnd;
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Only GET requests are supported.", 405);
  }

  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");
  const key = url.searchParams.get("key");
  const yearParam = url.searchParams.get("year");
  const quarter = url.searchParams.get("quarter") ?? "ALL";

  if (!channel?.trim()) {
    return errorResponse("Missing required parameter: 'channel' (YouTube channel URL or handle).", 400);
  }
  if (!key?.trim()) {
    return errorResponse("Missing required parameter: 'key' (YouTube Data API v3 key).", 400);
  }
  if (!yearParam) {
    return errorResponse("Missing required parameter: 'year'.", 400);
  }

  const year = parseInt(yearParam, 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return errorResponse("'year' must be a valid number between 2000 and 2100.", 400);
  }

  const validQuarters = ["ALL", "Q1", "Q2", "Q3", "Q4"];
  if (!validQuarters.includes(quarter)) {
    return errorResponse("'quarter' must be one of: ALL, Q1, Q2, Q3, Q4.", 400);
  }

  try {
    const channelInfo = await resolveChannelId(channel, key);
    const uploadsId = await getUploadsPlaylistId(channelInfo.id, key);

    let allItems: VideoItem[] = [];
    let partial = false;

    try {
      allItems = await fetchAllVideoItems(uploadsId, key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("quota") || msg.includes("403")) {
        partial = true;
      } else {
        throw err;
      }
    }

    const filtered = filterByYearQuarter(allItems, year, quarter);

    return jsonResponse({
      ok: true,
      channel: { id: channelInfo.id, title: channelInfo.title },
      year,
      quarter,
      count: filtered.length,
      partial,
      videos: filtered,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong.";
    const status = (err as Error & { status?: number }).status ?? 500;
    return errorResponse(msg, status === 500 ? 500 : 502);
  }
});
