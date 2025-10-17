#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ChessComService } from './services/ChessComService'
import { AIGameAnalyzer } from './analysis/AIGameAnalyzer'
import { RecommendationEngine } from './services/RecommendationEngine'
import { PgnParser } from './utils/PgnParser'

const program = new Command();

program
  .name('chess-analyzer')
  .description('AI agent to analyze Chess.com games and provide improvement recommendations')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze games for a Chess.com user')
  .argument('<username>', 'Chess.com username')
  .option('-l, --limit <number>', 'Limit number of games to analyze', '50')
  .option('-t, --time <minutes>', 'Available study time per day', '30')
  .action(async (username: string, options) => {
    const limit = parseInt(options.limit);
    const timeAvailable = parseInt(options.time);

    console.log(chalk.blue(`🏁 Chess.com Game Analyzer for ${username}`));
    console.log(chalk.gray(`Analyzing last ${limit} games...\n`));

    try {
      const spinner = ora('Fetching games from Chess.com...').start();

      const chessComService = new ChessComService();
      const rawGames = await chessComService.getAllPlayerGames(username, limit);

      if (rawGames.length === 0) {
        spinner.fail('No games found for this user');
        return;
      }

      spinner.succeed(`Found ${rawGames.length} games`);

      const initSpinner = ora('Initializing Claude AI analyzer...').start();
      const gameAnalyzer = new AIGameAnalyzer();
      await gameAnalyzer.initialize();
      initSpinner.succeed('Claude AI analyzer ready');

      const analyzeSpinner = ora('Analyzing games with Claude AI...').start();
      const recommendationEngine = new RecommendationEngine();
      const analyses = [];

      for (let i = 0; i < rawGames.length; i++) {
        analyzeSpinner.text = `Analyzing game ${i + 1}/${rawGames.length} with Claude AI...`;

        try {
          const game = PgnParser.parseChessComGame(rawGames[i]);
          const analysis = await gameAnalyzer.analyzeGame(game, username);
          analyses.push(analysis);
        } catch (error) {
          console.warn(`Skipping game ${i + 1}: ${error}`);
        }
      }

      analyzeSpinner.succeed(`Analyzed ${analyses.length} games with Claude AI`);

      // Clean up analyzer
      await gameAnalyzer.close();

      const profileSpinner = ora('Generating player profile...').start();
      const profile = await recommendationEngine.generatePlayerProfile(username, analyses);
      profileSpinner.succeed('Profile generated');

      console.log(chalk.blue('\n📊 PLAYER PROFILE'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`👤 Username: ${chalk.white(profile.username)}`);
      console.log(`🎮 Games Analyzed: ${chalk.white(profile.totalGames)}`);
      console.log(`📈 Win Rate: ${chalk.white((profile.winRate * 100).toFixed(1))}%`);
      console.log(`🎯 Average Accuracy: ${chalk.white(profile.averageAccuracy.toFixed(1))}%`);

      if (profile.strengths.length > 0) {
        console.log(chalk.green('\n💪 STRENGTHS'));
        profile.strengths.forEach(strength => {
          console.log(chalk.green(`  ✓ ${strength}`));
        });
      }

      if (profile.mistakePatterns.length > 0) {
        console.log(chalk.red('\n⚠️  COMMON MISTAKE PATTERNS'));
        profile.mistakePatterns.slice(0, 3).forEach(pattern => {
          const severity = pattern.severity === 'major' ? '🔴' :
                          pattern.severity === 'moderate' ? '🟡' : '🟢';
          console.log(`  ${severity} ${pattern.description} (${pattern.frequency} games)`);
        });
      }

      const recommendations = recommendationEngine.generatePersonalizedRecommendations(profile);
      if (recommendations.length > 0) {
        console.log(chalk.blue('\n🎯 PERSONALIZED RECOMMENDATIONS'));
        console.log(chalk.gray('─'.repeat(50)));
        recommendations.forEach(rec => {
          console.log(`  ${rec}`);
        });
      }

      const studyPlan = recommendationEngine.generateStudyPlan(profile, timeAvailable);
      console.log(chalk.blue('\n📚 DAILY STUDY PLAN'));
      console.log(chalk.gray('─'.repeat(50)));
      studyPlan.daily.forEach(item => {
        console.log(`  📅 ${item}`);
      });

      console.log(chalk.blue('\n📅 WEEKLY GOALS'));
      console.log(chalk.gray('─'.repeat(50)));
      studyPlan.weekly.forEach(item => {
        console.log(`  🗓️  ${item}`);
      });

      if (profile.improvementAreas.length > 0) {
        console.log(chalk.blue('\n🎓 STUDY RESOURCES'));
        console.log(chalk.gray('─'.repeat(50)));
        const topArea = profile.improvementAreas[0];
        console.log(chalk.yellow(`${topArea.category}:`));
        topArea.studyResources.slice(0, 3).forEach(resource => {
          console.log(`  📖 ${resource}`);
        });
      }

      console.log(chalk.green('\n✅ Analysis complete! Good luck with your chess improvement! 🚀'));

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error);
      process.exit(1);
    }
  });

program
  .command('quick')
  .description('Quick analysis of recent games')
  .argument('<username>', 'Chess.com username')
  .action(async (username: string) => {
    console.log(chalk.blue(`⚡ Quick Analysis for ${username}`));

    try {
      const spinner = ora('Fetching recent games...').start();

      const chessComService = new ChessComService();
      const rawGames = await chessComService.getAllPlayerGames(username, 10);

      if (rawGames.length === 0) {
        spinner.fail('No recent games found');
        return;
      }

      spinner.text = 'Initializing Claude AI analyzer...';
      const gameAnalyzer = new AIGameAnalyzer();
      await gameAnalyzer.initialize();

      spinner.text = 'Analyzing with Claude AI...';
      const analyses = [];

      for (const rawGame of rawGames) {
        try {
          const game = PgnParser.parseChessComGame(rawGame);
          const analysis = await gameAnalyzer.analyzeGame(game, username);
          analyses.push(analysis);
        } catch (error) {
          continue;
        }
      }

      spinner.succeed(`Analyzed ${analyses.length} recent games with Claude AI`);

      // Clean up analyzer
      await gameAnalyzer.close();

      const avgAccuracy = analyses.reduce((sum, a) => sum + a.overallAccuracy, 0) / analyses.length;
      const blunders = analyses.reduce((sum, a) =>
        sum + a.moves.filter(m => m.classification === 'blunder').length, 0
      );

      console.log(chalk.white(`\n📊 Recent Performance:`));
      console.log(`🎯 Average Accuracy: ${chalk.white(avgAccuracy.toFixed(1))}%`);
      console.log(`⚠️  Total Blunders: ${chalk.red(blunders)}`);

      if (blunders > 3) {
        console.log(chalk.yellow('\n💡 Quick Tip: Focus on tactical training to reduce blunders!'));
      } else {
        console.log(chalk.green('\n✨ Good job avoiding blunders! Keep it up!'));
      }

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error);
    }
  });

program.parse();