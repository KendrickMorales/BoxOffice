# BoxOffice 🎬

A local network webapp for searching and downloading movie torrents. Accessible to anyone on your home network.

## Features

- 🔍 Search for movies across multiple torrent sites (ThePirateBay, 1337x, YTS, and more)
- 🎬 **Movie posters and descriptions** - See what you're downloading with beautiful movie cards
- 📥 Download selected movies to a specified location on your computer
- 🌐 Accessible from any device on your local network (phones, tablets, laptops)
- 📊 Real-time download progress tracking
- ✅ Select multiple movies and download them at once
- ⭐ Movie ratings and release years from TMDB

## Quick Start

**IMPORTANT**: The app doesn't show movies by default - you need to **search** for them!

### Step 1: Install & Build (First Time Only)

```bash
# Install backend dependencies
npm install

# Install and build frontend
cd frontend && npm install && npm run build && cd ..
```

### Step 2: Start the Server

```bash
npm start
```

You should see:

```
🚀 BoxOffice server running at http://localhost:3000
✅ Enabled X torrent providers
```

### Step 3: Open the Webapp

- **On your computer**: `http://localhost:3000`
- **On other devices**: `http://YOUR_IP:3000` (find IP with `ifconfig` or `ipconfig`)

### Step 4: Search for Movies

1. Type a movie name in the search box (e.g., "The Matrix")
2. Click "Search"
3. Wait a few seconds for results
4. Click "Download" on any movie you want

**See `QUICKSTART.md` for more detailed instructions.**

## Accessing the Webapp

1. **Find your computer's IP address:**

   - **Mac/Linux**: Run `ifconfig` or `ip addr` and look for your local IP (usually starts with 192.168.x.x or 10.x.x.x)
   - **Windows**: Run `ipconfig` and look for "IPv4 Address"

2. **Access from any device on your network:**

   - Open a browser and go to: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

3. **Access from the computer running the server:**
   - Go to: `http://localhost:3000`

## Configuration

Create a `.env` file in the root directory (optional):

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Download Configuration
DOWNLOAD_PATH=./downloads

# Optional: Prowlarr Configuration (if you want to use Prowlarr API)
PROWLARR_URL=http://localhost:9696
PROWLARR_API_KEY=your_api_key_here

# Optional: qBittorrent Configuration (if you want to use qBittorrent)
QBITTORRENT_URL=http://localhost:8080
QBITTORRENT_USERNAME=admin
QBITTORRENT_PASSWORD=adminadmin
```

### Configuration Options

- **PORT**: Server port (default: 3000)
- **HOST**: Set to `0.0.0.0` to allow network access (default: 0.0.0.0)
- **DOWNLOAD_PATH**: Where downloaded movies will be saved (default: ./downloads)
- **TMDB_API_KEY**: (Optional) Get a free API key from [TMDB](https://www.themoviedb.org/settings/api) for better movie metadata. Works without it, but may have rate limits.

## How It Works

1. **Search**: Enter a movie name and search across multiple torrent sites
2. **Browse**: View results with file sizes, seed counts, and providers
3. **Select**: Choose one or multiple movies to download
4. **Download**: Movies are downloaded directly to your specified folder
5. **Track**: Monitor download progress in real-time

## ⚠️ About Prowlarr (Highly Recommended!)

The `torrent-search-api` library included with BoxOffice is **unreliable** - many torrent sites have changed or are blocked, resulting in no search results.

**Prowlarr is the recommended solution** for reliable movie searches. It's actively maintained and supports 500+ torrent trackers.

### Quick Prowlarr Setup:

1. Install Prowlarr from https://prowlarr.com/
2. Get your API key from Prowlarr Settings → General
3. Create `.env` file:
   ```env
   PROWLARR_URL=http://localhost:9696
   PROWLARR_API_KEY=your_api_key_here
   ```
4. Add indexers in Prowlarr (ThePirateBay, 1337x, etc.)
5. Restart BoxOffice

**See `PROWLARR_SETUP.md` for detailed instructions.**

## Troubleshooting

### Can't access from other devices?

- Make sure your firewall allows connections on port 3000
- Verify you're using the correct IP address
- Ensure all devices are on the same network

### Downloads not working?

- Check that the download path exists and is writable
- Ensure you have enough disk space
- Check the server console for error messages

### Search not returning results?

- Some torrent sites may be blocked in your region
- Try different search terms
- Check your internet connection

## Development

To run in development mode with hot reload:

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend && npm start
```

## License

MIT
