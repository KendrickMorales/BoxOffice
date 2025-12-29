// Quick test script to verify search functionality
require('dotenv').config();
const torrentSearch = require('./src/torrentSearch');

async function test() {
  console.log('🧪 Testing torrent search...\n');
  
  try {
    const providers = torrentSearch.getAvailableProviders();
    console.log(`✅ Enabled providers: ${providers.length}`);
    console.log(`   ${providers.join(', ')}\n`);
    
    if (providers.length === 0) {
      console.log('⚠️  WARNING: No providers enabled!');
      console.log('   This might be why you\'re not seeing results.\n');
    }
    
    console.log('🔍 Testing search for "The Matrix"...\n');
    const results = await torrentSearch.search('The Matrix', 'Movies');
    
    console.log(`\n📊 Results: ${results.length}`);
    if (results.length > 0) {
      console.log('\n✅ Search is working! First result:');
      console.log(`   Title: ${results[0].title}`);
      console.log(`   Size: ${results[0].size}`);
      console.log(`   Seeds: ${results[0].seeds}`);
      console.log(`   Provider: ${results[0].provider}`);
    } else {
      console.log('\n⚠️  No results found. This could mean:');
      console.log('   - Torrent sites are blocked in your region');
      console.log('   - Internet connection issues');
      console.log('   - Providers need updating');
      console.log('   - Consider using Prowlarr (see README.md)');
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

test();



