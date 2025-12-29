const axios = require('axios');

class MovieMetadata {
  constructor() {
    this.tmdbApiKey = process.env.TMDB_API_KEY || null;
    this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
    this.tmdbImageBaseUrl = 'https://image.tmdb.org/t/p/w500';
    this.cache = new Map();
  }

  // Extract movie title and year from torrent title
  parseMovieTitle(torrentTitle) {
    // Common patterns: "Movie Name (2023)", "Movie Name 2023", "Movie.Name.2023.1080p"
    const patterns = [
      /^(.+?)\s*\((\d{4})\)/,  // "Movie (2023)"
      /^(.+?)\s+(\d{4})\s/,    // "Movie 2023 "
      /^(.+?)\.(\d{4})\./,      // "Movie.2023."
      /^(.+?)\s+(\d{4})$/,      // "Movie 2023"
    ];

    for (const pattern of patterns) {
      const match = torrentTitle.match(pattern);
      if (match) {
        return {
          title: match[1].trim().replace(/\./g, ' ').replace(/\s+/g, ' '),
          year: parseInt(match[2])
        };
      }
    }

    // Fallback: try to extract just the title (remove quality, codec, etc.)
    const cleaned = torrentTitle
      .replace(/\.(1080p|720p|480p|2160p|4K)/gi, '')
      .replace(/\.(BluRay|WEB-DL|DVDRip|HDRip|BRRip)/gi, '')
      .replace(/\.(x264|x265|HEVC|AVC)/gi, '')
      .replace(/\.(AAC|AC3|DTS|TrueHD)/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\./g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { title: cleaned, year: null };
  }

  async searchTMDB(title, year = null) {
    const cacheKey = `${title}_${year || 'no_year'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = {
        query: title,
        include_adult: false,
        language: 'en-US'
      };

      if (year) {
        params.year = year;
      }

      const url = this.tmdbApiKey
        ? `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}`
        : `${this.tmdbBaseUrl}/search/movie`;

      const response = await axios.get(url, {
        params,
        timeout: 5000
      });

      if (response.data.results && response.data.results.length > 0) {
        const movie = response.data.results[0];
        const result = {
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : null
        };
        
        this.cache.set(cacheKey, result);
        return result;
      }

      return null;
    } catch (error) {
      console.warn(`TMDB search failed for "${title}":`, error.message);
      return null;
    }
  }

  async getMovieDetails(tmdbId) {
    try {
      const url = this.tmdbApiKey
        ? `${this.tmdbBaseUrl}/movie/${tmdbId}?api_key=${this.tmdbApiKey}`
        : `${this.tmdbBaseUrl}/movie/${tmdbId}`;

      const response = await axios.get(url, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.warn(`TMDB details failed for ID ${tmdbId}:`, error.message);
      return null;
    }
  }

  getPosterUrl(posterPath) {
    if (!posterPath) return null;
    return `${this.tmdbImageBaseUrl}${posterPath}`;
  }

  async enrichTorrentResult(torrentResult) {
    try {
      const parsed = this.parseMovieTitle(torrentResult.title);
      const tmdbData = await this.searchTMDB(parsed.title, parsed.year);

      if (tmdbData) {
        return {
          ...torrentResult,
          movieMetadata: {
            title: tmdbData.title,
            description: tmdbData.overview || 'No description available.',
            poster: this.getPosterUrl(tmdbData.poster_path),
            year: tmdbData.year,
            rating: tmdbData.vote_average,
            releaseDate: tmdbData.release_date
          }
        };
      }

      return torrentResult;
    } catch (error) {
      console.warn(`Failed to enrich result "${torrentResult.title}":`, error.message);
      return torrentResult;
    }
  }

  async enrichTorrentResults(torrentResults) {
    // Enrich results in parallel, but limit concurrency to avoid rate limits
    const batchSize = 5;
    const enrichedResults = [];

    for (let i = 0; i < torrentResults.length; i += batchSize) {
      const batch = torrentResults.slice(i, i + batchSize);
      const enrichedBatch = await Promise.all(
        batch.map(result => this.enrichTorrentResult(result))
      );
      enrichedResults.push(...enrichedBatch);
    }

    return enrichedResults;
  }
}

module.exports = new MovieMetadata();



