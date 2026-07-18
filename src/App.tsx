import { useState, useCallback, useRef } from 'react';
import {
  Youtube,
  Key,
  Eye,
  EyeOff,
  Search,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  BookOpen,
  Code,
} from 'lucide-react';
import {
  resolveChannelId,
  getUploadsPlaylistId,
  fetchAllVideoItems,
  filterByYearQuarter,
  type VideoItem,
  type FetchProgress,
} from './youtube';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => CURRENT_YEAR - i);

const QUARTERS = [
  { value: 'ALL', label: 'All quarters' },
  { value: 'Q1', label: 'Q1 (Jan – Mar)' },
  { value: 'Q2', label: 'Q2 (Apr – Jun)' },
  { value: 'Q3', label: 'Q3 (Jul – Sep)' },
  { value: 'Q4', label: 'Q4 (Oct – Dec)' },
];

const API_KEY_STORAGE_KEY = 'yt_extractor_api_key';

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE_KEY) ?? '');
  const [showKey, setShowKey] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [quarter, setQuarter] = useState('ALL');

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [results, setResults] = useState<VideoItem[] | null>(null);
  const [partial, setPartial] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const notebookCopiedRef = useRef(false);
  const [notebookCopiedState, setNotebookCopiedState] = useState(false);
  const [keyHelpOpen, setKeyHelpOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [apiCopied, setApiCopied] = useState(false);

  const API_ENDPOINT = 'https://jbwndnzbcaodebzfnmed.supabase.co/functions/v1/extract-youtube-urls';

  const handleApiCopy = useCallback(async () => {
    const example = `${API_ENDPOINT}?channel=@sabrina_ramonov&year=2024&quarter=Q3&key=YOUR_API_KEY`;
    await navigator.clipboard.writeText(example);
    setApiCopied(true);
    setTimeout(() => setApiCopied(false), 2000);
  }, []);

  const handleApiKeyChange = useCallback((val: string) => {
    setApiKey(val);
    if (val) localStorage.setItem(API_KEY_STORAGE_KEY, val);
    else localStorage.removeItem(API_KEY_STORAGE_KEY);
  }, []);

  const handleFetch = useCallback(async () => {
    if (!apiKey.trim()) { setError('Please enter your YouTube API key.'); return; }
    if (!channelInput.trim()) { setError('Please enter a channel URL or handle.'); return; }

    setLoading(true);
    setError(null);
    setResults(null);
    setPartial(false);
    setProgress(null);

    try {
      const channelId = await resolveChannelId(channelInput, apiKey);
      const uploadsId = await getUploadsPlaylistId(channelId, apiKey);

      let allItems: VideoItem[] = [];
      let hitQuota = false;

      try {
        allItems = await fetchAllVideoItems(uploadsId, apiKey, (p) => setProgress(p));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('quota') || msg.includes('403')) {
          hitQuota = true;
        } else {
          throw err;
        }
      }

      const filtered = filterByYearQuarter(allItems, year, quarter);
      setResults(filtered);
      setPartial(hitQuota);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [apiKey, channelInput, year, quarter]);

  const urlText = results?.map((v) => v.url).join('\n') ?? '';

  const handleCopy = useCallback(async () => {
    if (!urlText) return;
    await navigator.clipboard.writeText(urlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [urlText]);

  const handleNotebookCopy = useCallback(async () => {
    if (!urlText) return;
    await navigator.clipboard.writeText(urlText);
    notebookCopiedRef.current = true;
    setNotebookCopiedState(true);
    setTimeout(() => { notebookCopiedRef.current = false; setNotebookCopiedState(false); }, 2000);
  }, [urlText]);

  const hasResults = results !== null;
  const hasUrls = hasResults && results.length > 0;

  return (
    <div className="min-h-screen bg-cream font-inter">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sage/10 mb-5">
            <Youtube className="w-7 h-7 text-sage" />
          </div>
          <h1 className="font-nunito font-bold text-3xl text-charcoal mb-3 leading-tight">
            YouTube URL extractor
          </h1>
          <p className="text-slate-body text-base leading-relaxed max-w-md mx-auto">
            Retrieve a clean list of video URLs from any YouTube channel, filtered by your chosen year and quarter.
          </p>
        </header>

        {/* API Key Section */}
        <div className="card p-6 mb-5">
          <label className="block font-nunito font-semibold text-charcoal text-sm mb-2">
            Your YouTube Data API v3 key
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-light">
              <Key className="w-4 h-4" />
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="AIzaSy..."
              className="input-field pl-10 pr-12"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-light hover:text-slate-body transition-colors"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {apiKey && (
            <button
              type="button"
              onClick={() => handleApiKeyChange('')}
              className="mt-2 text-xs text-slate-light hover:text-slate-body transition-colors"
            >
              Clear saved key
            </button>
          )}
          <div className="mt-4 flex gap-3 p-3 rounded-xl bg-sage/5 border border-sage/20">
            <Info className="w-4 h-4 text-sage shrink-0 mt-0.5" />
            <p className="text-xs text-slate-light leading-relaxed">
              Your API key is saved in your browser's local storage and processed entirely client-side. It is never sent to any server beyond YouTube's own API.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setKeyHelpOpen((v) => !v)}
            className="mt-4 flex items-center gap-2 text-xs text-slate-light hover:text-slate-body transition-colors w-full text-left"
          >
            {keyHelpOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            How to get a YouTube Data API v3 key
          </button>

          {keyHelpOpen && (
            <ol className="mt-3 space-y-2 text-xs text-slate-light leading-relaxed pl-1 animate-fade-in">
              <li className="flex gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">1</span>
                Go to the <strong className="text-slate-body">Google Cloud Console</strong> at console.cloud.google.com and sign in with any Google account.
              </li>
              <li className="flex gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">2</span>
                From the top navigation, open <strong className="text-slate-body">Projects</strong> and click <strong className="text-slate-body">"New Project"</strong>. Give it any name, then click <strong className="text-slate-body">"Create"</strong>.
              </li>
              <li className="flex gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">3</span>
                Once the project is created, open <strong className="text-slate-body">APIs &amp; Services → Library</strong> in the left sidebar.
              </li>
              <li className="flex gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">4</span>
                Search for <strong className="text-slate-body">"YouTube Data API v3"</strong>, click it, then press <strong className="text-slate-body">"Enable"</strong>.
              </li>
              <li className="flex gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">5</span>
                Go to <strong className="text-slate-body">APIs &amp; Services → Credentials</strong> and click <strong className="text-slate-body">"+ Create Credentials" → "API key"</strong>.
              </li>
              <li className="flex gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">6</span>
                Copy the generated key (it starts with <strong className="text-slate-body">AIza</strong>) and paste it into the field above.
              </li>
              <li className="flex gap-2 items-start">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">7</span>
                <span className="flex-1">
                  For extra security, restrict the key to <strong className="text-slate-body">YouTube Data API v3</strong> under <strong className="text-slate-body">Application restrictions</strong>. This is optional but recommended. You get a free daily quota of 10,000 units — plenty for listing channel videos.
                </span>
              </li>
            </ol>
          )}
        </div>

        {/* Search Controls */}
        <div className="card card-hover p-6 mb-5">
          <div className="mb-5">
            <label className="block font-nunito font-semibold text-charcoal text-sm mb-2">
              Channel URL or handle
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-light">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="@sabrina_ramonov or youtube.com/@channel"
                className="input-field pl-10"
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleFetch()}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block font-nunito font-semibold text-charcoal text-sm mb-2">
                Year
              </label>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="select-field pr-10"
                  disabled={loading}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-light pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block font-nunito font-semibold text-charcoal text-sm mb-2">
                Quarter
              </label>
              <div className="relative">
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="select-field pr-10"
                  disabled={loading}
                >
                  {QUARTERS.map((q) => (
                    <option key={q.value} value={q.value}>{q.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-light pointer-events-none" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFetch}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress
                  ? `Gathering channel data… (page ${progress.page}, ${progress.total} videos so far)`
                  : 'Gathering channel data…'}
              </>
            ) : (
              <>
                <Youtube className="w-4 h-4" />
                Fetch URLs
              </>
            )}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="animate-fade-in flex gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 mb-5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-600">Something didn't work</p>
              <p className="text-sm text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Partial quota warning */}
        {partial && hasResults && (
          <div className="animate-fade-in flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100 mb-5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-600">
              Your API quota was reached mid-fetch. The results below are partial — they represent videos retrieved before the quota limit was hit.
            </p>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="card p-6 mb-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="font-nunito font-bold text-charcoal text-lg">
                  {hasUrls
                    ? `${results.length} video${results.length === 1 ? '' : 's'} found`
                    : 'No videos found'}
                </h2>
                {hasUrls && (
                  <p className="text-xs text-slate-light mt-0.5">
                    {year}
                    {quarter !== 'ALL'
                      ? ` · ${QUARTERS.find((q) => q.value === quarter)?.label}`
                      : ' · all quarters'}
                  </p>
                )}
              </div>
              {hasUrls && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-secondary shrink-0"
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy all URLs</>
                  )}
                </button>
              )}
            </div>

            {hasUrls ? (
              <textarea
                readOnly
                value={urlText}
                rows={Math.min(results.length, 12)}
                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-slate-body font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-sage/40"
              />
            ) : (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 mb-3">
                  <Youtube className="w-6 h-6 text-slate-light" />
                </div>
                <p className="text-slate-body text-sm font-medium">No videos in this timeframe</p>
                <p className="text-slate-light text-xs mt-1">
                  Try adjusting the year or quarter, or selecting "All quarters".
                </p>
              </div>
            )}
          </div>
        )}

        {/* NotebookLM Companion */}
        {hasUrls && (
          <div className="card p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-sage/10">
                <BookOpen className="w-4 h-4 text-sage" />
              </div>
              <h2 className="font-nunito font-bold text-charcoal text-base">
                Add to NotebookLM
              </h2>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <a
                href="https://notebooklm.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm px-6 py-2.5"
              >
                <ExternalLink className="w-4 h-4" />
                Open NotebookLM
              </a>
              <button
                type="button"
                onClick={handleNotebookCopy}
                className="btn-secondary text-sm"
              >
                {notebookCopiedState ? (
                  <><Check className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy URLs for NotebookLM</>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setNotebookOpen((v) => !v)}
              className="flex items-center gap-2 text-xs text-slate-light hover:text-slate-body transition-colors w-full text-left"
            >
              {notebookOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              How to add these URLs to a NotebookLM notebook
            </button>

            {notebookOpen && (
              <ol className="mt-3 space-y-2 text-xs text-slate-light leading-relaxed pl-1 animate-fade-in">
                <li className="flex gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">1</span>
                  Click <strong className="text-slate-body">"Open NotebookLM"</strong> above to open the site in a new tab.
                </li>
                <li className="flex gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">2</span>
                  Create a new notebook or open an existing one.
                </li>
                <li className="flex gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">3</span>
                  Click <strong className="text-slate-body">"Add source"</strong>, then choose <strong className="text-slate-body">"Website"</strong>.
                </li>
                <li className="flex gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sage/15 text-sage font-bold shrink-0 mt-0.5 text-[10px]">4</span>
                  Paste one URL at a time. NotebookLM processes each video's transcript as a source. Repeat for each URL you need.
                </li>
              </ol>
            )}
          </div>
        )}

        {/* Developer API */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setApiOpen((v) => !v)}
            className="flex items-center gap-2 text-xs text-slate-light hover:text-slate-body transition-colors w-full justify-center"
          >
            <Code className="w-3.5 h-3.5" />
            {apiOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Developer API
          </button>

          {apiOpen && (
            <div className="card p-6 mt-4 animate-fade-in">
              <h2 className="font-nunito font-bold text-charcoal text-base mb-3">
                REST API endpoint
              </h2>
              <p className="text-xs text-slate-light leading-relaxed mb-4">
                This app is also available as a GET API. Pass your own YouTube Data API v3 key via the <code className="text-slate-body bg-gray-50 px-1.5 py-0.5 rounded">key</code> parameter. Returns JSON with video URLs, ready for automation tools like n8n, Zapier, or Claude.
              </p>

              <div className="mb-4">
                <label className="block font-nunito font-semibold text-charcoal text-xs mb-2">
                  Endpoint URL
                </label>
                <code className="block w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-slate-body font-mono text-xs break-all">
                  {API_ENDPOINT}
                </code>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-nunito font-semibold text-charcoal text-xs">
                    Example request
                  </label>
                  <button
                    type="button"
                    onClick={handleApiCopy}
                    className="flex items-center gap-1.5 text-xs text-sage hover:text-sage/80 transition-colors"
                  >
                    {apiCopied ? (
                      <><Check className="w-3 h-3" /> Copied!</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
                <code className="block w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-slate-body font-mono text-xs break-all">
                  {API_ENDPOINT}?channel=@sabrina_ramonov&amp;year=2024&amp;quarter=Q3&amp;key=YOUR_API_KEY
                </code>
              </div>

              <div className="mb-4">
                <label className="block font-nunito font-semibold text-charcoal text-xs mb-2">
                  Parameters
                </label>
                <ul className="space-y-1.5 text-xs text-slate-light leading-relaxed">
                  <li><code className="text-slate-body bg-gray-50 px-1.5 py-0.5 rounded">channel</code> — YouTube channel URL or handle (required)</li>
                  <li><code className="text-slate-body bg-gray-50 px-1.5 py-0.5 rounded">key</code> — Your YouTube Data API v3 key (required)</li>
                  <li><code className="text-slate-body bg-gray-50 px-1.5 py-0.5 rounded">year</code> — Four-digit year, e.g. 2024 (required)</li>
                  <li><code className="text-slate-body bg-gray-50 px-1.5 py-0.5 rounded">quarter</code> — Q1, Q2, Q3, Q4, or ALL (optional, defaults to ALL)</li>
                </ul>
              </div>

              <div>
                <label className="block font-nunito font-semibold text-charcoal text-xs mb-2">
                  Example response
                </label>
                <pre className="block w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-slate-body font-mono text-xs overflow-x-auto leading-relaxed">{`{
  "ok": true,
  "channel": { "id": "UC...", "title": "..." },
  "year": 2024,
  "quarter": "Q3",
  "count": 12,
  "partial": false,
  "videos": [
    {
      "videoId": "abc123",
      "publishedAt": "2024-07-15T...",
      "url": "https://www.youtube.com/watch?v=abc123"
    }
  ]
}`}</pre>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
