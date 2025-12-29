# Setup Guide

## First Time Setup

1. **Install Node.js** (if not already installed)
   - Download from https://nodejs.org/
   - Requires Node.js 14 or higher

2. **Install dependencies:**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Build the frontend:**
   ```bash
   cd frontend && npm run build && cd ..
   ```

4. **Create downloads folder** (optional, will be created automatically):
   ```bash
   mkdir downloads
   ```

5. **Start the server:**
   ```bash
   npm start
   ```
   
   Or use the startup script:
   ```bash
   ./start.sh
   ```

## Finding Your IP Address

### macOS/Linux
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
or
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

### Windows
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

## Accessing from Other Devices

Once the server is running:

1. Note your computer's IP address (see above)
2. On any device connected to the same WiFi network:
   - Open a web browser
   - Go to: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

## Firewall Configuration

### macOS
1. System Preferences → Security & Privacy → Firewall
2. Click "Firewall Options"
3. Add Node.js to allowed applications, OR
4. Allow incoming connections on port 3000

### Linux
```bash
sudo ufw allow 3000
```

### Windows
1. Windows Defender Firewall → Advanced Settings
2. Inbound Rules → New Rule
3. Port → TCP → 3000
4. Allow the connection

## Optional: Using Prowlarr

If you have Prowlarr installed:

1. Get your Prowlarr API key from Settings → General
2. Create a `.env` file:
   ```env
   PROWLARR_URL=http://localhost:9696
   PROWLARR_API_KEY=your_api_key_here
   ```
3. The app will automatically use Prowlarr for searches if configured

## Optional: Using qBittorrent

If you prefer using qBittorrent for downloads:

1. Enable Web UI in qBittorrent: Tools → Options → Web UI
2. Create a `.env` file:
   ```env
   QBITTORRENT_URL=http://localhost:8080
   QBITTORRENT_USERNAME=admin
   QBITTORRENT_PASSWORD=your_password
   ```
3. Note: This feature requires additional implementation in the code

## Troubleshooting

### Port already in use
Change the port in `.env`:
```env
PORT=3001
```

### Can't access from other devices
- Check firewall settings
- Ensure all devices are on the same network
- Try accessing from the host machine first: `http://localhost:3000`

### Downloads not working
- Check disk space
- Verify download path permissions
- Check server console for errors



