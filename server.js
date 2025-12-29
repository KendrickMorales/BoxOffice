const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const torrentSearch = require('./src/torrentSearch')
const downloadManager = require('./src/downloadManager')
const movieMetadata = require('./src/movieMetadata')

const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'frontend/build')))

// Ensure download directory exists
const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
if (!fs.existsSync(downloadPath)) {
  fs.mkdirSync(downloadPath, { recursive: true })
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', downloadPath })
})

// Search for movies
app.post('/api/search', async (req, res) => {
  try {
    const { query, category } = req.body

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    console.log(`\n📥 Search request received: "${query}"`)
    const results = await torrentSearch.search(query.trim(), category)

    if (results.length === 0) {
      console.log('⚠️  No results found')
      return res.json({
        results: [],
        message:
          'No results found. The torrent-search-api library may have issues with blocked sites. Consider setting up Prowlarr for more reliable searches (see IMPORTANT.md).',
      })
    }

    // Enrich results with movie metadata (poster, description)
    console.log('🎬 Enriching results with movie metadata...')
    const enrichedResults = await movieMetadata.enrichTorrentResults(results)

    res.json({ results: enrichedResults })
  } catch (error) {
    console.error('❌ Search error:', error)
    res.status(500).json({
      error: error.message,
      message: 'Search failed. Please check the server console for details.',
    })
  }
})

// Get available torrent providers
app.get('/api/providers', (req, res) => {
  res.json({ providers: torrentSearch.getAvailableProviders() })
})

// Download a torrent
app.post('/api/download', async (req, res) => {
  try {
    const { magnet, torrentUrl, title } = req.body

    if (!magnet && !torrentUrl) {
      return res
        .status(400)
        .json({ error: 'Magnet link or torrent URL is required' })
    }

    // Try qBittorrent first if configured (more reliable)
    const qbUrl = process.env.QBITTORRENT_URL
    if (qbUrl) {
      try {
        console.log('Using qBittorrent for download...')
        await downloadManager.addDownloadToQBittorrent({
          magnet,
          torrentUrl,
          title: title || 'Unknown',
        })
        return res.json({
          success: true,
          message: 'Download added to qBittorrent successfully',
        })
      } catch (qbError) {
        console.warn(
          'qBittorrent failed, falling back to WebTorrent:',
          qbError.message
        )
        // Fall through to WebTorrent
      }
    }

    // Use WebTorrent as fallback
    const downloadId = await downloadManager.addDownload({
      magnet,
      torrentUrl,
      title: title || 'Unknown',
      downloadPath,
    })

    res.json({
      success: true,
      downloadId,
      message: 'Download started',
    })
  } catch (error) {
    console.error('Download error:', error)
    // Provide helpful error message for protocol errors
    if (
      error.message.includes('Protocol') ||
      error.code === 'ERR_INVALID_PROTOCOL'
    ) {
      return res.status(500).json({
        error:
          'WebTorrent compatibility issue with this magnet link. Consider setting up qBittorrent (see README.md) for more reliable downloads.',
        code: 'ERR_INVALID_PROTOCOL',
      })
    }
    res.status(500).json({ error: error.message })
  }
})

// Get download status
app.get('/api/downloads', (req, res) => {
  const downloads = downloadManager.getDownloads()
  res.json({ downloads })
})

// Get download status by ID
app.get('/api/downloads/:id', (req, res) => {
  const download = downloadManager.getDownload(req.params.id)
  if (!download) {
    return res.status(404).json({ error: 'Download not found' })
  }
  res.json({ download })
})

// Stop/Remove a download
app.delete('/api/downloads/:id', (req, res) => {
  try {
    const download = downloadManager.getDownload(req.params.id)
    if (!download) {
      return res.status(404).json({ error: 'Download not found' })
    }
    
    downloadManager.removeDownload(req.params.id)
    res.json({ 
      success: true, 
      message: 'Download stopped and removed' 
    })
  } catch (error) {
    console.error('Error removing download:', error)
    res.status(500).json({ error: error.message })
  }
})

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'))
})

// Start server
app.listen(PORT, HOST, () => {
  console.log(
    `\n🚀 BoxOffice server running at http://${
      HOST === '0.0.0.0' ? 'localhost' : HOST
    }:${PORT}`
  )
  console.log(`📡 Accessible on your network at http://YOUR_IP:${PORT}`)
  console.log(`📥 Downloads will be saved to: ${path.resolve(downloadPath)}\n`)
})
