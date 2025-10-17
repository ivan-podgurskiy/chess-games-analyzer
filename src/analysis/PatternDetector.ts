import { GameAnalysis } from '../models/Game'
import { MistakePattern, ImprovementArea, PlayerProfile } from '../models/Analysis'

export class PatternDetector {
  detectPatterns(analyses: GameAnalysis[]): MistakePattern[] {
    const patterns: MistakePattern[] = [];

    patterns.push(...this.detectTacticalPatterns(analyses));
    patterns.push(...this.detectPositionalPatterns(analyses));
    patterns.push(...this.detectOpeningPatterns(analyses));
    patterns.push(...this.detectEndgamePatterns(analyses));
    patterns.push(...this.detectTimeManagementPatterns(analyses));

    return patterns.filter(pattern => pattern.frequency >= 2);
  }

  private detectTacticalPatterns(analyses: GameAnalysis[]): MistakePattern[] {
    const patterns: MistakePattern[] = [];

    const blunderGames = analyses.filter(analysis =>
      analysis.moves.some(move => move.classification === 'blunder')
    );

    if (blunderGames.length >= 2) {
      patterns.push({
        type: 'tactical',
        description: 'Frequent tactical blunders losing material',
        frequency: blunderGames.length,
        severity: blunderGames.length > analyses.length / 2 ? 'major' : 'moderate',
        examples: blunderGames.slice(0, 3).map(analysis => {
          const blunder = analysis.moves.find(move => move.classification === 'blunder')!;
          return {
            gameId: analysis.gameId,
            moveNumber: blunder.moveNumber,
            position: blunder.fen,
            explanation: `Tactical blunder: ${blunder.san}. Better was ${blunder.bestMove || 'alternative move'}`
          };
        })
      });
    }

    const mateInOneIssues = this.detectMissedMateInOne(analyses);
    if (mateInOneIssues.length >= 2) {
      patterns.push({
        type: 'tactical',
        description: 'Missing mate in one opportunities',
        frequency: mateInOneIssues.length,
        severity: 'moderate',
        examples: mateInOneIssues.slice(0, 3)
      });
    }

    return patterns;
  }

  private detectPositionalPatterns(analyses: GameAnalysis[]): MistakePattern[] {
    const patterns: MistakePattern[] = [];

    const weakSquareIssues = this.detectWeakSquarePatterns(analyses);
    if (weakSquareIssues.length >= 2) {
      patterns.push({
        type: 'positional',
        description: 'Creating weak squares in own position',
        frequency: weakSquareIssues.length,
        severity: 'moderate',
        examples: weakSquareIssues.slice(0, 3)
      });
    }

    const pawnStructureIssues = this.detectPawnStructurePatterns(analyses);
    if (pawnStructureIssues.length >= 2) {
      patterns.push({
        type: 'positional',
        description: 'Poor pawn structure decisions',
        frequency: pawnStructureIssues.length,
        severity: 'moderate',
        examples: pawnStructureIssues.slice(0, 3)
      });
    }

    return patterns;
  }

  private detectOpeningPatterns(analyses: GameAnalysis[]): MistakePattern[] {
    const patterns: MistakePattern[] = [];

    const openingMistakes = analyses.map(analysis => {
      const earlyMistakes = analysis.moves.slice(0, 15).filter(move =>
        move.classification && ['mistake', 'blunder'].includes(move.classification)
      );
      return { analysis, mistakes: earlyMistakes };
    }).filter(item => item.mistakes.length > 0);

    if (openingMistakes.length >= 2) {
      patterns.push({
        type: 'opening',
        description: 'Consistent opening mistakes',
        frequency: openingMistakes.length,
        severity: openingMistakes.length > analyses.length / 2 ? 'major' : 'moderate',
        examples: openingMistakes.slice(0, 3).map(item => ({
          gameId: item.analysis.gameId,
          moveNumber: item.mistakes[0].moveNumber,
          position: item.mistakes[0].fen,
          explanation: `Opening mistake: ${item.mistakes[0].san} in ${item.analysis.openingName || 'unknown opening'}`
        }))
      });
    }

    const centerControlIssues = this.detectCenterControlPatterns(analyses);
    if (centerControlIssues.length >= 2) {
      patterns.push({
        type: 'opening',
        description: 'Poor center control in opening',
        frequency: centerControlIssues.length,
        severity: 'minor',
        examples: centerControlIssues.slice(0, 3)
      });
    }

    return patterns;
  }

  private detectEndgamePatterns(analyses: GameAnalysis[]): MistakePattern[] {
    const patterns: MistakePattern[] = [];

    const endgameMistakes = analyses.map(analysis => {
      const lateMistakes = analysis.moves.slice(-15).filter(move =>
        move.classification && ['mistake', 'blunder'].includes(move.classification)
      );
      return { analysis, mistakes: lateMistakes };
    }).filter(item => item.mistakes.length > 0);

    if (endgameMistakes.length >= 2) {
      patterns.push({
        type: 'endgame',
        description: 'Endgame technique issues',
        frequency: endgameMistakes.length,
        severity: 'moderate',
        examples: endgameMistakes.slice(0, 3).map(item => ({
          gameId: item.analysis.gameId,
          moveNumber: item.mistakes[0].moveNumber,
          position: item.mistakes[0].fen,
          explanation: `Endgame mistake: ${item.mistakes[0].san} in ${item.analysis.endgameType || 'complex endgame'}`
        }))
      });
    }

    return patterns;
  }

  private detectTimeManagementPatterns(analyses: GameAnalysis[]): MistakePattern[] {
    const patterns: MistakePattern[] = [];

    const timePressureGames = analyses.filter(analysis => {
      const lateMistakes = analysis.moves.slice(-10).filter(move =>
        move.classification && ['mistake', 'blunder'].includes(move.classification)
      );
      return lateMistakes.length > 2;
    });

    if (timePressureGames.length >= 2) {
      patterns.push({
        type: 'time_management',
        description: 'Mistakes in time pressure situations',
        frequency: timePressureGames.length,
        severity: 'moderate',
        examples: timePressureGames.slice(0, 3).map(analysis => {
          const mistake = analysis.moves.slice(-10).find(move => move.classification === 'mistake')!;
          return {
            gameId: analysis.gameId,
            moveNumber: mistake.moveNumber,
            position: mistake.fen,
            explanation: `Time pressure mistake: ${mistake.san}`
          };
        })
      });
    }

    return patterns;
  }

  private detectMissedMateInOne(analyses: GameAnalysis[]): Array<{
    gameId: string;
    moveNumber: number;
    position: string;
    explanation: string;
  }> {
    return [];
  }

  private detectWeakSquarePatterns(analyses: GameAnalysis[]): Array<{
    gameId: string;
    moveNumber: number;
    position: string;
    explanation: string;
  }> {
    return [];
  }

  private detectPawnStructurePatterns(analyses: GameAnalysis[]): Array<{
    gameId: string;
    moveNumber: number;
    position: string;
    explanation: string;
  }> {
    return [];
  }

  private detectCenterControlPatterns(analyses: GameAnalysis[]): Array<{
    gameId: string;
    moveNumber: number;
    position: string;
    explanation: string;
  }> {
    return [];
  }

  generateImprovementAreas(patterns: MistakePattern[], profile: PlayerProfile): ImprovementArea[] {
    const areas: ImprovementArea[] = [];

    const tacticalPatterns = patterns.filter(p => p.type === 'tactical');
    if (tacticalPatterns.length > 0) {
      areas.push({
        category: 'Tactical Skills',
        description: 'Improve tactical awareness and calculation',
        priority: tacticalPatterns.some(p => p.severity === 'major') ? 'high' : 'medium',
        actionItems: [
          'Solve 15-20 tactical puzzles daily',
          'Focus on pattern recognition',
          'Practice calculating forced variations',
          'Study common tactical motifs'
        ],
        studyResources: [
          'Chess.com tactics trainer',
          'Chesstempo tactical problems',
          'CT-ART tactical software'
        ]
      });
    }

    const positionalPatterns = patterns.filter(p => p.type === 'positional');
    if (positionalPatterns.length > 0) {
      areas.push({
        category: 'Positional Understanding',
        description: 'Develop better positional judgment',
        priority: 'medium',
        actionItems: [
          'Study classic positional games',
          'Learn pawn structure principles',
          'Practice piece coordination',
          'Understand weak and strong squares'
        ],
        studyResources: [
          'My System by Aron Nimzowitsch',
          'Positional Play by Mark Dvoretsky',
          'Chess Strategy for Club Players by Herman Grooten'
        ]
      });
    }

    const openingPatterns = patterns.filter(p => p.type === 'opening');
    if (openingPatterns.length > 0) {
      areas.push({
        category: 'Opening Knowledge',
        description: 'Build a solid opening repertoire',
        priority: 'medium',
        actionItems: [
          'Choose consistent opening systems',
          'Study opening principles',
          'Learn key pawn structures',
          'Understand piece development priorities'
        ],
        studyResources: [
          'Opening Explorer on Chess.com',
          'Modern Chess Openings (MCO)',
          'YouTube opening videos'
        ]
      });
    }

    const endgamePatterns = patterns.filter(p => p.type === 'endgame');
    if (endgamePatterns.length > 0) {
      areas.push({
        category: 'Endgame Technique',
        description: 'Master fundamental endgames',
        priority: 'high',
        actionItems: [
          'Study basic checkmate patterns',
          'Learn key pawn endgames',
          'Practice rook endgames',
          'Understand opposition and zugzwang'
        ],
        studyResources: [
          'Dvoretsky\'s Endgame Manual',
          'Chess.com endgame trainer',
          'Silman\'s Complete Endgame Course'
        ]
      });
    }

    return areas.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}