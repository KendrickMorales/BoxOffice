const WebTorrent = require('webtorrent')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const FormData = require('form-data')

class DownloadManager {
  constructor() {
    this.client = new WebTorrent()
    this.downloads = new Map()
    this.downloadCounter = 0

    // Handle global WebTorrent errors
    this.client.on('error', (error) => {
      console.error('WebTorrent client error:', error)
      // Don't throw - just log, individual torrents will handle their own errors
    })
  }

  generateId() {
    return `dl_${Date.now()}_${++this.downloadCounter}`
  }

  async addDownload({ magnet, torrentUrl, title, downloadPath }) {
    const id = this.generateId()
    const downloadDir = path.join(downloadPath, this.sanitizeFileName(title))

    // Ensure download directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true })
    }

    const downloadInfo = {
      id,
      title,
      status: 'starting',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloaded: 0,
      total: 0,
      path: downloadDir,
      startedAt: new Date().toISOString(),
    }

    this.downloads.set(id, downloadInfo)

    try {
      let torrent

      // Normalize inputs: sometimes Prowlarr puts HTTP URLs in the magnet field
      let actualMagnet = null
      let actualTorrentUrl = null

      // Check if magnet is actually a magnet link
      if (magnet && typeof magnet === 'string') {
        if (magnet.startsWith('magnet:?')) {
          actualMagnet = magnet
        } else if (
          magnet.startsWith('http://') ||
          magnet.startsWith('https://')
        ) {
          // It's actually a torrent URL, not a magnet link
          actualTorrentUrl = magnet
        }
      }

      // Check torrentUrl
      if (
        torrentUrl &&
        typeof torrentUrl === 'string' &&
        (torrentUrl.startsWith('http://') || torrentUrl.startsWith('https://'))
      ) {
        actualTorrentUrl = torrentUrl
      }

      // Determine what we have: magnet link or HTTP URL (torrent file)
      const hasMagnet = actualMagnet !== null
      const hasTorrentUrl = actualTorrentUrl !== null

      if (hasMagnet) {
        console.log(`Adding magnet link: ${actualMagnet.substring(0, 100)}...`)

        // WebTorrent handles magnet links directly
        try {
          torrent = this.client.add(actualMagnet, {
            path: downloadDir,
          })

          if (!torrent) {
            throw new Error('Failed to create torrent object')
          }
        } catch (addError) {
          console.error('Error adding torrent to WebTorrent:', addError)
          if (
            addError.code === 'ERR_INVALID_PROTOCOL' ||
            addError.message.includes('Protocol')
          ) {
            throw new Error(
              'WebTorrent encountered an invalid protocol. This magnet link may be incompatible. Consider using qBittorrent.'
            )
          }
          throw new Error(`Failed to add torrent: ${addError.message}`)
        }
      } else if (hasTorrentUrl) {
        console.log(
          `Downloading torrent file from: ${actualTorrentUrl.substring(
            0,
            100
          )}...`
        )

        // Check if Prowlarr URL contains a magnet link in the 'link' parameter
        // Prowlarr URLs often look like: http://localhost:9696/2/download?apikey=...&link=magnet:?...
        let magnetFromUrl = null
        try {
          const urlObj = new URL(actualTorrentUrl)
          const linkParam = urlObj.searchParams.get('link')
          if (linkParam && linkParam.startsWith('magnet:?')) {
            magnetFromUrl = linkParam
            console.log(
              'Found magnet link in Prowlarr URL parameter, using it directly...'
            )
          }
        } catch (urlParseError) {
          // URL parsing failed, continue with download
          console.log(
            'Could not parse URL for magnet link, will try download...'
          )
        }

        // If we found a magnet link in the URL, use it directly
        if (magnetFromUrl) {
          try {
            torrent = this.client.add(magnetFromUrl, {
              path: downloadDir,
            })
          } catch (addError) {
            console.error(
              'Error adding magnet link from URL parameter:',
              addError
            )
            throw new Error(`Failed to add magnet link: ${addError.message}`)
          }
        } else {
          // No magnet in URL, need to download the file (or handle redirect)
          // Handle Prowlarr URLs that might need API key in headers
          const headers = {}
          if (
            actualTorrentUrl.includes('localhost:9696') ||
            actualTorrentUrl.includes('prowlarr')
          ) {
            const apiKey = process.env.PROWLARR_API_KEY
            if (apiKey) {
              headers['X-Api-Key'] = apiKey
            }
          }

          try {
            // First, try to get the redirect location without following it
            // Prowlarr often redirects to magnet links
            let redirectLocation = null
            try {
              const headResponse = await axios.head(actualTorrentUrl, {
                headers,
                timeout: 10000,
                maxRedirects: 0, // Don't follow redirects
                validateStatus: (status) => status >= 200 && status < 400,
              })
              redirectLocation = headResponse.headers.location
            } catch (headError) {
              // If HEAD fails, try GET with no redirects
              try {
                const noRedirectResponse = await axios.get(actualTorrentUrl, {
                  headers,
                  timeout: 10000,
                  maxRedirects: 0,
                  validateStatus: (status) => status >= 200 && status < 400,
                })
                redirectLocation = noRedirectResponse.headers.location
              } catch (noRedirectError) {
                if (
                  noRedirectError.response &&
                  noRedirectError.response.status >= 300 &&
                  noRedirectError.response.status < 400
                ) {
                  redirectLocation = noRedirectError.response.headers.location
                }
              }
            }

            // If we found a redirect to a magnet link, use it directly
            if (redirectLocation && redirectLocation.startsWith('magnet:?')) {
              console.log(
                'Prowlarr redirected to magnet link, using it directly...'
              )
              try {
                torrent = this.client.add(redirectLocation, {
                  path: downloadDir,
                })
              } catch (addError) {
                console.error('Error adding redirected magnet link:', addError)
                throw new Error(
                  `Failed to add magnet link: ${addError.message}`
                )
              }
            } else {
              // No magnet redirect, try to download the torrent file
              // Disable redirects to avoid magnet protocol errors
              const response = await axios.get(actualTorrentUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers,
                maxRedirects: 0, // Don't auto-follow redirects
                validateStatus: (status) => {
                  // Accept 2xx and 3xx but don't follow redirects
                  return status >= 200 && status < 400
                },
              })

              // Check if response is actually a redirect
              if (response.status >= 300 && response.status < 400) {
                const location = response.headers.location
                if (location && location.startsWith('magnet:?')) {
                  console.log('Response redirected to magnet link, using it...')
                  torrent = this.client.add(location, {
                    path: downloadDir,
                  })
                } else {
                  throw new Error(`Unexpected redirect to: ${location}`)
                }
              } else {
                // It's a torrent file
                const torrentBuffer = Buffer.from(response.data)
                torrent = this.client.add(torrentBuffer, {
                  path: downloadDir,
                })
              }
            }
          } catch (downloadError) {
            // If we get a "Unsupported protocol magnet:" error, try to extract the magnet link
            if (
              downloadError.message.includes('magnet:') ||
              downloadError.message.includes('Unsupported protocol')
            ) {
              console.log(
                'Detected magnet redirect error, attempting to extract magnet link...'
              )
              // Try to parse the error or make a request that doesn't follow redirects
              // The URL might have the magnet link in a parameter
              const urlObj = new URL(actualTorrentUrl)
              const linkParam = urlObj.searchParams.get('link')
              if (linkParam && linkParam.startsWith('magnet:?')) {
                console.log('Found magnet link in URL parameter, using it...')
                torrent = this.client.add(linkParam, {
                  path: downloadDir,
                })
              } else {
                throw new Error(
                  `Prowlarr redirected to magnet link but couldn't extract it. Error: ${downloadError.message}`
                )
              }
            } else {
              throw downloadError
            }
          }
        }
      } else {
        // If we have something but it's not a valid magnet or URL, provide helpful error
        if (magnet && !hasMagnet && !actualTorrentUrl) {
          throw new Error(
            `Invalid magnet link format. Got: ${magnet.substring(0, 100)}...`
          )
        }
        if (torrentUrl && !hasTorrentUrl && !actualMagnet) {
          throw new Error(
            `Invalid torrent URL format. Must be http:// or https://. Got: ${
              torrentUrl ? torrentUrl.substring(0, 100) : 'undefined'
            }...`
          )
        }
        throw new Error('No valid magnet link or torrent URL provided')
      }

      // Update download info with torrent
      downloadInfo.torrent = torrent

      // Set up event handlers - MUST be set up immediately after adding BEFORE adding to client to catch early errors
      torrent.on('download', () => {
        downloadInfo.status = 'downloading'
        this.updateDownloadInfo(id, torrent)
      })

      torrent.on('done', () => {
        downloadInfo.status = 'completed'
        downloadInfo.progress = 100
        downloadInfo.completedAt = new Date().toISOString()
        downloadInfo.downloadSpeed = 0
        downloadInfo.uploadSpeed = 0
        this.updateDownloadInfo(id, torrent)

        // Stop seeding by removing the torrent from the client
        console.log(`Download complete for ${title}, stopping seeding...`)
        setTimeout(() => {
          try {
            this.client.remove(torrent)
            console.log(`✅ Stopped seeding for ${title}`)
          } catch (error) {
            console.warn(`Error stopping torrent: ${error.message}`)
          }
        }, 2000) // Small delay to ensure final status update
      })

      torrent.on('error', (error) => {
        console.error(`Torrent error for ${title}:`, error)
        // Check if it's the protocol error
        if (
          error.code === 'ERR_INVALID_PROTOCOL' ||
          error.message.includes('Protocol')
        ) {
          downloadInfo.status = 'error'
          downloadInfo.error =
            'Invalid torrent link format. This may be a compatibility issue with WebTorrent. Try using qBittorrent or another torrent client.'
        } else {
          downloadInfo.status = 'error'
          downloadInfo.error = error.message || 'Unknown error occurred'
        }
        this.updateDownloadInfo(id, torrent)
      })

      // Handle metadata download
      torrent.on('metadata', () => {
        console.log(`Metadata received for ${title}`)
        downloadInfo.status = 'downloading'
        this.updateDownloadInfo(id, torrent)
      })

      // Handle ready event
      torrent.on('ready', () => {
        console.log(`Torrent ready for ${title}`)
        downloadInfo.status = 'downloading'
        this.updateDownloadInfo(id, torrent)
      })

      // Set a timeout to catch errors that might occur during initialization
      setTimeout(() => {
        if (downloadInfo.status === 'starting' && !torrent.infoHash) {
          console.warn(`Torrent ${title} still initializing after 5 seconds`)
        }
      }, 5000)

      // Update progress periodically
      const progressInterval = setInterval(() => {
        if (torrent.done) {
          clearInterval(progressInterval)
          // Final update
          this.updateDownloadInfo(id, torrent)
          return
        }
        this.updateDownloadInfo(id, torrent)
      }, 1000)

      // Store interval ID so we can clear it if needed
      downloadInfo.progressInterval = progressInterval

      return id
    } catch (error) {
      downloadInfo.status = 'error'
      downloadInfo.error = error.message
      throw error
    }
  }

  updateDownloadInfo(id, torrent) {
    const downloadInfo = this.downloads.get(id)
    if (!downloadInfo) return

    // Don't update if already completed
    if (downloadInfo.status === 'completed') {
      return
    }

    downloadInfo.progress = torrent.progress * 100
    downloadInfo.downloadSpeed = torrent.downloadSpeed
    downloadInfo.uploadSpeed = torrent.uploadSpeed
    downloadInfo.downloaded = torrent.downloaded
    downloadInfo.total = torrent.length
    downloadInfo.numPeers = torrent.numPeers
  }

  getDownload(id) {
    const download = this.downloads.get(id)
    if (!download) return null

    // Return a clean copy without the torrent object (which has circular references)
    const { torrent, ...cleanDownload } = download
    return cleanDownload
  }

  getDownloads() {
    // Return clean copies without the torrent objects (which have circular references)
    return Array.from(this.downloads.values()).map((download) => {
      const { torrent, ...cleanDownload } = download
      return cleanDownload
    })
  }

  removeDownload(id) {
    const download = this.downloads.get(id)
    if (download) {
      // Clear progress interval if it exists
      if (download.progressInterval) {
        clearInterval(download.progressInterval)
      }

      // Stop and remove the torrent
      if (download.torrent) {
        console.log(`Stopping and removing torrent: ${download.title}`)
        try {
          this.client.remove(download.torrent)
          // Also destroy the torrent to stop all activity
          if (download.torrent.destroy) {
            download.torrent.destroy()
          }
        } catch (error) {
          console.warn(`Error removing torrent: ${error.message}`)
        }
      }
    }
    this.downloads.delete(id)
    console.log(`Download ${id} removed`)
  }

  sanitizeFileName(fileName) {
    // Remove invalid characters for file names
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 200) // Limit length
  }

  // Optional: Integration with qBittorrent
  async addDownloadToQBittorrent({ magnet, torrentUrl, title }) {
    const qbUrl = process.env.QBITTORRENT_URL
    const username = process.env.QBITTORRENT_USERNAME || 'admin'
    const password = process.env.QBITTORRENT_PASSWORD || 'adminadmin'

    if (!qbUrl) {
      throw new Error('qBittorrent not configured')
    }

    try {
      // Login to qBittorrent
      let loginResponse
      try {
        loginResponse = await axios.post(`${qbUrl}/api/v2/auth/login`, null, {
          params: { username, password },
          timeout: 5000,
        })
      } catch (loginError) {
        if (loginError.response && loginError.response.status === 401) {
          throw new Error(
            'qBittorrent authentication failed. Check your username and password in .env file.'
          )
        }
        throw new Error(
          `Cannot connect to qBittorrent at ${qbUrl}. Make sure qBittorrent is running and Web UI is enabled.`
        )
      }

      if (loginResponse.data !== 'Ok.') {
        throw new Error(
          'qBittorrent authentication failed. Check your username and password.'
        )
      }

      // Get cookies for subsequent requests
      const cookies = loginResponse.headers['set-cookie']
      if (!cookies || cookies.length === 0) {
        throw new Error('Failed to get authentication cookies')
      }

      const cookieString = Array.isArray(cookies) ? cookies.join('; ') : cookies

      // Add torrent
      const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
      const addParams = {
        savepath: downloadPath,
        category: 'movies',
        paused: 'false',
      }

      // Normalize inputs: sometimes Prowlarr puts HTTP URLs in the magnet field
      let actualMagnet = null
      let actualTorrentUrl = null

      // Check if magnet is actually a magnet link
      if (magnet && typeof magnet === 'string') {
        if (magnet.startsWith('magnet:?')) {
          actualMagnet = magnet
        } else if (
          magnet.startsWith('http://') ||
          magnet.startsWith('https://')
        ) {
          // It's actually a torrent URL, not a magnet link
          actualTorrentUrl = magnet
        }
      }

      // Check torrentUrl
      if (
        torrentUrl &&
        typeof torrentUrl === 'string' &&
        (torrentUrl.startsWith('http://') || torrentUrl.startsWith('https://'))
      ) {
        actualTorrentUrl = torrentUrl
      }

      // Determine what we have: magnet link or HTTP URL
      const hasMagnet = actualMagnet !== null
      const hasTorrentUrl = actualTorrentUrl !== null

      if (hasMagnet) {
        console.log(
          `Adding magnet to qBittorrent: ${actualMagnet.substring(0, 100)}...`
        )
        await axios.post(`${qbUrl}/api/v2/torrents/add`, null, {
          params: {
            urls: actualMagnet,
            ...addParams,
          },
          headers: {
            Cookie: cookieString,
            'User-Agent': 'BoxOffice/1.0',
          },
          timeout: 10000,
        })
        console.log('✅ Successfully added magnet to qBittorrent')
      } else if (hasTorrentUrl) {
        console.log(
          `Downloading torrent file from: ${actualTorrentUrl.substring(
            0,
            100
          )}...`
        )

        // Handle Prowlarr URLs that might need API key
        const headers = {}
        if (
          actualTorrentUrl.includes('localhost:9696') ||
          actualTorrentUrl.includes('prowlarr')
        ) {
          const apiKey = process.env.PROWLARR_API_KEY
          if (apiKey) {
            headers['X-Api-Key'] = apiKey
          }
        }

        const torrentResponse = await axios.get(actualTorrentUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers,
        })

        // Use FormData for Node.js
        const formData = new FormData()
        formData.append('torrents', torrentResponse.data, {
          filename: 'movie.torrent',
          contentType: 'application/x-bittorrent',
        })

        // Add other parameters as form fields
        Object.keys(addParams).forEach((key) => {
          formData.append(key, addParams[key])
        })

        await axios.post(`${qbUrl}/api/v2/torrents/add`, formData, {
          headers: {
            Cookie: cookieString,
            ...formData.getHeaders(),
          },
          timeout: 30000,
        })
        console.log('✅ Successfully added torrent file to qBittorrent')
      } else {
        throw new Error('No magnet link or torrent URL provided')
      }

      return {
        success: true,
        message: 'Download added to qBittorrent successfully',
      }
    } catch (error) {
      console.error('qBittorrent error:', error.message)
      if (error.response) {
        throw new Error(
          `qBittorrent API error: ${error.response.status} - ${error.response.data}`
        )
      }
      throw error
    }
  }
}

module.exports = new DownloadManager()
