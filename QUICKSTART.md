# Quick Start Guide

## Step 1: Start the Server

Open a terminal in the BoxOffice directory and run:

```bash
npm start
```

You should see:
```
🚀 BoxOffice server running at http://localhost:3000
📡 Accessible on your network at http://YOUR_IP:3000
📥 Downloads will be saved to: /path/to/downloads
✅ Enabled X torrent providers
```

## Step 2: Open the Webapp

1. **On your computer**: Open your browser and go to `http://localhost:3000`
2. **On other devices**: Go to `http://YOUR_COMPUTER_IP:3000`
   - Find your IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)

## Step 3: Search for a Movie

1. **Type a movie name** in the search box (e.g., "The Matrix", "Inception", "Avatar")
2. **Click "Search"**
3. **Wait a few seconds** - it searches multiple torrent sites
4. **Results will appear** below the search box

## Step 4: Download

1. **Select movies** by checking the boxes, OR
2. **Click "Download"** on individual movies
3. **Watch progress** in the "Active Downloads" section

## Troubleshooting

### "No results found"
- ✅ Make sure the server is running (check terminal)
- ✅ Try a different movie name
- ✅ Check your internet connection
- ✅ Some torrent sites may be blocked in your region

### "Search failed" or "Connection refused"
- ✅ Make sure the server is running: `npm start`
- ✅ Check that port 3000 is not in use
- ✅ Check the server terminal for error messages

### Can't access from other devices
- ✅ Find your computer's IP address
- ✅ Make sure devices are on the same WiFi network
- ✅ Check firewall settings (may need to allow port 3000)

## Need Help?

Check the main `README.md` file for more detailed information.



