# qBittorrent Setup Guide

qBittorrent is a reliable torrent client that works much better than WebTorrent for server-side downloads.

## Step 1: Install qBittorrent

### macOS

```bash
# Using Homebrew
brew install --cask qbittorrent

# Or download from: https://www.qbittorrent.org/download
```

### Windows

- Download from: https://www.qbittorrent.org/download
- Run the installer
- Follow the installation wizard

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install qbittorrent-nox

# Or with GUI
sudo apt-get install qbittorrent

# Fedora
sudo dnf install qbittorrent
```

## Step 2: Enable Web UI

1. **Open qBittorrent**

2. **Go to Tools → Options** (or Preferences on Mac)

3. **Click on "Web UI" in the left sidebar**

4. **Enable Web User Interface:**

   - ✅ Check "Web User Interface (Remote control)"
   - **Port**: Usually `8080` (default is fine)
   - **IP address**: Leave as `0.0.0.0` (allows connections from any IP)

5. **Set Username and Password:**

   - **Username**: `admin` (or your choice)
   - **Password**: Set a password (remember this!)
   - Default is often `adminadmin` if you haven't changed it

6. **Click "Apply" and "OK"**

## Step 3: Test Web UI

1. Open your browser
2. Go to: `http://localhost:8080`
3. You should see the qBittorrent Web UI login page
4. Log in with your username and password

If you can log in, the Web UI is working! ✅

## Step 4: Configure BoxOffice

1. **Open your `.env` file** in the BoxOffice directory

2. **Add these lines:**

   ```env
   QBITTORRENT_URL=http://localhost:8080
   QBITTORRENT_USERNAME=admin
   QBITTORRENT_PASSWORD=your_password_here
   ```

   Replace `your_password_here` with the password you set in qBittorrent.

3. **Save the file**

## Step 5: Restart BoxOffice

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm start
```

## Step 6: Test It!

1. Open BoxOffice in your browser
2. Search for a movie
3. Click "Download" on any result
4. Check qBittorrent - you should see the download appear!

## Troubleshooting

### "Cannot connect to qBittorrent"

- Make sure qBittorrent is running
- Check that Web UI is enabled (Tools → Options → Web UI)
- Verify the port is `8080` (or update it in `.env`)
- Try accessing `http://localhost:8080` in your browser

### "Authentication failed"

- Check your username and password in `.env`
- Make sure they match what you set in qBittorrent
- Default username is often `admin`
- Default password is often `adminadmin` if you haven't changed it

### "Connection refused"

- Make sure qBittorrent is running
- Check that the Web UI port matches in both qBittorrent and `.env`
- On macOS, you might need to allow qBittorrent through the firewall

### Downloads not appearing in qBittorrent

- Check qBittorrent's main window
- Look in the "Transfers" tab
- Check the server console for error messages

## Using qBittorrent on a Different Computer

If qBittorrent is running on a different computer on your network:

1. Find the IP address of that computer:

   - Mac/Linux: `ifconfig` or `ip addr`
   - Windows: `ipconfig`

2. Update `.env`:

   ```env
   QBITTORRENT_URL=http://192.168.1.100:8080
   ```

   (Replace with the actual IP address)

3. Make sure qBittorrent's Web UI allows connections from other IPs (set to `0.0.0.0`)

## That's It!

Once configured, BoxOffice will automatically use qBittorrent for all downloads, which is much more reliable than WebTorrent!
