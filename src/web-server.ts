import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChessComService } from './services/ChessComService';
import { AIGameAnalyzer } from './analysis/AIGameAnalyzer';
import { RecommendationEngine } from './services/RecommendationEngine';
import { PgnParser } from './utils/PgnParser';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

const chessComService = new ChessComService();
let aiGameAnalyzer: AIGameAnalyzer;
const recommendationEngine = new RecommendationEngine();

// Initialize Claude AI analyzer
async function initializeClaudeAI() {
  aiGameAnalyzer = new AIGameAnalyzer();
  await aiGameAnalyzer.initialize();
  console.log('🧠 Claude AI Chess Engine initialized');
}

// Initialize on startup
initializeClaudeAI().catch(console.error);

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { username, limit = 20, timeAvailable = 30 } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('status', { message: 'Fetching games from Chess.com...', progress: 10 });

    const rawGames = await chessComService.getAllPlayerGames(username, limit);

    if (rawGames.length === 0) {
      sendEvent('error', { message: 'No games found for this user' });
      return res.end();
    }

    sendEvent('status', { message: `Found ${rawGames.length} games`, progress: 30 });

    // Check which games already have cached analyses
    const gameUuids = rawGames.map(g => g.uuid);
    const cachedAnalyses = await chessComService.getCachedAnalyses(username, gameUuids);
    
    const analyses = [];
    let cachedCount = 0;
    let analyzedCount = 0;
    
    for (let i = 0; i < rawGames.length; i++) {
      try {
        const rawGame = rawGames[i];
        const game = PgnParser.parseChessComGame(rawGame);
        
        // Check if we have a cached analysis
        const cachedAnalysis = cachedAnalyses.get(rawGame.uuid);
        if (cachedAnalysis) {
          analyses.push(cachedAnalysis);
          cachedCount++;
          console.log(`💾 Using cached analysis for game ${rawGame.uuid}`);
        } else {
          // Analyze the game
          const analysis = await aiGameAnalyzer.analyzeGame(game, username);
          analyses.push(analysis);
          analyzedCount++;
          
          // Cache the analysis for future use
          await chessComService.cacheAnalysis(rawGame.uuid, username, analysis);
        }

        const progress = 30 + Math.floor((i / rawGames.length) * 50);
        sendEvent('status', {
          message: cachedAnalysis 
            ? `Loading cached analysis ${i + 1}/${rawGames.length}...` 
            : `Analyzing game ${i + 1}/${rawGames.length}...`,
          progress
        });
      } catch (error) {
        console.warn(`Skipping game ${i + 1}:`, error);
      }
    }
    
    console.log(`📊 Analysis summary: ${cachedCount} cached, ${analyzedCount} newly analyzed`);
    sendEvent('status', { 
      message: `Analysis complete (${cachedCount} cached, ${analyzedCount} newly analyzed)`, 
      progress: 80 
    });

    sendEvent('status', { message: 'Generating player profile...', progress: 85 });

    // Fetch Chess.com profile for avatar
    let chessComAvatar: string | undefined;
    try {
      const playerProfile = await chessComService.getPlayerProfile(username);
      chessComAvatar = playerProfile.avatar;
    } catch (error) {
      console.log('Could not fetch Chess.com avatar');
    }

    const profile = await recommendationEngine.generatePlayerProfile(username, analyses, chessComAvatar);
    const recommendations = recommendationEngine.generatePersonalizedRecommendations(profile);
    const studyPlan = recommendationEngine.generateStudyPlan(profile, timeAvailable);

    // Get the most recent game's AI summary as representative
    const aiSummary = analyses.length > 0 ? analyses[0].aiSummary : undefined;
    
    // Add gameId to mistake examples if available
    if (aiSummary && aiSummary.mistakeExamples && analyses.length > 0) {
      const gameId = analyses[0].gameId;
      aiSummary.mistakeExamples.forEach(example => {
        if (!example.gameId) {
          example.gameId = gameId;
        }
      });
    }

    console.log('🎨 Avatar in profile:', profile.avatar ? 'Yes' : 'No');
    if (profile.avatar) {
      console.log('   - Archetype:', profile.avatar.archetype);
      console.log('   - Avatar URL:', profile.avatar.generatedAvatarUrl);
      console.log('   - Chess.com icon:', profile.avatar.chessComAvatarIcon ? 'Yes' : 'No');
    }

    sendEvent('result', {
      profile: {
        ...profile,
        lastAnalyzed: profile.lastAnalyzed.toISOString()
      },
      recommendations,
      studyPlan,
      totalGames: analyses.length,
      aiSummary
    });

    sendEvent('status', { message: 'Analysis complete!', progress: 100 });
    res.end();

  } catch (error) {
    console.error('Analysis error:', error);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ message: (error as Error).message })}\n\n`);
    res.end();
  }
});

// Debug endpoint to check all cache stats
app.get('/api/debug/cache', async (req, res) => {
  try {
    const avatarCacheStats = recommendationEngine.getAvatarCacheStats();
    const gamesCacheStats = await chessComService.getCacheStats();
    
    res.json({
      avatar: {
        cacheSize: avatarCacheStats.size,
        entries: avatarCacheStats.entries.slice(0, 10) // Show first 10 entries
      },
      games: gamesCacheStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Debug endpoint to clear avatar cache
app.post('/api/debug/cache/clear', async (req, res) => {
  try {
    const { username, type = 'all' } = req.body;
    
    if (type === 'avatar' || type === 'all') {
      recommendationEngine.clearAvatarCache(username);
    }
    
    if (type === 'games' || type === 'all') {
      await chessComService.clearCache(username);
    }
    
    res.json({
      message: username 
        ? `Cleared ${type} cache for ${username}` 
        : `Cleared all ${type} cache`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

app.listen(port, () => {
  console.log(`🌐 Chess Analyzer Web UI running at http://localhost:${port}`);
  console.log(`📊 Open your browser to start analyzing games!`);
  console.log(`🔧 Debug cache at http://localhost:${port}/api/debug/cache`);
});