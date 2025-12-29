import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [currentPage, setCurrentPage] = useState('search'); // 'search' or 'downloads'
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloads, setDownloads] = useState([]);
  const [selectedMovies, setSelectedMovies] = useState(new Set());
  const [sortBy, setSortBy] = useState('seeds'); // 'seeds', 'provider', 'size', 'title'

  useEffect(() => {
    // Poll for download updates
    const interval = setInterval(() => {
      fetchDownloads();
    }, 2000);
    
    fetchDownloads();
    return () => clearInterval(interval);
  }, []);

  const fetchDownloads = async () => {
    try {
      const response = await fetch(`${API_BASE}/downloads`);
      const data = await response.json();
      setDownloads(data.downloads || []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setResults([]);
    
    try {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery, category: 'Movies' }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Search failed');
      }
      
      if (data.results) {
        setResults(data.results);
        if (data.results.length === 0 && data.message) {
          alert(data.message);
        }
      } else {
        setResults([]);
        alert('No results found. Try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert(`Search failed: ${error.message}. Make sure the server is running and try again.`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (result) => {
    try {
      const response = await fetch(`${API_BASE}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          magnet: result.magnet,
          torrentUrl: result.torrentUrl,
          title: result.title,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Download started: ${result.title}`);
        fetchDownloads();
      } else {
        alert(`Download failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    }
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedMovies);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMovies(newSelected);
  };

  const downloadSelected = async () => {
    const selectedResults = results.filter(r => selectedMovies.has(r.id));
    
    for (const result of selectedResults) {
      await handleDownload(result);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between downloads
    }
    
    setSelectedMovies(new Set());
    alert(`Started ${selectedResults.length} download(s)`);
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '0 B/s';
    return formatSize(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getTimeRemaining = (download) => {
    if (!download.downloadSpeed || download.downloadSpeed === 0) return null;
    if (!download.total || !download.downloaded) return null;
    const remaining = download.total - download.downloaded;
    const seconds = remaining / download.downloadSpeed;
    return formatTime(seconds);
  };

  const getSortedResults = () => {
    const sorted = [...results];
    
    switch (sortBy) {
      case 'provider':
        return sorted.sort((a, b) => {
          const providerA = (a.provider || 'Unknown').toLowerCase();
          const providerB = (b.provider || 'Unknown').toLowerCase();
          return providerA.localeCompare(providerB);
        });
      case 'seeds':
        return sorted.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
      case 'size':
        return sorted.sort((a, b) => {
          // Convert size to bytes for comparison if needed
          const sizeA = typeof a.size === 'number' ? a.size : 0;
          const sizeB = typeof b.size === 'number' ? b.size : 0;
          return sizeB - sizeA;
        });
      case 'title':
        return sorted.sort((a, b) => {
          const titleA = (a.movieMetadata?.title || a.title || '').toLowerCase();
          const titleB = (b.movieMetadata?.title || b.title || '').toLowerCase();
          return titleA.localeCompare(titleB);
        });
      default:
        return sorted;
    }
  };

  const handleStopDownload = async (downloadId) => {
    if (!window.confirm('Are you sure you want to stop this download? This will stop seeding.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/downloads/${downloadId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (response.ok) {
        fetchDownloads(); // Refresh the list
      } else {
        alert(`Failed to stop download: ${data.error}`);
      }
    } catch (error) {
      console.error('Error stopping download:', error);
      alert('Failed to stop download. Please try again.');
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🎬 Mofongo Theater</h1>
        <p>Busca lo que te de la gana</p>
      </header>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`nav-tab ${currentPage === 'search' ? 'active' : ''}`}
          onClick={() => setCurrentPage('search')}
        >
          🔍 Search
        </button>
        <button
          className={`nav-tab ${currentPage === 'downloads' ? 'active' : ''}`}
          onClick={() => setCurrentPage('downloads')}
        >
          📥 Downloads {downloads.length > 0 && `(${downloads.length})`}
        </button>
      </div>

      <main className="app-main">
        {/* Search Page */}
        {currentPage === 'search' && (
          <>
        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a movie..."
              className="search-input"
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {selectedMovies.size > 0 && (
            <button 
              onClick={downloadSelected} 
              className="download-selected-button"
            >
              Download Selected ({selectedMovies.size})
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="results-section">
            <div className="results-header-with-sort">
              <h2>Search Results ({results.length})</h2>
              <div className="sort-controls">
                <label htmlFor="sort-select" className="sort-label">
                  Sort by:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="seeds">🌱 Seeds (High to Low)</option>
                  <option value="provider">🔗 Provider/Site</option>
                  <option value="size">📦 Size (Large to Small)</option>
                  <option value="title">📝 Title (A-Z)</option>
                </select>
              </div>
            </div>
            <div className="results-grid">
              {getSortedResults().map((result) => (
                <div 
                  key={result.id} 
                  className={`result-card ${selectedMovies.has(result.id) ? 'selected' : ''}`}
                >
                  <div className="result-card-content">
                    {/* Movie Poster */}
                    {result.movieMetadata && result.movieMetadata.poster ? (
                      <div className="result-poster">
                        <img 
                          src={result.movieMetadata.poster} 
                          alt={result.movieMetadata.title || result.title}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="poster-placeholder" style={{ display: 'none' }}>
                          🎬
                        </div>
                      </div>
                    ) : (
                      <div className="result-poster">
                        <div className="poster-placeholder">🎬</div>
                      </div>
                    )}

                    {/* Movie Info */}
                    <div className="result-details">
                      <div className="result-header">
                        <input
                          type="checkbox"
                          checked={selectedMovies.has(result.id)}
                          onChange={() => toggleSelect(result.id)}
                          className="result-checkbox"
                        />
                        <div className="result-title-section">
                          <h3 className="result-title">
                            {result.movieMetadata?.title || result.title}
                          </h3>
                          {result.movieMetadata?.year && (
                            <span className="result-year">({result.movieMetadata.year})</span>
                          )}
                          {result.movieMetadata?.rating && (
                            <span className="result-rating">⭐ {result.movieMetadata.rating.toFixed(1)}</span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {result.movieMetadata && result.movieMetadata.description && (
                        <p className="result-description">
                          {result.movieMetadata.description.length > 200
                            ? `${result.movieMetadata.description.substring(0, 200)}...`
                            : result.movieMetadata.description}
                        </p>
                      )}

                      {/* Torrent Info */}
                      <div className="result-info">
                        <span className="result-size">📦 {formatSize(result.size)}</span>
                        <span className="result-seeds">🌱 {result.seeds || 0} seeds</span>
                        <span className="result-provider">🔗 {result.provider}</span>
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={() => handleDownload(result)}
                        className="download-button"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

          </>
        )}

        {/* Downloads Page */}
        {currentPage === 'downloads' && (
          <div className="downloads-page">
            <div className="downloads-header">
              <h2>📥 Downloads</h2>
              <p className="downloads-subtitle">
                {downloads.length === 0 
                  ? 'No active downloads' 
                  : `${downloads.length} download${downloads.length !== 1 ? 's' : ''} in progress`}
              </p>
            </div>

            {downloads.length === 0 ? (
              <div className="empty-downloads">
                <div className="empty-downloads-icon">📭</div>
                <p>No downloads yet</p>
                <p className="empty-downloads-hint">
                  Go to the Search tab to find and download movies
                </p>
              </div>
            ) : (
              <div className="downloads-list">
                {downloads.map((download) => {
                  const timeRemaining = getTimeRemaining(download);
                  return (
                    <div key={download.id} className="download-card">
                      <div className="download-card-header">
                        <div className="download-title-section">
                          <h3 className="download-title">{download.title}</h3>
                          {download.startedAt && (
                            <span className="download-started">
                              Started: {new Date(download.startedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className={`download-status ${download.status}`}>
                            {download.status === 'downloading' && '⬇️ Downloading'}
                            {download.status === 'completed' && '✅ Completed'}
                            {download.status === 'starting' && '🔄 Starting'}
                            {download.status === 'error' && '❌ Error'}
                          </span>
                          <button
                            onClick={() => handleStopDownload(download.id)}
                            className="stop-download-button"
                            title="Stop download and seeding"
                          >
                            🛑 Stop
                          </button>
                        </div>
                      </div>

                      {download.status === 'downloading' && (
                        <>
                          <div className="download-progress">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${download.progress || 0}%` }}
                              >
                                <span className="progress-text">
                                  {Math.round(download.progress || 0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="download-stats">
                            <div className="download-stat">
                              <span className="stat-label">Speed:</span>
                              <span className="stat-value">{formatSpeed(download.downloadSpeed)}</span>
                            </div>
                            <div className="download-stat">
                              <span className="stat-label">Progress:</span>
                              <span className="stat-value">
                                {formatSize(download.downloaded)} / {formatSize(download.total)}
                              </span>
                            </div>
                            {timeRemaining && (
                              <div className="download-stat">
                                <span className="stat-label">Time Remaining:</span>
                                <span className="stat-value">{timeRemaining}</span>
                              </div>
                            )}
                            {download.numPeers !== undefined && (
                              <div className="download-stat">
                                <span className="stat-label">Peers:</span>
                                <span className="stat-value">{download.numPeers}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {download.status === 'completed' && (
                        <div className="download-complete">
                          <div className="complete-icon">✅</div>
                          <div className="complete-info">
                            <p className="complete-message">Download complete!</p>
                            <p className="complete-path">
                              <strong>Saved to:</strong> {download.path}
                            </p>
                            {download.completedAt && (
                              <p className="complete-time">
                                Completed: {new Date(download.completedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {download.status === 'starting' && (
                        <div className="download-starting">
                          <div className="spinner"></div>
                          <p>Initializing download...</p>
                        </div>
                      )}

                      {download.status === 'error' && (
                        <div className="download-error">
                          <div className="error-icon">❌</div>
                          <div className="error-info">
                            <p className="error-message">Download failed</p>
                            <p className="error-details">{download.error || 'Unknown error'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {results.length === 0 && !loading && searchQuery === '' && (
          <div className="empty-state">
            <p>🔍 Search for a movie to get started</p>
            <p style={{ fontSize: '1rem', marginTop: '1rem', color: '#888' }}>
              Enter a movie name in the search box above and click "Search"
            </p>
          </div>
        )}
        
        {results.length === 0 && !loading && searchQuery !== '' && (
          <div className="empty-state">
            <p>❌ No results found for "{searchQuery}"</p>
            <div style={{ fontSize: '1rem', marginTop: '1rem', color: '#666', maxWidth: '600px', margin: '1rem auto', padding: '1.5rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#856404' }}>💡 Recommended Solution:</p>
              <p style={{ marginBottom: '0.5rem' }}>
                The torrent-search-api library may not be working due to site changes or blocks. 
                <strong> Use Prowlarr for reliable searches!</strong>
              </p>
              <ol style={{ textAlign: 'left', marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Install Prowlarr from <a href="https://prowlarr.com" target="_blank" rel="noopener">prowlarr.com</a></li>
                <li>Get your API key from Prowlarr Settings → General</li>
                <li>Create a <code>.env</code> file with:
                  <pre style={{ background: '#f8f9fa', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', fontSize: '0.9rem' }}>
PROWLARR_URL=http://localhost:9696{'\n'}PROWLARR_API_KEY=your_api_key_here</pre>
                </li>
                <li>Restart the server</li>
              </ol>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                See <code>IMPORTANT.md</code> for detailed setup instructions.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
