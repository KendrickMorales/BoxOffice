const TorrentSearchApi = require('torrent-search-api');

class TorrentSearch {
  constructor() {
    this.providers = [];
    this.initializeProviders();
  }

  initializeProviders() {
    try {
      // The library loads providers from the providers directory
      // We need to enable public providers (those that don't require authentication)
      this.api = TorrentSearchApi;
      this.api.enablePublicProviders();
      
      // Get list of active providers
      const activeProviders = this.api.getActiveProviders();
      this.providers = activeProviders.map(p => p.name);
      
      console.log(`✅ Enabled ${this.providers.length} torrent providers`);
      if (this.providers.length > 0) {
        console.log(`   Providers: ${this.providers.join(', ')}`);
      } else {
        console.warn('⚠️  No providers enabled. Some providers may require manual configuration.');
      }
    } catch (error) {
      console.error('❌ Failed to initialize providers:', error.message);
      this.providers = [];
    }
  }

  getAvailableProviders() {
    return this.providers;
  }

  async search(query, category = 'Movies') {
    try {
      console.log(`🔍 Searching for: "${query}" in category: ${category}`);
      console.log(`📡 Using ${this.providers.length} providers: ${this.providers.join(', ')}`);
      
      // Try Prowlarr first if configured
      const prowlarrUrl = process.env.PROWLARR_URL;
      const prowlarrApiKey = process.env.PROWLARR_API_KEY;
      
      if (prowlarrUrl && prowlarrApiKey) {
        try {
          console.log('🔍 Trying Prowlarr search...');
          const prowlarrResults = await this.searchProwlarr(query);
          if (prowlarrResults && prowlarrResults.length > 0) {
            console.log(`✅ Found ${prowlarrResults.length} results from Prowlarr`);
            return prowlarrResults;
          }
        } catch (prowlarrError) {
          console.warn('⚠️  Prowlarr search failed, falling back to direct search:', prowlarrError.message);
        }
      }
      
      // Search across all enabled providers
      let allResults = [];
      
      // Try searching individual providers to see which ones work
      const activeProviders = this.api.getActiveProviders();
      console.log(`🔍 Trying ${activeProviders.length} providers individually...`);
      
      for (const provider of activeProviders) {
        try {
          const providerResults = await this.api.search([provider.name], query, category, 10);
          if (providerResults && Array.isArray(providerResults) && providerResults.length > 0) {
            console.log(`✅ ${provider.name}: Found ${providerResults.length} results`);
            allResults = allResults.concat(providerResults);
          }
        } catch (providerError) {
          // Silently continue - some providers may fail
        }
      }
      
      // If individual search didn't work, try the general search
      if (allResults.length === 0) {
        console.log('🔍 Trying general search across all providers...');
        try {
          allResults = await this.api.search(query, category, 50);
        } catch (searchError) {
          console.warn('⚠️  General search failed:', searchError.message);
        }
      }
      
      if (!allResults || allResults.length === 0) {
        console.warn('⚠️  No results found from any provider');
        console.warn('💡 TIP: Consider using Prowlarr for more reliable searches (see IMPORTANT.md)');
        return [];
      }
      
      // Format results - less strict filtering
      const formattedResults = allResults
        .filter(result => {
          // Basic validation - just ensure we have a title and some way to download
          if (!result.title) return false;
          if (!result.magnet && !result.torrentLink) return false;
          return true;
        })
        .map(result => ({
          id: result.magnet || result.torrentLink || Math.random().toString(36),
          title: result.title,
          size: result.size || 'Unknown',
          seeds: result.seeds || result.seeders || 0,
          peers: result.peers || result.leechers || 0,
          provider: result.provider || 'Unknown',
          magnet: result.magnet || result.magnetUrl,
          torrentUrl: result.torrentLink || result.downloadUrl,
          category: result.category || category
        }))
        .sort((a, b) => (b.seeds || 0) - (a.seeds || 0)) // Sort by seeds
        .slice(0, 50); // Limit to top 50 results

      console.log(`✅ Total formatted results: ${formattedResults.length}`);
      return formattedResults;
    } catch (error) {
      console.error('❌ Search error:', error);
      console.error('Error stack:', error.stack);
      throw new Error(`Search failed: ${error.message}. Make sure you have an internet connection and try again.`);
    }
  }

  // Optional: Integration with Prowlarr API
  async searchProwlarr(query) {
    const prowlarrUrl = process.env.PROWLARR_URL;
    const apiKey = process.env.PROWLARR_API_KEY;

    if (!prowlarrUrl || !apiKey) {
      throw new Error('Prowlarr not configured');
    }

    try {
      const axios = require('axios');
      const response = await axios.get(`${prowlarrUrl}/api/v1/search`, {
        params: {
          query,
          categories: [2000], // Movies category
          type: 'movie'
        },
        headers: {
          'X-Api-Key': apiKey
        }
      });

      return response.data.map(result => ({
        id: result.guid,
        title: result.title,
        size: result.size,
        seeds: result.seeders || 0,
        peers: result.leechers || 0,
        provider: result.indexer,
        magnet: result.magnetUrl,
        torrentUrl: result.downloadUrl
      }));
    } catch (error) {
      console.error('Prowlarr search error:', error);
      throw error;
    }
  }
}

module.exports = new TorrentSearch();

