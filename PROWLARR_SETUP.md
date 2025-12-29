# Prowlarr Setup Guide (Recommended)

The `torrent-search-api` library is unreliable because many torrent sites have changed or are blocked. **Prowlarr is the recommended solution** for reliable movie searches.

## Why Prowlarr?

- ✅ Much more reliable - actively maintained
- ✅ Supports 500+ torrent trackers
- ✅ Handles site changes automatically
- ✅ Better search results
- ✅ Easy to add/remove indexers

## Step-by-Step Setup

### 1. Install Prowlarr

**macOS:**

```bash
# Using Homebrew
brew install prowlarr

# Or download from: https://prowlarr.com/
```

**Windows:**

- Download installer from: https://prowlarr.com/
- Run the installer

**Linux:**

```bash
# See installation guide at: https://wiki.servarr.com/prowlarr/installation
```

### 2. Start Prowlarr

Prowlarr usually runs on `http://localhost:9696`

Open it in your browser and complete the initial setup wizard.

### 3. Get Your API Key

1. In Prowlarr, go to **Settings** → **General**
2. Scroll down to find **API Key**
3. Copy the API key (it's a long string of letters and numbers)

### 4. Add Indexers

1. In Prowlarr, click **Add Indexer**
2. Search for and add popular indexers:

   - **ThePirateBay**
   - **1337x**
   - **Rarbg**
   - **YTS**
   - **TorrentGalaxy**
   - And any others you prefer

3. Click **Test** on each indexer to make sure it works
4. Click **Save**

### 5. Configure BoxOffice

1. In the BoxOffice directory, create a `.env` file:

   ```bash
   touch .env
   ```

2. Add these lines to `.env`:

   ```env
   PROWLARR_URL=http://localhost:9696
   PROWLARR_API_KEY=paste_your_api_key_here
   ```

3. Replace `paste_your_api_key_here` with the API key you copied from Prowlarr

### 6. Restart BoxOffice

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

### 7. Test It!

1. Open BoxOffice in your browser
2. Search for a movie (e.g., "Titanic")
3. You should now see results! 🎉

## Troubleshooting

### "Prowlarr search failed"

- Make sure Prowlarr is running (`http://localhost:9696`)
- Check that the API key in `.env` is correct
- Verify Prowlarr URL is correct (default is `http://localhost:9696`)

### "No results found" even with Prowlarr

- Make sure you've added indexers in Prowlarr
- Test the indexers in Prowlarr (click "Test" button)
- Check Prowlarr logs for errors

### Prowlarr on a different computer

If Prowlarr is running on a different computer on your network:

```env
PROWLARR_URL=http://192.168.1.100:9696
PROWLARR_API_KEY=your_api_key
```

(Replace with the actual IP address of the computer running Prowlarr)

## That's It!

Once configured, BoxOffice will automatically use Prowlarr for all searches, giving you much better and more reliable results!


