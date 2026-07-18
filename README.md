# YouTube Quarter Video Extractor

A clean, client-side tool that lists every video a YouTube channel published in a given year and quarter — then copies the URLs (or feeds them to NotebookLM) in one click.

Built with React, TypeScript, Vite, and Tailwind CSS.

## What it does

- **Resolve any channel** by URL, handle (`@name`), or custom name.
- **Fetch all uploads** from the channel's uploads playlist via the YouTube Data API v3.
- **Filter by year and quarter** (Q1–Q4, or all quarters) using each video's publish date.
- **Copy URLs** to the clipboard as a plain newline-separated list.
- **NotebookLM companion** — one click copies every URL and shows step-by-step instructions for adding them as sources in a NotebookLM notebook.
- **Runs entirely in the browser** — your API key is stored in `localStorage` and never sent anywhere except YouTube's API.

## Getting started

### Prerequisites

- Node.js 18+ and npm

### Install and run

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal.

### Build for production

```bash
npm run build
npm run preview
```

## Getting a YouTube Data API v3 key

The app needs a free API key from Google. You can also find these steps in the app itself by expanding **"How to get a YouTube Data API v3 key"** under the API key field.

1. Go to the [Google Cloud Console](https://console.cloud.google.com) and sign in with a Google account.
2. Open **Projects** in the top navigation and click **New Project**. Give it any name, then click **Create**.
3. Once created, open **APIs & Services → Library** in the left sidebar.
4. Search for **"YouTube Data API v3"**, click it, then press **Enable**.
5. Go to **APIs & Services → Credentials** and click **+ Create Credentials → API key**.
6. Copy the generated key (it starts with `AIza`) and paste it into the app's API key field.
7. *(Optional but recommended)* Restrict the key to the YouTube Data API v3 under **Application restrictions** for extra security.

The free tier includes a daily quota of 10,000 units, which is plenty for listing channel videos.

## How it works

1. The app resolves the channel handle/URL to a channel ID (`UC…`).
2. It reads the channel's `uploads` playlist ID from the channels endpoint.
3. It paginates through the playlist items, collecting every video ID and publish date.
4. It filters the results to the selected year and quarter.
5. The filtered URLs can be copied or sent to NotebookLM.

If the API quota is exhausted mid-fetch, the app surfaces the results collected so far and warns you.

## Project structure

```
src/
  App.tsx        # UI, state, and fetch orchestration
  youtube.ts     # YouTube Data API v3 helpers (resolve, fetch, filter)
  index.css      # Tailwind base + component classes
  main.tsx       # React entry point
```

## Tech stack

- **React 18** with hooks
- **TypeScript**
- **Vite** for dev server and builds
- **Tailwind CSS** for styling
- **lucide-react** for icons

## Notes

- No backend or server is involved. Everything runs client-side.
- The API key never leaves your browser except in direct calls to `googleapis.com`.
- Quota errors are handled gracefully — partial results are still shown.
