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

    const analyses = [];
    for (let i = 0; i < rawGames.length; i++) {
      try {
        const game = PgnParser.parseChessComGame(rawGames[i]);
        const analysis = await aiGameAnalyzer.analyzeGame(game, username);
        analyses.push(analysis);

        const progress = 30 + Math.floor((i / rawGames.length) * 50);
        sendEvent('status', {
          message: `Analyzing game ${i + 1}/${rawGames.length}...`,
          progress
        });
      } catch (error) {
        console.warn(`Skipping game ${i + 1}:`, error);
      }
    }

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

// Debug endpoint to check avatar cache stats
app.get('/api/debug/cache', (req, res) => {
  try {
    const cacheStats = recommendationEngine.getAvatarCacheStats();
    res.json({
      cacheSize: cacheStats.size,
      entries: cacheStats.entries.slice(0, 10), // Show first 10 entries
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

app.listen(port, () => {
  console.log(`🌐 Chess Analyzer Web UI running at http://localhost:${port}`);
  console.log(`📊 Open your browser to start analyzing games!`);
  console.log(`🔧 Debug cache at http://localhost:${port}/api/debug/cache`);
});