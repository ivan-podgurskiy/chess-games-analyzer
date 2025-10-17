#!/usr/bin/env node

// Simple test script to verify the analyzer works
import { ChessComService } from './dist/services/ChessComService.js';

async function testAnalyzer() {
  console.log('🧪 Testing Chess.com API connection...');

  try {
    const service = new ChessComService();

    // Test with a famous chess player who has public games
    const testUsername = 'magnuscarlsen';

    console.log(`Fetching archives for ${testUsername}...`);
    const archives = await service.getPlayerArchives(testUsername);

    if (archives.length > 0) {
      console.log(`✅ Successfully found ${archives.length} monthly archives`);
      console.log(`Latest archive: ${archives[archives.length - 1]}`);

      // Test fetching one month of games
      const urlParts = archives[archives.length - 1].split('/');
      const year = parseInt(urlParts[urlParts.length - 2]);
      const month = parseInt(urlParts[urlParts.length - 1]);

      console.log(`Fetching games for ${year}/${month.toString().padStart(2, '0')}...`);
      const games = await service.getMonthlyGames(testUsername, year, month);

      console.log(`✅ Successfully fetched ${games.length} games`);

      if (games.length > 0) {
        console.log(`Sample game URL: ${games[0].url}`);
        console.log(`Time control: ${games[0].time_control}`);
        console.log(`Result: ${games[0].white.username === testUsername ? games[0].white.result : games[0].black.result}`);
      }
    } else {
      console.log('❌ No archives found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAnalyzer();