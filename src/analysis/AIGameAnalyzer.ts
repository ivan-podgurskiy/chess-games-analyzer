import { Chess } from 'chess.js';
import { Game, GameAnalysis, Move } from '../models/Game';
import { ClaudeAnalyzer } from './ClaudeAnalyzer';
import { PgnParser } from '../utils/PgnParser';

export class AIGameAnalyzer {
  private claudeAnalyzer: ClaudeAnalyzer;

  constructor() {
    this.claudeAnalyzer = new ClaudeAnalyzer();
  }

  async initialize(): Promise<void> {
    await this.claudeAnalyzer.initialize();
  }

  async analyzeGame(game: Game, playerUsername: string): Promise<GameAnalysis> {
    const chess = new Chess();
    const moves = PgnParser.extractMovesFromPgn(game.pgn);
    const playerColor = this.getPlayerColor(game, playerUsername);
    const analyzedMoves: Move[] = [];
    let totalAccuracy = 0;
    let moveCount = 0;

    chess.reset();

    console.log(`🤖 AI Analysis: Starting deep analysis of ${moves.length} moves...`);

    for (let index = 0; index < moves.length; index++) {
      const move = moves[index];
      const beforeFen = chess.fen();

      try {
        chess.move(move.san);

        if (this.isPlayerMove(move, playerColor)) {
          console.log(`🧠 Analyzing move ${moveCount + 1}/${this.countPlayerMoves(moves, playerColor)}: ${move.san}`);

          // Use Claude AI to evaluate the move
          const evaluation = await this.claudeAnalyzer.evaluateMove(
            beforeFen,
            move.san,
            chess.fen()
          );

          const analyzedMove: Move = {
            ...move,
            evaluation: evaluation.evaluation,
            bestMove: evaluation.bestMove,
            classification: evaluation.classification
          };

          analyzedMoves.push(analyzedMove);

          const accuracy = this.calculateMoveAccuracy(evaluation.classification, evaluation.evaluationDrop);
          totalAccuracy += accuracy;
          moveCount++;

          // Log Claude AI insights
          if (evaluation.classification === 'blunder') {
            console.log(`🚨 Claude AI: Blunder detected - ${move.san}`);
            console.log(`💡 ${evaluation.explanation}`);
            console.log(`🎯 Improvement: ${evaluation.improvement}`);
          } else if (evaluation.classification === 'excellent') {
            console.log(`✨ Claude AI: ${evaluation.explanation}`);
          }
        } else {
          analyzedMoves.push(move);
        }
      } catch (error) {
        console.error(`Error analyzing move ${move.san} at position ${index}:`, error);
        analyzedMoves.push(move);
      }
    }

    const overallAccuracy = moveCount > 0 ? totalAccuracy / moveCount : 0;
    const mistakes = this.identifyMistakePatterns(analyzedMoves, playerColor);
    const recommendations = this.generateAIRecommendations(analyzedMoves, mistakes, overallAccuracy);
    const openingName = PgnParser.getOpeningName(game.pgn);

    // Count error types
    const blunders = analyzedMoves.filter(m => m.classification === 'blunder' && this.isPlayerMove(m, playerColor)).length;
    const mistakeCount = analyzedMoves.filter(m => m.classification === 'mistake' && this.isPlayerMove(m, playerColor)).length;
    const inaccuracies = analyzedMoves.filter(m => m.classification === 'inaccuracy' && this.isPlayerMove(m, playerColor)).length;

    console.log(`🎯 AI Analysis Complete: ${overallAccuracy.toFixed(1)}% accuracy`);
    console.log(`🤖 Generating comprehensive AI summary...`);

    // Collect mistake examples from player moves
    const playerMoves = analyzedMoves.filter(m => this.isPlayerMove(m, playerColor));
    const mistakeExamples = playerMoves
      .filter(m => m.classification && ['blunder', 'mistake', 'inaccuracy'].includes(m.classification))
      .slice(0, 10) // Top 10 errors
      .map(m => ({
        moveNumber: m.moveNumber,
        move: m.san,
        type: m.classification as 'blunder' | 'mistake' | 'inaccuracy',
        position: m.fen,
        bestMove: m.bestMove || '',
        gameId: game.id
      }));

    // Get comprehensive AI analysis
    const aiSummary = await this.claudeAnalyzer.analyzeGameComprehensively(
      game.pgn,
      playerColor,
      overallAccuracy,
      blunders,
      mistakeCount,
      inaccuracies,
      openingName,
      mistakeExamples
    );

    console.log(`✅ AI Summary generated`);

    return {
      gameId: game.id,
      moves: analyzedMoves,
      playerColor,
      mistakes,
      recommendations,
      overallAccuracy,
      openingName,
      endgameType: this.identifyEndgameType(game.pgn),
      aiSummary
    };
  }

  private countPlayerMoves(moves: Move[], playerColor: 'white' | 'black'): number {
    return moves.filter(move => this.isPlayerMove(move, playerColor)).length;
  }

  private getPlayerColor(game: Game, playerUsername: string): 'white' | 'black' {
    return game.white.username === playerUsername ? 'white' : 'black';
  }

  private isPlayerMove(move: Move, playerColor: 'white' | 'black'): boolean {
    return (playerColor === 'white' && move.isWhiteMove) ||
           (playerColor === 'black' && !move.isWhiteMove);
  }

  private calculateMoveAccuracy(classification: Move['classification'], evaluationDrop: number): number {
    // More sophisticated accuracy calculation based on centipawn loss
    if (evaluationDrop <= 10) return 100;
    if (evaluationDrop <= 25) return 95;
    if (evaluationDrop <= 50) return 85;
    if (evaluationDrop <= 100) return 70;
    if (evaluationDrop <= 200) return 50;
    return Math.max(20, 100 - evaluationDrop / 5);
  }

  private identifyMistakePatterns(moves: Move[], playerColor: 'white' | 'black') {
    const patterns = [];
    const playerMoves = moves.filter(move => this.isPlayerMove(move, playerColor));

    const blunders = playerMoves.filter(move => move.classification === 'blunder');
    if (blunders.length > 0) {
      patterns.push({
        type: 'tactical' as const,
        description: `Major tactical blunders detected (${blunders.length} blunders)`,
        frequency: blunders.length,
        severity: blunders.length > 2 ? 'major' as const : 'moderate' as const,
        examples: blunders.slice(0, 3).map(move => ({
          gameId: '',
          moveNumber: move.moveNumber,
          position: move.fen,
          explanation: `Blunder on move ${move.moveNumber}: ${move.san} (best was ${move.bestMove})`
        }))
      });
    }

    const mistakes = playerMoves.filter(move => move.classification === 'mistake');
    if (mistakes.length > 0) {
      patterns.push({
        type: 'positional' as const,
        description: `Positional errors affecting evaluation (${mistakes.length} mistakes)`,
        frequency: mistakes.length,
        severity: mistakes.length > 3 ? 'moderate' as const : 'minor' as const,
        examples: mistakes.slice(0, 3).map(move => ({
          gameId: '',
          moveNumber: move.moveNumber,
          position: move.fen,
          explanation: `Mistake on move ${move.moveNumber}: ${move.san}`
        }))
      });
    }

    return patterns;
  }

  private generateAIRecommendations(moves: Move[], mistakes: any[], accuracy: number): string[] {
    const recommendations: string[] = [];
    const playerMoves = moves.filter(move => move.classification);

    const blunders = playerMoves.filter(move => move.classification === 'blunder').length;
    const mistakeCount = playerMoves.filter(move => move.classification === 'mistake').length;
    const inaccuracies = playerMoves.filter(move => move.classification === 'inaccuracy').length;

    // AI-powered specific recommendations
    if (accuracy < 70) {
      recommendations.push('🚨 Critical: Your accuracy is below 70%. Focus on calculation and avoiding major errors');
      recommendations.push('🧠 Study tactical patterns daily - blunders are costing you significant rating points');
    } else if (accuracy < 80) {
      recommendations.push('📈 Good potential! Reduce inaccuracies to reach the next level');
    } else if (accuracy >= 90) {
      recommendations.push('🌟 Excellent accuracy! You have strong technical skills');
    }

    if (blunders > 2) {
      recommendations.push('⚔️ Urgent: Multiple blunders detected. Slow down on critical moves');
      recommendations.push('🔍 Before moving, ask: "What is my opponent threatening?"');
    }

    if (mistakeCount > 3) {
      recommendations.push('📚 Study positional principles to reduce evaluation losses');
      recommendations.push('🎯 Focus on piece coordination and pawn structure');
    }

    // Opening phase analysis
    const openingMoves = playerMoves.slice(0, 10);
    const openingErrors = openingMoves.filter(move =>
      move.classification && ['mistake', 'blunder'].includes(move.classification)
    ).length;

    if (openingErrors > 1) {
      recommendations.push('🏛️ Opening issues detected - learn fundamental opening principles');
      recommendations.push('📖 Study your opening repertoire more deeply');
    }

    // Endgame analysis
    const endgameMoves = playerMoves.slice(-10);
    const endgameErrors = endgameMoves.filter(move =>
      move.classification && ['mistake', 'blunder'].includes(move.classification)
    ).length;

    if (endgameErrors > 1) {
      recommendations.push('👑 Endgame technique needs work - study basic endgame patterns');
      recommendations.push('🏁 Practice king and pawn endings');
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 Outstanding performance! Continue this level of play');
      recommendations.push('📈 Consider playing stronger opponents to further improve');
    }

    return recommendations.slice(0, 6); // Limit to most important recommendations
  }

  private identifyEndgameType(pgn: string): string | undefined {
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);

      const board = chess.board();
      let pieceCount = 0;
      const pieces: string[] = [];

      board.forEach(row => {
        row.forEach(square => {
          if (square && square.type !== 'k') {
            pieceCount++;
            pieces.push(square.type);
          }
        });
      });

      if (pieceCount <= 4) {
        if (pieces.includes('q')) return 'Queen endgame';
        if (pieces.includes('r')) return 'Rook endgame';
        if (pieces.includes('b') || pieces.includes('n')) return 'Minor piece endgame';
        return 'Pawn endgame';
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  async close(): Promise<void> {
    await this.claudeAnalyzer.close();
  }
}