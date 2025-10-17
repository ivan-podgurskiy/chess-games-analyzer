import { GameAnalysis } from '../models/Game'
import { PlayerProfile, ImprovementArea, MistakePattern } from '../models/Analysis'
import { PatternDetector } from '../analysis/PatternDetector'
import { AvatarGenerator } from './AvatarGenerator'

export class RecommendationEngine {
  private patternDetector: PatternDetector;
  private avatarGenerator: AvatarGenerator;

  constructor() {
    this.patternDetector = new PatternDetector();
    this.avatarGenerator = new AvatarGenerator();
  }

  async generatePlayerProfile(username: string, analyses: GameAnalysis[], chessComAvatar?: string): Promise<PlayerProfile> {
    const totalGames = analyses.length;
    if (totalGames === 0) {
      return this.createEmptyProfile(username);
    }

    const winRate = this.calculateWinRate(analyses);
    const averageAccuracy = this.calculateAverageAccuracy(analyses);
    const timeClassStats = this.calculateTimeClassStats(analyses);
    const mistakePatterns = this.patternDetector.detectPatterns(analyses);
    const improvementAreas = this.patternDetector.generateImprovementAreas(mistakePatterns, {} as PlayerProfile);
    const strengths = this.identifyStrengths(analyses);
    const weaknesses = this.identifyWeaknesses(mistakePatterns);

    // Calculate error statistics
    const blunders = analyses.reduce((sum, a) =>
      sum + a.moves.filter(m => m.classification === 'blunder').length, 0
    );
    const mistakes = analyses.reduce((sum, a) =>
      sum + a.moves.filter(m => m.classification === 'mistake').length, 0
    );
    const inaccuracies = analyses.reduce((sum, a) =>
      sum + a.moves.filter(m => m.classification === 'inaccuracy').length, 0
    );

    // Generate player avatar (async now with OpenAI support)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const avatar = await this.avatarGenerator.generatePlayerAvatar(
      username,
      averageAccuracy,
      blunders,
      mistakes,
      inaccuracies,
      strengths,
      weaknesses,
      mistakePatterns,
      chessComAvatar,
      openaiApiKey
    );

    return {
      username,
      totalGames,
      winRate,
      averageRating: this.calculateAverageRating(analyses),
      timeClassStats,
      mistakePatterns,
      improvementAreas,
      strengths,
      weaknesses,
      averageAccuracy,
      lastAnalyzed: new Date(),
      avatar
    };
  }

  generatePersonalizedRecommendations(profile: PlayerProfile): string[] {
    const recommendations: string[] = [];

    const criticalAreas = profile.improvementAreas.filter(area => area.priority === 'high');
    if (criticalAreas.length > 0) {
      recommendations.push(`🚨 Priority Focus: ${criticalAreas[0].category}`);
      recommendations.push(...criticalAreas[0].actionItems.slice(0, 2));
    }

    if (profile.averageAccuracy < 75) {
      recommendations.push('🎯 Accuracy Goal: Aim for 80%+ accuracy by slowing down critical moves');
      recommendations.push('⏰ Take 30+ seconds on tactical positions');
    }

    const tacticalIssues = profile.mistakePatterns.find(p => p.type === 'tactical');
    if (tacticalIssues && tacticalIssues.severity === 'major') {
      recommendations.push('⚔️  Tactical Emergency: Solve 20+ puzzles daily for 2 weeks');
      recommendations.push('📚 Study: Basic tactical patterns (pins, forks, skewers)');
    }

    const endgameIssues = profile.mistakePatterns.find(p => p.type === 'endgame');
    if (endgameIssues) {
      recommendations.push('👑 Endgame Focus: Learn basic checkmate patterns');
      recommendations.push('🏁 Practice: King + Queen vs King, King + Rook vs King');
    }

    const openingIssues = profile.mistakePatterns.find(p => p.type === 'opening');
    if (openingIssues && openingIssues.frequency > profile.totalGames / 3) {
      recommendations.push('🏛️  Opening Stability: Choose 1-2 openings and stick to them');
      recommendations.push('📖 Learn: Opening principles before specific variations');
    }

    if (profile.winRate < 0.4) {
      recommendations.push('🔄 Defensive Play: Focus on solid, safe moves over aggressive attacks');
      recommendations.push('🛡️  Principle: Trade pieces when ahead, avoid them when behind');
    }

    this.addTimeControlSpecificAdvice(profile, recommendations);
    this.addStrengthBasedAdvice(profile.strengths, recommendations);

    if (recommendations.length === 0) {
      recommendations.push('🌟 Excellent progress! Continue current training routine');
      recommendations.push('📈 Consider gradually increasing game complexity');
    }

    return recommendations.slice(0, 8);
  }

  generateStudyPlan(profile: PlayerProfile, timeAvailable: number): {
    daily: string[];
    weekly: string[];
    monthly: string[];
  } {
    const dailyMinutes = Math.min(timeAvailable, 60);
    const plan = {
      daily: [] as string[],
      weekly: [] as string[],
      monthly: [] as string[]
    };

    const topPriorityArea = profile.improvementAreas.find(area => area.priority === 'high');

    if (topPriorityArea) {
      switch (topPriorityArea.category) {
        case 'Tactical Skills':
          plan.daily.push(`${Math.floor(dailyMinutes * 0.5)}min: Tactical puzzles`);
          plan.daily.push(`${Math.floor(dailyMinutes * 0.3)}min: Pattern recognition`);
          break;
        case 'Endgame Technique':
          plan.daily.push(`${Math.floor(dailyMinutes * 0.4)}min: Basic endgame positions`);
          plan.daily.push(`${Math.floor(dailyMinutes * 0.3)}min: Endgame puzzles`);
          break;
        case 'Opening Knowledge':
          plan.daily.push(`${Math.floor(dailyMinutes * 0.4)}min: Opening study`);
          plan.daily.push(`${Math.floor(dailyMinutes * 0.2)}min: Opening principles review`);
          break;
      }
    }

    plan.daily.push(`${Math.floor(dailyMinutes * 0.2)}min: Game analysis review`);

    plan.weekly = [
      'Analyze 2-3 of your recent games thoroughly',
      'Play practice games in your weakest time control',
      'Review one master game in your opening',
      'Take a themed tactical test (pins, forks, etc.)'
    ];

    plan.monthly = [
      'Complete a comprehensive self-assessment',
      'Update your opening repertoire based on recent games',
      'Set new rating and accuracy goals',
      'Review and adjust your training plan'
    ];

    return plan;
  }

  private createEmptyProfile(username: string): PlayerProfile {
    return {
      username,
      totalGames: 0,
      winRate: 0,
      averageRating: 0,
      averageAccuracy: 0,
      timeClassStats: {},
      mistakePatterns: [],
      improvementAreas: [],
      strengths: [],
      weaknesses: [],
      lastAnalyzed: new Date()
    };
  }

  private calculateWinRate(analyses: GameAnalysis[]): number {
    const wins = analyses.filter(analysis => {
      return analysis.playerColor === 'white' ?
        analysis.moves[analysis.moves.length - 1]?.isWhiteMove :
        !analysis.moves[analysis.moves.length - 1]?.isWhiteMove;
    }).length;
    return wins / analyses.length;
  }

  private calculateAverageAccuracy(analyses: GameAnalysis[]): number {
    const totalAccuracy = analyses.reduce((sum, analysis) => sum + analysis.overallAccuracy, 0);
    return totalAccuracy / analyses.length;
  }

  private calculateAverageRating(analyses: GameAnalysis[]): number {
    return 1500;
  }

  private calculateTimeClassStats(analyses: GameAnalysis[]) {
    const stats: { [key: string]: any } = {};

    analyses.forEach(analysis => {
      const timeClass = 'blitz';
      if (!stats[timeClass]) {
        stats[timeClass] = {
          games: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          averageAccuracy: 0
        };
      }

      stats[timeClass].games++;
      stats[timeClass].averageAccuracy += analysis.overallAccuracy;
    });

    Object.keys(stats).forEach(timeClass => {
      stats[timeClass].averageAccuracy /= stats[timeClass].games;
    });

    return stats;
  }

  private identifyStrengths(analyses: GameAnalysis[]): string[] {
    const strengths: string[] = [];

    const averageAccuracy = this.calculateAverageAccuracy(analyses);
    
    // More generous accuracy thresholds
    if (averageAccuracy > 70) {
      strengths.push('Decent move accuracy');
    }
    if (averageAccuracy > 80) {
      strengths.push('Good move accuracy');
    }
    if (averageAccuracy > 85) {
      strengths.push('High move accuracy');
    }

    // Opening analysis
    const openingAccuracy = analyses.map(analysis => {
      const openingMoves = analysis.moves.slice(0, 15).filter(move => move.classification);
      const goodMoves = openingMoves.filter(move =>
        move.classification && ['excellent', 'good'].includes(move.classification)
      ).length;
      return openingMoves.length > 0 ? goodMoves / openingMoves.length : 0;
    }).reduce((a, b) => a + b, 0) / analyses.length;

    if (openingAccuracy > 0.6) {
      strengths.push('Reasonable opening play');
    }
    if (openingAccuracy > 0.8) {
      strengths.push('Solid opening play');
    }

    // Blunder analysis
    const totalBlunders = analyses.reduce((sum, analysis) => 
      sum + analysis.moves.filter(move => move.classification === 'blunder').length, 0
    );
    const avgBlundersPerGame = totalBlunders / analyses.length;

    if (avgBlundersPerGame <= 2) {
      strengths.push('Generally avoids major blunders');
    }
    if (avgBlundersPerGame <= 1) {
      strengths.push('Avoids major blunders');
    }

    // Endgame analysis
    const endgameAccuracy = analyses.map(analysis => {
      const endgameMoves = analysis.moves.slice(-10).filter(move => move.classification);
      const goodMoves = endgameMoves.filter(move =>
        move.classification && ['excellent', 'good'].includes(move.classification)
      ).length;
      return endgameMoves.length > 0 ? goodMoves / endgameMoves.length : 0;
    }).reduce((a, b) => a + b, 0) / analyses.length;

    if (endgameAccuracy > 0.7) {
      strengths.push('Decent endgame technique');
    }

    // Time control performance - check if we have varied game types
    const gameTypes = new Set(analyses.map(a => a.openingName || 'unknown'));
    if (gameTypes.size > 3) {
      strengths.push('Varied opening repertoire');
    }

    // Ensure we always have some strengths
    if (strengths.length === 0) {
      strengths.push('Consistent game participation');
      if (averageAccuracy > 50) {
        strengths.push('Basic chess understanding');
      }
    }

    return strengths;
  }

  private identifyWeaknesses(patterns: MistakePattern[]): string[] {
    return patterns
      .filter(pattern => pattern.severity !== 'minor')
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3)
      .map(pattern => pattern.description);
  }

  private addTimeControlSpecificAdvice(profile: PlayerProfile, recommendations: string[]): void {
    const bulletStats = profile.timeClassStats['bullet'];
    const blitzStats = profile.timeClassStats['blitz'];
    const rapidStats = profile.timeClassStats['rapid'];

    if (bulletStats && bulletStats.averageAccuracy < 70) {
      recommendations.push('🏃‍♂️ Bullet: Focus on pattern recognition over calculation');
    }

    if (blitzStats && blitzStats.averageAccuracy < 75) {
      recommendations.push('⚡ Blitz: Practice quick tactical solutions');
    }

    if (rapidStats && rapidStats.averageAccuracy > 85) {
      recommendations.push('🐌 Rapid: Your strength! Use this format to practice new ideas');
    }
  }

  private addStrengthBasedAdvice(strengths: string[], recommendations: string[]): void {
    if (strengths.includes('High move accuracy')) {
      recommendations.push('💪 Leverage your accuracy by playing longer time controls');
    }

    if (strengths.includes('Solid opening play')) {
      recommendations.push('🎯 Build on your opening knowledge with middlegame plans');
    }

    if (strengths.includes('Avoids major blunders')) {
      recommendations.push('🔥 Your solid play can frustrate opponents - be patient');
    }
  }

  getAvatarCacheStats() {
    return this.avatarGenerator.getCacheStats();
  }

  clearAvatarCache(username?: string) {
    this.avatarGenerator.clearCache(username);
  }
}