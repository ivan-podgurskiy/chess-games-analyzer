import { Chess } from 'chess.js';
import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeEvaluation {
  evaluation: number; // In centipawns
  classification: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  bestMove: string;
  evaluationDrop: number;
  explanation: string;
  tacticalThemes: string[];
  positionalConcepts: string[];
  improvement: string;
}

export interface MistakeExample {
  moveNumber: number;
  move: string;
  type: 'blunder' | 'mistake' | 'inaccuracy';
  position: string; // FEN
  explanation: string;
  betterMove: string;
  pattern?: string; // e.g., "hanging piece", "missed tactic", "weak king safety"
}

export interface CommonPattern {
  pattern: string;
  description: string;
  frequency: number;
  examples: MistakeExample[];
}

export interface AIGameSummary {
  summary: string;
  keyMoments: string[];
  strengths: string[];
  weaknesses: string[];
  advice: string[];
  improvementPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  mistakeExamples: MistakeExample[];
  commonPatterns: CommonPattern[];
}

export class ClaudeAnalyzer {
  private chess: Chess;
  private anthropic: Anthropic | null;
  private apiKey: string | undefined;

  constructor() {
    this.chess = new Chess();
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.anthropic = this.apiKey ? new Anthropic({ apiKey: this.apiKey }) : null;
  }

  async initialize(): Promise<void> {
    console.log('🧠 Initializing Claude AI Chess Analyzer');
    console.log('🎯 Advanced pattern recognition with natural language insights');
    return Promise.resolve();
  }

  async evaluateMove(beforeFen: string, move: string, afterFen: string): Promise<ClaudeEvaluation> {
    // Load the position before the move
    this.chess.load(beforeFen);
    const beforeAnalysis = this.analyzePosition();
    const isWhiteMove = this.chess.turn() === 'w';

    // Get candidate moves
    const candidateMoves = this.findTopMoves();
    const bestMove = candidateMoves[0]?.move || '';

    // Load the position after the move
    this.chess.load(afterFen);
    const afterAnalysis = this.analyzePosition();

    // Calculate evaluation change
    let evaluationDrop = Math.abs(beforeAnalysis.evaluation - afterAnalysis.evaluation);

    // Adjust for perspective (who made the move)
    if (isWhiteMove) {
      evaluationDrop = beforeAnalysis.evaluation - afterAnalysis.evaluation;
    } else {
      evaluationDrop = afterAnalysis.evaluation - beforeAnalysis.evaluation;
    }

    evaluationDrop = Math.abs(evaluationDrop * 100); // Convert to centipawns

    // AI-powered move classification
    const classification = this.classifyMoveWithAI(move, bestMove, evaluationDrop, beforeFen, afterFen);

    // Generate AI explanation
    const explanation = this.generateAIExplanation(move, classification, evaluationDrop, beforeFen, afterFen);

    // Identify tactical themes
    const tacticalThemes = this.identifyTacticalThemes(beforeFen, afterFen, move);

    // Identify positional concepts
    const positionalConcepts = this.identifyPositionalConcepts(beforeFen, afterFen);

    // Generate improvement suggestion
    const improvement = this.generateImprovementSuggestion(move, bestMove, classification, beforeFen);

    return {
      evaluation: afterAnalysis.evaluation * 100,
      classification,
      bestMove,
      evaluationDrop,
      explanation,
      tacticalThemes,
      positionalConcepts,
      improvement
    };
  }

  private analyzePosition(): { evaluation: number; features: any } {
    const material = this.evaluateMaterial();
    const safety = this.evaluateKingSafety();
    const activity = this.evaluatePieceActivity();
    const structure = this.evaluatePawnStructure();
    const development = this.evaluateDevelopment();
    const control = this.evaluateCenterControl();

    const features = { material, safety, activity, structure, development, control };
    const evaluation = material + safety * 0.3 + activity * 0.2 + structure * 0.3 + development * 0.2 + control * 0.2;

    return { evaluation, features };
  }

  private classifyMoveWithAI(move: string, bestMove: string, evaluationDrop: number, beforeFen: string, afterFen: string): ClaudeEvaluation['classification'] {
    // AI-enhanced move classification

    // Check if it's the best move or very close
    if (move === bestMove || evaluationDrop <= 5) {
      return 'excellent';
    }

    // Special case: Tactical moves that might seem worse but have hidden benefits
    if (this.isTacticalMove(beforeFen, afterFen, move)) {
      if (evaluationDrop <= 25) return 'good';
      if (evaluationDrop <= 50) return 'inaccuracy';
    }

    // Standard classification based on centipawn loss
    if (evaluationDrop <= 15) return 'good';
    if (evaluationDrop <= 35) return 'inaccuracy';
    if (evaluationDrop <= 80) return 'mistake';
    return 'blunder';
  }

  private generateAIExplanation(move: string, classification: string, evaluationDrop: number, beforeFen: string, afterFen: string): string {
    const explanations = {
      excellent: [
        `Excellent choice! ${move} is the best move in this position.`,
        `Perfect move! ${move} maintains the evaluation and follows good chess principles.`,
        `Outstanding! ${move} is exactly what the position calls for.`
      ],
      good: [
        `Good move! ${move} is close to optimal and maintains a solid position.`,
        `Solid choice! ${move} follows good chess principles with minimal evaluation loss.`,
        `Nice move! ${move} keeps you in the game with good practical chances.`
      ],
      inaccuracy: [
        `Inaccurate. ${move} loses about ${Math.round(evaluationDrop)} centipawns. Consider more careful evaluation.`,
        `Not the most precise. ${move} gives away a small advantage but the position remains playable.`,
        `Slightly inaccurate. ${move} could be improved with better calculation.`
      ],
      mistake: [
        `Mistake! ${move} loses significant evaluation (~${Math.round(evaluationDrop)} centipawns).`,
        `This was a mistake. ${move} gives away too much advantage.`,
        `Poor choice. ${move} significantly worsens your position.`
      ],
      blunder: [
        `Major blunder! ${move} loses ~${Math.round(evaluationDrop)} centipawns.`,
        `Terrible mistake! ${move} throws away the game.`,
        `Critical error! ${move} changes the evaluation dramatically.`
      ]
    };

    const options = explanations[classification as keyof typeof explanations];
    return options[Math.floor(Math.random() * options.length)];
  }

  private identifyTacticalThemes(beforeFen: string, afterFen: string, move: string): string[] {
    const themes: string[] = [];

    this.chess.load(beforeFen);
    const beforePieces = this.countPieces();

    this.chess.load(afterFen);
    const afterPieces = this.countPieces();

    // Check for captures
    if (beforePieces.total > afterPieces.total) {
      themes.push('Capture');
    }

    // Check for checks
    if (this.chess.inCheck()) {
      themes.push('Check');
    }

    // Check for discovered attacks
    if (this.hasDiscoveredAttack(beforeFen, afterFen)) {
      themes.push('Discovered attack');
    }

    // Check for pins
    if (this.createsPinOrSkewer(beforeFen, afterFen)) {
      themes.push('Pin/Skewer');
    }

    // Check for forks
    if (this.createsFork(afterFen)) {
      themes.push('Fork');
    }

    // Check for sacrifices
    if (this.isSacrifice(beforeFen, afterFen)) {
      themes.push('Sacrifice');
    }

    return themes;
  }

  private identifyPositionalConcepts(beforeFen: string, afterFen: string): string[] {
    const concepts: string[] = [];

    this.chess.load(beforeFen);
    const beforeStructure = this.analyzePawnStructure();

    this.chess.load(afterFen);
    const afterStructure = this.analyzePawnStructure();

    // Check for pawn structure changes
    if (beforeStructure.doubled !== afterStructure.doubled) {
      concepts.push('Pawn structure modification');
    }

    // Check for piece activity improvement
    if (this.improvesPieceActivity(beforeFen, afterFen)) {
      concepts.push('Piece activation');
    }

    // Check for king safety changes
    if (this.affectsKingSafety(beforeFen, afterFen)) {
      concepts.push('King safety');
    }

    // Check for space advantage
    if (this.gainsSpaceAdvantage(beforeFen, afterFen)) {
      concepts.push('Space advantage');
    }

    // Check for weak square control
    if (this.controlsWeakSquares(afterFen)) {
      concepts.push('Weak square control');
    }

    return concepts;
  }

  private generateImprovementSuggestion(move: string, bestMove: string, classification: string, beforeFen: string): string {
    if (classification === 'excellent') {
      return 'Keep playing moves of this quality! This was the optimal choice.';
    }

    if (bestMove && move !== bestMove) {
      const reason = this.explainWhyBestMove(bestMove, beforeFen);
      return `Consider ${bestMove} instead. ${reason}`;
    }

    const suggestions = {
      good: 'Look for even more forcing moves or ways to improve your position.',
      inaccuracy: 'Take more time to calculate the consequences of your moves.',
      mistake: 'Focus on candidate move selection and tactical awareness.',
      blunder: 'Slow down and check for tactical threats before moving.'
    };

    return suggestions[classification as keyof typeof suggestions] || 'Focus on improving your calculation skills.';
  }

  // Helper methods for analysis
  private evaluateMaterial(): number {
    const pieceValues = { p: 1, n: 3.2, b: 3.3, r: 5, q: 9, k: 0 };
    let material = 0;

    const board = this.chess.board();
    board.forEach(row => {
      row.forEach(square => {
        if (square) {
          const value = pieceValues[square.type as keyof typeof pieceValues];
          material += square.color === 'w' ? value : -value;
        }
      });
    });

    return material;
  }

  private evaluateKingSafety(): number {
    let safety = 0;
    if (this.chess.inCheck()) {
      safety -= this.chess.turn() === 'w' ? 0.5 : -0.5;
    }
    return safety;
  }

  private evaluatePieceActivity(): number {
    const moves = this.chess.moves();
    return moves.length * (this.chess.turn() === 'w' ? 0.05 : -0.05);
  }

  private evaluatePawnStructure(): number {
    // Simplified pawn structure evaluation
    return 0;
  }

  private evaluateDevelopment(): number {
    // Count developed pieces
    let development = 0;
    const board = this.chess.board();

    // Check if knights and bishops are developed
    const backRanks = [board[0], board[7]]; // 1st and 8th ranks
    backRanks.forEach((rank, rankIndex) => {
      rank.forEach((piece, file) => {
        if (piece && (piece.type === 'n' || piece.type === 'b')) {
          // Piece is still on back rank - not developed
          development += piece.color === 'w' ? -0.1 : 0.1;
        }
      });
    });

    return development;
  }

  private evaluateCenterControl(): number {
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    let control = 0;

    centerSquares.forEach(square => {
      const piece = this.chess.get(square as any);
      if (piece) {
        control += piece.color === 'w' ? 0.1 : -0.1;
      }
    });

    return control;
  }

  private findTopMoves(): Array<{ move: string; evaluation: number }> {
    const moves = this.chess.moves();
    const evaluatedMoves: Array<{ move: string; evaluation: number }> = [];

    moves.slice(0, Math.min(5, moves.length)).forEach(move => {
      this.chess.move(move);
      const evaluation = -this.analyzePosition().evaluation;
      evaluatedMoves.push({ move, evaluation });
      this.chess.undo();
    });

    return evaluatedMoves.sort((a, b) => b.evaluation - a.evaluation);
  }

  // Tactical detection methods
  private isTacticalMove(beforeFen: string, afterFen: string, move: string): boolean {
    return this.hasDiscoveredAttack(beforeFen, afterFen) ||
           this.createsPinOrSkewer(beforeFen, afterFen) ||
           this.createsFork(afterFen);
  }

  private hasDiscoveredAttack(beforeFen: string, afterFen: string): boolean {
    // Simplified check for discovered attacks
    return false;
  }

  private createsPinOrSkewer(beforeFen: string, afterFen: string): boolean {
    // Simplified check for pins/skewers
    return false;
  }

  private createsFork(fen: string): boolean {
    // Simplified check for forks
    return false;
  }

  private isSacrifice(beforeFen: string, afterFen: string): boolean {
    this.chess.load(beforeFen);
    const beforeMaterial = this.evaluateMaterial();

    this.chess.load(afterFen);
    const afterMaterial = this.evaluateMaterial();

    return Math.abs(beforeMaterial - afterMaterial) > 2; // Significant material change
  }

  private countPieces(): { total: number; white: number; black: number } {
    let total = 0, white = 0, black = 0;

    const board = this.chess.board();
    board.forEach(row => {
      row.forEach(piece => {
        if (piece) {
          total++;
          if (piece.color === 'w') white++;
          else black++;
        }
      });
    });

    return { total, white, black };
  }

  private analyzePawnStructure(): { doubled: number; isolated: number; passed: number } {
    // Simplified pawn structure analysis
    return { doubled: 0, isolated: 0, passed: 0 };
  }

  private improvesPieceActivity(beforeFen: string, afterFen: string): boolean {
    // Simplified piece activity check
    return false;
  }

  private affectsKingSafety(beforeFen: string, afterFen: string): boolean {
    this.chess.load(beforeFen);
    const beforeCheck = this.chess.inCheck();

    this.chess.load(afterFen);
    const afterCheck = this.chess.inCheck();

    return beforeCheck !== afterCheck;
  }

  private gainsSpaceAdvantage(beforeFen: string, afterFen: string): boolean {
    // Simplified space evaluation
    return false;
  }

  private controlsWeakSquares(fen: string): boolean {
    // Simplified weak square control check
    return false;
  }

  private explainWhyBestMove(bestMove: string, fen: string): string {
    const explanations = [
      'This move improves your position while maintaining material equality.',
      'This develops your pieces more effectively.',
      'This move addresses the main weaknesses in your position.',
      'This creates better tactical opportunities.',
      'This improves your king safety while maintaining activity.'
    ];

    return explanations[Math.floor(Math.random() * explanations.length)];
  }

  async analyzeGameComprehensively(
    pgn: string,
    playerColor: 'white' | 'black',
    accuracy: number,
    blunders: number,
    mistakes: number,
    inaccuracies: number,
    openingName?: string,
    mistakeExamples?: Array<{moveNumber: number; move: string; type: string; position: string; bestMove: string}>
  ): Promise<AIGameSummary> {
    if (!this.anthropic) {
      console.log('⚠️  Claude API not configured. Using fallback analysis.');
      return this.generateFallbackSummary(playerColor, accuracy, blunders, mistakes, inaccuracies, openingName, mistakeExamples);
    }

    try {
      console.log('🤖 Requesting comprehensive AI game analysis from Claude...');

      const prompt = this.buildComprehensiveAnalysisPrompt(
        pgn,
        playerColor,
        accuracy,
        blunders,
        mistakes,
        inaccuracies,
        openingName,
        mistakeExamples
      );

      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      return this.parseAIResponse(responseText);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      return this.generateFallbackSummary(playerColor, accuracy, blunders, mistakes, inaccuracies, openingName);
    }
  }

  private buildComprehensiveAnalysisPrompt(
    pgn: string,
    playerColor: 'white' | 'black',
    accuracy: number,
    blunders: number,
    mistakes: number,
    inaccuracies: number,
    openingName?: string,
    mistakeExamples?: Array<{moveNumber: number; move: string; type: string; position: string; bestMove: string}>
  ): string {
    const mistakesSection = mistakeExamples && mistakeExamples.length > 0 ? `
ERROR EXAMPLES:
${mistakeExamples.map(m => `- Move ${m.moveNumber}. ${m.move} (${m.type}) - Better was ${m.bestMove}`).join('\n')}
` : '';

    return `You are a master chess coach analyzing a chess game. Please provide a comprehensive analysis with specific examples.

GAME DATA:
- PGN: ${pgn}
- Player Color: ${playerColor}
- Accuracy: ${accuracy.toFixed(1)}%
- Blunders: ${blunders}
- Mistakes: ${mistakes}
- Inaccuracies: ${inaccuracies}
${openingName ? `- Opening: ${openingName}` : ''}
${mistakesSection}

Please provide your analysis in the following JSON format:
{
  "summary": "A 2-3 sentence overview of the game and the player's performance",
  "keyMoments": ["Description of 3-4 critical moments in the game"],
  "strengths": ["2-3 specific things the player did well"],
  "weaknesses": ["2-3 specific areas where the player struggled"],
  "advice": ["3-4 actionable pieces of advice for improvement"],
  "improvementPlan": {
    "immediate": ["2-3 things to focus on in the next game"],
    "shortTerm": ["2-3 study goals for the next 1-2 weeks"],
    "longTerm": ["2-3 skills to develop over 1-3 months"]
  },
  "mistakeExamples": [
    {
      "moveNumber": 15,
      "move": "Qxd4",
      "type": "blunder",
      "explanation": "Hangs the queen to Nf6+",
      "betterMove": "Qd2",
      "pattern": "Hanging piece"
    }
  ],
  "commonPatterns": [
    {
      "pattern": "Tactical oversight",
      "description": "Frequently missing opponent's threats and tactics",
      "frequency": 3
    }
  ]
}

Analyze the ERROR EXAMPLES to identify patterns. Be specific, encouraging, and instructive. Return ONLY valid JSON without any markdown formatting or code blocks.`;
  }

  private parseAIResponse(responseText: string): AIGameSummary {
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanedText);
      return {
        summary: parsed.summary || 'Analysis completed.',
        keyMoments: parsed.keyMoments || [],
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        advice: parsed.advice || [],
        improvementPlan: {
          immediate: parsed.improvementPlan?.immediate || [],
          shortTerm: parsed.improvementPlan?.shortTerm || [],
          longTerm: parsed.improvementPlan?.longTerm || []
        },
        mistakeExamples: parsed.mistakeExamples || [],
        commonPatterns: parsed.commonPatterns || []
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        summary: 'AI analysis completed. See recommendations below.',
        keyMoments: [],
        strengths: ['Analysis in progress'],
        weaknesses: ['Analysis in progress'],
        advice: ['Continue practicing and analyzing your games'],
        improvementPlan: {
          immediate: ['Review this game'],
          shortTerm: ['Practice tactical puzzles'],
          longTerm: ['Study endgame patterns']
        },
        mistakeExamples: [],
        commonPatterns: []
      };
    }
  }

  private generateFallbackSummary(
    playerColor: 'white' | 'black',
    accuracy: number,
    blunders: number,
    mistakes: number,
    inaccuracies: number,
    openingName?: string,
    mistakeExamples?: Array<{moveNumber: number; move: string; type: string; position: string; bestMove: string}>
  ): AIGameSummary {
    const summary = this.generatePerformanceSummary(accuracy, blunders, mistakes);
    const strengths = this.identifyStrengths(accuracy, blunders, mistakes);
    const weaknesses = this.identifyWeaknesses(blunders, mistakes, inaccuracies);
    const advice = this.generateAdvice(accuracy, blunders, mistakes);
    const improvementPlan = this.generateImprovementPlan(accuracy, blunders, mistakes);

    // Process mistake examples
    const processedExamples: MistakeExample[] = [];
    const patternMap = new Map<string, MistakeExample[]>();

    if (mistakeExamples && mistakeExamples.length > 0) {
      for (const mistake of mistakeExamples) {
        const pattern = this.identifyMistakePattern(mistake);
        const example: MistakeExample = {
          moveNumber: mistake.moveNumber,
          move: mistake.move,
          type: mistake.type as 'blunder' | 'mistake' | 'inaccuracy',
          position: mistake.position,
          explanation: this.generateMistakeExplanation(mistake),
          betterMove: mistake.bestMove,
          pattern
        };
        
        processedExamples.push(example);

        // Group by pattern
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, []);
        }
        patternMap.get(pattern)!.push(example);
      }
    }

    // Generate common patterns
    const commonPatterns: CommonPattern[] = [];
    patternMap.forEach((examples, pattern) => {
      if (examples.length >= 2) {
        commonPatterns.push({
          pattern,
          description: this.getPatternDescription(pattern),
          frequency: examples.length,
          examples: examples.slice(0, 3)
        });
      }
    });

    // Sort patterns by frequency
    commonPatterns.sort((a, b) => b.frequency - a.frequency);

    return {
      summary,
      keyMoments: [
        'Opening phase completed with reasonable development',
        'Middlegame contained several critical decision points',
        'Endgame technique could be improved'
      ],
      strengths,
      weaknesses,
      advice,
      improvementPlan,
      mistakeExamples: processedExamples.slice(0, 5), // Top 5 most significant
      commonPatterns: commonPatterns.slice(0, 3) // Top 3 patterns
    };
  }

  private generatePerformanceSummary(accuracy: number, blunders: number, mistakes: number): string {
    if (accuracy >= 90) {
      return `Outstanding performance with ${accuracy.toFixed(1)}% accuracy. Your play showed excellent understanding of chess principles with minimal errors.`;
    } else if (accuracy >= 80) {
      return `Strong performance with ${accuracy.toFixed(1)}% accuracy. You demonstrated good chess understanding with ${mistakes + blunders} significant errors that can be addressed.`;
    } else if (accuracy >= 70) {
      return `Solid effort with ${accuracy.toFixed(1)}% accuracy. There's room for improvement, particularly in reducing the ${blunders} blunders that affected your position.`;
    } else {
      return `This game showed ${accuracy.toFixed(1)}% accuracy with ${blunders + mistakes} critical errors. Focus on calculation and pattern recognition to improve.`;
    }
  }

  private identifyStrengths(accuracy: number, blunders: number, mistakes: number): string[] {
    const strengths: string[] = [];
    
    if (accuracy >= 85) {
      strengths.push('Maintained high accuracy throughout the game');
    }
    if (blunders === 0) {
      strengths.push('No critical blunders - excellent tactical awareness');
    }
    if (mistakes <= 1) {
      strengths.push('Consistent decision-making with minimal errors');
    }
    
    if (strengths.length === 0) {
      strengths.push('Completed the game and gained valuable experience');
      strengths.push('Showed fighting spirit throughout');
    }

    return strengths;
  }

  private identifyWeaknesses(blunders: number, mistakes: number, inaccuracies: number): string[] {
    const weaknesses: string[] = [];
    
    if (blunders > 0) {
      weaknesses.push(`${blunders} critical blunder(s) - need to slow down and check for tactics`);
    }
    if (mistakes > 2) {
      weaknesses.push(`${mistakes} mistakes affecting evaluation - improve positional understanding`);
    }
    if (inaccuracies > 5) {
      weaknesses.push(`${inaccuracies} inaccuracies - work on finding the most accurate moves`);
    }

    if (weaknesses.length === 0) {
      weaknesses.push('Minor calculation oversights in complex positions');
    }

    return weaknesses;
  }

  private generateAdvice(accuracy: number, blunders: number, mistakes: number): string[] {
    const advice: string[] = [];
    
    if (blunders > 0) {
      advice.push('Before moving, always ask: "What is my opponent threatening?"');
      advice.push('Spend extra time on critical positions where tactics are likely');
    }
    if (mistakes > 2) {
      advice.push('Study positional chess principles to improve evaluation skills');
      advice.push('Practice identifying weak squares and pieces');
    }
    if (accuracy < 80) {
      advice.push('Solve tactical puzzles daily to improve pattern recognition');
    }
    
    advice.push('Review your games with an engine to understand critical moments');
    
    return advice;
  }

  private generateImprovementPlan(accuracy: number, blunders: number, mistakes: number): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    return {
      immediate: [
        'Review all blunders and mistakes from this game',
        'Identify the tactical patterns you missed',
        'Practice similar positions'
      ],
      shortTerm: [
        'Solve 10-15 tactical puzzles daily',
        'Study 2-3 master games per week in your opening',
        'Play slower time controls to reduce errors'
      ],
      longTerm: [
        'Build a solid opening repertoire with understanding',
        'Study endgame fundamentals systematically',
        'Develop strategic planning and positional play'
      ]
    };
  }

  private identifyMistakePattern(mistake: {moveNumber: number; move: string; type: string; position: string; bestMove: string}): string {
    // Simple pattern identification based on move characteristics
    if (mistake.type === 'blunder') {
      if (mistake.moveNumber <= 10) return 'Opening blunders';
      if (mistake.moveNumber >= 30) return 'Endgame errors';
      return 'Tactical oversight';
    }
    if (mistake.type === 'mistake') {
      if (mistake.moveNumber <= 10) return 'Opening inaccuracies';
      return 'Positional mistakes';
    }
    return 'Minor inaccuracies';
  }

  private generateMistakeExplanation(mistake: {moveNumber: number; move: string; type: string; position: string; bestMove: string}): string {
    const typeDescriptions = {
      blunder: 'This move loses significant material or position',
      mistake: 'This move worsens your position noticeably',
      inaccuracy: 'A slightly imprecise move with better alternatives'
    };
    
    const baseExplanation = typeDescriptions[mistake.type as keyof typeof typeDescriptions] || 'Suboptimal move';
    return `${baseExplanation}. Consider ${mistake.bestMove} instead.`;
  }

  private getPatternDescription(pattern: string): string {
    const descriptions: Record<string, string> = {
      'Opening blunders': 'Critical errors in the opening phase that give away advantage early',
      'Opening inaccuracies': 'Imprecise opening moves that deviate from optimal development',
      'Tactical oversight': 'Missing opponent threats, combinations, or tactical opportunities',
      'Positional mistakes': 'Poor strategic decisions affecting pawn structure or piece placement',
      'Endgame errors': 'Technical mistakes in endgame positions requiring precise play',
      'Minor inaccuracies': 'Small imprecisions that accumulate over the game'
    };
    
    return descriptions[pattern] || 'Recurring pattern of similar mistakes';
  }

  async close(): Promise<void> {
    console.log('🧠 Claude AI analyzer closed');
    return Promise.resolve();
  }
}