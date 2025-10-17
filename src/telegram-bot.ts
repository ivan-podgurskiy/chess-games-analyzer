import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { ChessComService } from './services/ChessComService';
import { AIGameAnalyzer } from './analysis/AIGameAnalyzer';
import { RecommendationEngine } from './services/RecommendationEngine';
import { PgnParser } from './utils/PgnParser';
import { GameAnalysis } from './models/Game';

class TelegramChessBot {
  private bot: TelegramBot;
  private chessComService: ChessComService;
  private aiGameAnalyzer: AIGameAnalyzer;
  private recommendationEngine: RecommendationEngine;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required in environment variables');
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.chessComService = new ChessComService();
    this.aiGameAnalyzer = new AIGameAnalyzer();
    this.recommendationEngine = new RecommendationEngine();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Callback query handler for button clicks
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // Start and help commands
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `🎯 *Chess.com Game Analyzer Bot*

Welcome! I can analyze your Chess.com games and provide personalized improvement recommendations.

*Available Commands:*
/analyze <username> [limit] - Analyze games (default: 2 games)
/help - Show this help message

*Example:*
\`/analyze magnuscarlsen\`
\`/analyze your_username 10\

*Features:*
🧠 AI-powered game analysis
📊 Performance insights
🎯 Personalized recommendations
📚 Study plans
📋 Games list with key insights

Start by analyzing your games with /analyze!`;

      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `*Chess Analyzer Bot Help*

*Commands:*
/analyze <username> [limit] - Analyze Chess.com games
/help - Show this help

*Usage Examples:*
\`/analyze magnuscarlsen\` - Analyze 2 recent games
\`/analyze your_username 10\` - Analyze 10 games
\`/analyze hikaru 5\` - Quick analysis of 5 games

*What you'll get:*
📊 Player profile and statistics
💪 Your strengths
⚠️ Common mistake patterns
🎯 Personalized recommendations
📚 Daily and weekly study plans
📋 List of analyzed games with insights

*Note:* Analysis may take 1-2 minutes for comprehensive results.`;

      this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // Analyze command
    this.bot.onText(/\/analyze (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const input = match![1].trim();
      
      // Parse username and optional limit
      const parts = input.split(' ');
      const username = parts[0];
      const limit = parts[1] ? parseInt(parts[1]) : 2;

      if (!username) {
        this.bot.sendMessage(chatId, '❌ Please provide a username.\nExample: `/analyze magnuscarlsen`', { parse_mode: 'Markdown' });
        return;
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        this.bot.sendMessage(chatId, '❌ Limit must be a number between 1 and 100.\nExample: `/analyze magnuscarlsen 50`', { parse_mode: 'Markdown' });
        return;
      }

      await this.analyzeGames(chatId, username, limit);
    });

    // Handle any other text
    this.bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (text && !text.startsWith('/')) {
        this.bot.sendMessage(chatId, '🤔 I didn\'t understand that. Use /help to see available commands.');
      }
    });
  }

  private async analyzeGames(chatId: number, username: string, limit: number): Promise<void> {
    try {
      // Initialize AI analyzer
      await this.aiGameAnalyzer.initialize();

      // Send initial status
      let statusMsg = await this.bot.sendMessage(chatId, `🔍 *Analyzing ${username}* (${limit} games)\n\n⏳ Fetching games from Chess.com...`, { parse_mode: 'Markdown' });

      // Fetch games
      const rawGames = await this.chessComService.getAllPlayerGames(username, limit);

      if (rawGames.length === 0) {
        await this.bot.editMessageText('❌ No games found for this user. Please check the username.', { 
          chat_id: chatId, 
          message_id: statusMsg.message_id 
        });
        return;
      }

      // Update status
      await this.bot.editMessageText(`🔍 *Analyzing ${username}* (${rawGames.length} games)\n\n🧠 Analyzing games with Claude AI...`, { 
        chat_id: chatId, 
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      });

      // Analyze games
      const analyses: GameAnalysis[] = [];
      const games: any[] = [];
      for (let i = 0; i < rawGames.length; i++) {
        try {
          const game = PgnParser.parseChessComGame(rawGames[i]);
          const analysis = await this.aiGameAnalyzer.analyzeGame(game, username);
          analyses.push(analysis);
          games.push(game);

          // Update progress every 5 games
          if ((i + 1) % 5 === 0 || i === rawGames.length - 1) {
            const progress = Math.round(((i + 1) / rawGames.length) * 100);
            await this.bot.editMessageText(`🔍 *Analyzing ${username}* (${rawGames.length} games)\n\n🧠 Analyzing games with Claude AI...\n📊 Progress: ${progress}%`, { 
              chat_id: chatId, 
              message_id: statusMsg.message_id,
              parse_mode: 'Markdown'
            });
          }
        } catch (error) {
          console.warn(`Skipping game ${i + 1}:`, error);
        }
      }

      // Update status
      await this.bot.editMessageText(`🔍 *Analyzing ${username}* (${rawGames.length} games)\n\n📊 Generating player profile...`, { 
        chat_id: chatId, 
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      });

      // Generate profile and recommendations
      const profile = await this.recommendationEngine.generatePlayerProfile(username, analyses);
      const recommendations = this.recommendationEngine.generatePersonalizedRecommendations(profile);
      const studyPlan = this.recommendationEngine.generateStudyPlan(profile, 30);

      // Get AI summary from most recent game
      const aiSummary = analyses.length > 0 ? analyses[0].aiSummary : undefined;

      // Clean up analyzer
      await this.aiGameAnalyzer.close();

      // Send results
      await this.sendAnalysisResults(chatId, profile, recommendations, studyPlan, analyses, games, aiSummary);

    } catch (error) {
      console.error('Analysis error:', error);
      await this.bot.sendMessage(chatId, `❌ Analysis failed: ${(error as Error).message}`);
    }
  }

  private async sendAnalysisResults(
    chatId: number, 
    profile: any, 
    recommendations: string[], 
    studyPlan: any, 
    analyses: GameAnalysis[], 
    games: any[],
    aiSummary?: any
  ): Promise<void> {
    // Message 1: Profile and Statistics
    const profileMessage = this.formatProfileMessage(profile, analyses.length);
    await this.bot.sendMessage(chatId, profileMessage, { parse_mode: 'Markdown' });

    // Message 2: Strengths and Mistake Patterns
    const patternsMessage = this.formatPatternsMessage(profile);
    if (patternsMessage.length > 0) {
      await this.bot.sendMessage(chatId, patternsMessage, { parse_mode: 'Markdown' });
    }

    // Message 3: Recommendations and Study Plan
    const recommendationsMessage = this.formatRecommendationsMessage(recommendations, studyPlan);
    await this.bot.sendMessage(chatId, recommendationsMessage, { parse_mode: 'Markdown' });

    // Message 4: Games List
    const gamesMessage = this.formatGamesMessage(analyses, games);
    if (gamesMessage.length > 0) {
      await this.bot.sendMessage(chatId, gamesMessage, { parse_mode: 'Markdown' });
    }

    // Message 5: AI Summary (if available)
    if (aiSummary) {
      const aiMessage = this.formatAISummaryMessage(aiSummary);
      await this.bot.sendMessage(chatId, aiMessage, { parse_mode: 'Markdown' });
    }

    // Message 6: Interactive Action Buttons
    await this.sendInteractiveButtons(chatId);
  }

  private async sendInteractiveButtons(chatId: number): Promise<void> {
    const message = '🎯 *What would you like to do next?*\n\nChoose an option below:';
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📚 Opening Analysis', callback_data: 'depth_opening' },
          { text: '🎮 Middlegame', callback_data: 'depth_middlegame' }
        ],
        [
          { text: '♟️ Endgame Technique', callback_data: 'depth_endgame' },
          { text: '⚡ Tactics Training', callback_data: 'depth_tactics' }
        ],
        [
          { text: '🧮 Focus: Calculation', callback_data: 'focus_calculation' },
          { text: '🎯 Focus: Strategy', callback_data: 'focus_strategy' }
        ],
        [
          { text: '⏱️ Time Management', callback_data: 'focus_time' },
          { text: '🧠 Mental Game', callback_data: 'focus_psychology' }
        ],
        [
          { text: '⭐⭐⭐⭐⭐', callback_data: 'rating_5' },
          { text: '⭐⭐⭐⭐', callback_data: 'rating_4' },
          { text: '⭐⭐⭐', callback_data: 'rating_3' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  private formatProfileMessage(profile: any, totalGames: number): string {
    const winRate = (profile.winRate * 100).toFixed(1);
    const accuracy = profile.averageAccuracy.toFixed(1);

    return `📊 *PLAYER PROFILE*

👤 *Username:* ${profile.username}
🎮 *Games Analyzed:* ${totalGames}
📈 *Win Rate:* ${winRate}%
🎯 *Average Accuracy:* ${accuracy}%

📊 *Performance Stats:*
• Blunders: ${profile.blunders || 0}
• Mistakes: ${profile.mistakes || 0}
• Inaccuracies: ${profile.inaccuracies || 0}`;
  }

  private formatPatternsMessage(profile: any): string {
    let message = '';

    if (profile.strengths && profile.strengths.length > 0) {
      message += `💪 *STRENGTHS*\n`;
      profile.strengths.forEach((strength: string) => {
        message += `✅ ${strength}\n`;
      });
      message += '\n';
    }

    if (profile.mistakePatterns && profile.mistakePatterns.length > 0) {
      message += `⚠️ *COMMON MISTAKE PATTERNS*\n`;
      profile.mistakePatterns.slice(0, 3).forEach((pattern: any) => {
        const severity = pattern.severity === 'major' ? '🔴' :
                        pattern.severity === 'moderate' ? '🟡' : '🟢';
        message += `${severity} ${pattern.description} (${pattern.frequency} games)\n`;
      });
    }

    return message;
  }

  private formatRecommendationsMessage(recommendations: string[], studyPlan: any): string {
    let message = '';

    if (recommendations.length > 0) {
      message += `🎯 *PERSONALIZED RECOMMENDATIONS*\n`;
      recommendations.forEach(rec => {
        message += `• ${rec}\n`;
      });
      message += '\n';
    }

    if (studyPlan.daily && studyPlan.daily.length > 0) {
      message += `📚 *DAILY STUDY PLAN*\n`;
      studyPlan.daily.forEach((item: string) => {
        message += `📅 ${item}\n`;
      });
      message += '\n';
    }

    if (studyPlan.weekly && studyPlan.weekly.length > 0) {
      message += `📅 *WEEKLY GOALS*\n`;
      studyPlan.weekly.forEach((item: string) => {
        message += `🗓️ ${item}\n`;
      });
    }

    return message;
  }

  private formatGamesMessage(analyses: GameAnalysis[], games: any[]): string {
    if (analyses.length === 0) return '';

    let message = `📋 *ANALYZED GAMES*\n\n`;

    // Show recent 5 games
    const recentGames = analyses.slice(0, 5);
    
    recentGames.forEach((analysis, index) => {
      const game = games[index];
      const result = this.getGameResult(game, analysis.playerColor);
      const color = analysis.playerColor === 'white' ? 'White' : 'Black';
      const accuracy = analysis.overallAccuracy.toFixed(1);
      
      const blunders = analysis.moves.filter(m => m.classification === 'blunder').length;
      const mistakes = analysis.moves.filter(m => m.classification === 'mistake').length;
      const inaccuracies = analysis.moves.filter(m => m.classification === 'inaccuracy').length;

      message += `*Game ${index + 1}:* ${result} as ${color}\n`;
      message += `📊 Accuracy: ${accuracy}%\n`;
      message += `⚠️ Mistakes: ${blunders} blunders, ${mistakes} mistakes, ${inaccuracies} inaccuracies\n`;
      
      if (game.url) {
        message += `🔗 [View on Chess.com](${game.url})\n`;
      }
      
      message += '\n';
    });

    if (analyses.length > 5) {
      message += `_... and ${analyses.length - 5} more games_\n`;
    }

    return message;
  }

  private formatAISummaryMessage(aiSummary: any): string {
    if (!aiSummary) return '';

    let message = `🧠 *AI INSIGHTS*\n\n`;
    
    if (aiSummary.gameOverview) {
      message += `📝 *Game Overview:*\n${aiSummary.gameOverview}\n\n`;
    }

    if (aiSummary.keyMoments && aiSummary.keyMoments.length > 0) {
      message += `🎯 *Key Moments:*\n`;
      aiSummary.keyMoments.forEach((moment: string) => {
        message += `• ${moment}\n`;
      });
      message += '\n';
    }

    if (aiSummary.coachingAdvice) {
      message += `💡 *Coaching Advice:*\n${aiSummary.coachingAdvice}\n`;
    }

    return message;
  }

  private getGameResult(game: any, playerColor: string): string {
    const isWhite = playerColor === 'white';
    const result = isWhite ? game.white.result : game.black.result;
    
    switch (result) {
      case 'win': return '✅ Win';
      case 'lose': return '❌ Loss';
      case 'checkmated': return '❌ Loss (Checkmated)';
      case 'timeout': return '❌ Loss (Timeout)';
      case 'resigned': return '❌ Loss (Resigned)';
      case 'abandoned': return '❌ Loss (Abandoned)';
      case 'draw': return '⚖️ Draw';
      default: return '❓ Unknown';
    }
  }

  private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    const data = callbackQuery.data;

    if (!chatId || !data) return;

    try {
      // Parse the callback data (format: "action_value")
      const [action, value] = data.split('_');

      switch (action) {
        case 'rating':
          // Handle rating feedback
          await this.handleRatingFeedback(chatId, messageId!, value, callbackQuery.id);
          break;

        case 'depth':
          // Handle deep dive request
          await this.handleDeepDiveRequest(chatId, value, callbackQuery.id);
          break;

        case 'focus':
          // Handle focus area selection
          await this.handleFocusAreaSelection(chatId, value, callbackQuery.id);
          break;

        default:
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: '❓ Unknown action'
          });
      }
    } catch (error) {
      console.error('Callback query error:', error);
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Error processing your request'
      });
    }
  }

  private async handleRatingFeedback(
    chatId: number,
    messageId: number,
    rating: string,
    queryId: string
  ): Promise<void> {
    const ratingEmojis: { [key: string]: string } = {
      '5': '⭐⭐⭐⭐⭐',
      '4': '⭐⭐⭐⭐',
      '3': '⭐⭐⭐',
      '2': '⭐⭐',
      '1': '⭐'
    };

    // Show confirmation to user
    await this.bot.answerCallbackQuery(queryId, {
      text: `Thanks for your feedback: ${ratingEmojis[rating]}!`
    });

    // Update the message to show the rating was received
    try {
      await this.bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: messageId }
      );
    } catch (error) {
      console.warn('Could not update message markup:', error);
    }

    // Log the rating (you can store this in a database)
    console.log(`User ${chatId} rated analysis: ${rating}/5`);
  }

  private async handleDeepDiveRequest(
    chatId: number,
    topic: string,
    queryId: string
  ): Promise<void> {
    const topicNames: { [key: string]: string } = {
      'opening': 'Opening Analysis',
      'middlegame': 'Middlegame Strategy',
      'endgame': 'Endgame Technique',
      'tactics': 'Tactical Patterns'
    };

    await this.bot.answerCallbackQuery(queryId, {
      text: `📚 Analyzing ${topicNames[topic]}...`
    });

    // Send detailed analysis for the selected topic
    const detailMessage = `🎯 *Deep Dive: ${topicNames[topic]}*\n\n` +
      `_This feature will provide detailed insights about ${topicNames[topic].toLowerCase()}._\n\n` +
      `Coming soon! This will include:\n` +
      `• Specific moves analysis\n` +
      `• Pattern recognition\n` +
      `• Recommended resources\n` +
      `• Practice exercises`;

    await this.bot.sendMessage(chatId, detailMessage, { parse_mode: 'Markdown' });
  }

  private async handleFocusAreaSelection(
    chatId: number,
    area: string,
    queryId: string
  ): Promise<void> {
    const areaNames: { [key: string]: string } = {
      'calculation': 'Calculation & Tactics',
      'strategy': 'Strategic Planning',
      'time': 'Time Management',
      'psychology': 'Mental Game'
    };

    await this.bot.answerCallbackQuery(queryId, {
      text: `✅ Focus area selected: ${areaNames[area]}`
    });

    // Generate focused recommendations
    const focusMessage = `🎯 *Focus Area: ${areaNames[area]}*\n\n` +
      `Based on your selection, here are specific recommendations:\n\n` +
      `📚 *Study Resources:*\n` +
      `• Interactive chess.com lessons\n` +
      `• Recommended books and videos\n` +
      `• Puzzle rush focused on ${areaNames[area].toLowerCase()}\n\n` +
      `🎮 *Practice Plan:*\n` +
      `• Daily: 15 minutes of targeted practice\n` +
      `• Weekly: Review 3 master games\n` +
      `• Monthly: Track improvement metrics`;

    await this.bot.sendMessage(chatId, focusMessage, { parse_mode: 'Markdown' });
  }

  public start(): void {
    console.log('🤖 Chess Analyzer Telegram Bot started');
    console.log('📱 Bot is ready to receive commands');
  }
}

// Start the bot
const bot = new TelegramChessBot();
bot.start();
