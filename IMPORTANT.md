# ⚠️ IMPORTANT: Setup Required

## The App Works, But You Need To:

1. **Start the server first:**
   ```bash
   npm start
   ```

2. **Then search for movies** - The app doesn't show movies by default. You need to:
   - Open the webapp in your browser
   - Type a movie name (e.g., "The Matrix", "Inception")
   - Click "Search"
   - Wait a few seconds for results

## If You're Not Getting Results:

The `torrent-search-api` library may have issues with some torrent sites being blocked or changed. 

### Option 1: Use Prowlarr (Recommended)

Prowlarr is much more reliable! Here's how to set it up:

1. **Install Prowlarr:**
   - Download from: https://prowlarr.com/
   - Install and start it (usually runs on port 9696)

2. **Configure BoxOffice to use Prowlarr:**
   - Create a `.env` file in the BoxOffice directory:
     ```env
     PROWLARR_URL=http://localhost:9696
     PROWLARR_API_KEY=your_api_key_here
     ```
   - Get your API key from Prowlarr: Settings → General → API Key

3. **Add indexers in Prowlarr:**
   - Go to Prowlarr web interface
   - Click "Add Indexer"
   - Add popular torrent indexers (ThePirateBay, 1337x, etc.)

4. **Restart BoxOffice:**
   ```bash
   npm start
   ```

Now BoxOffice will use Prowlarr for searches, which is much more reliable!

### Option 2: Check Your Connection

- Make sure you have internet access
- Some torrent sites may be blocked in your region (use a VPN if needed)
- Try different search terms

## Quick Test

Run this to test if search is working:
```bash
node test-search.js
```

If you see "✅ Enabled X torrent providers" but still get 0 results, consider using Prowlarr (Option 1 above).

