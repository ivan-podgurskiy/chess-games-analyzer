import { Chess } from 'chess.js';
import { Game, GameAnalysis, Move } from '../models/Game'
import { MoveAnalyzer, MoveEvaluation } from './MoveAnalyzer'
import { PgnParser } from '../utils/PgnParser'

export class GameAnalyzer {
  private moveAnalyzer: MoveAnalyzer;

  constructor() {
    this.moveAnalyzer = new MoveAnalyzer();
  }

  analyzeGame(game: Game, playerUsername: string): GameAnalysis {
    const chess = new Chess();
    const moves = PgnParser.extractMovesFromPgn(game.pgn);
    const playerColor = this.getPlayerColor(game, playerUsername);
    const analyzedMoves: Move[] = [];
    let totalAccuracy = 0;
    let moveCount = 0;

    chess.reset();

    moves.forEach((move, index) => {
      const beforeFen = chess.fen();

      try {
        chess.move(move.san);

        if (this.isPlayerMove(move, playerColor)) {
          const evaluation = this.moveAnalyzer.evaluateMove(
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

          const accuracy = this.calculateMoveAccuracy(evaluation.classification);
          totalAccuracy += accuracy;
          moveCount++;
        } else {
          analyzedMoves.push(move);
        }
      } catch (error) {
        console.error(`Error analyzing move ${move.san} at position ${index}:`, error);
        analyzedMoves.push(move);
      }
    });

    const overallAccuracy = moveCount > 0 ? totalAccuracy / moveCount : 0;
    const mistakes = this.identifyMistakePatterns(analyzedMoves, playerColor);
    const recommendations = this.generateRecommendations(analyzedMoves, mistakes);
    const openingName = PgnParser.getOpeningName(game.pgn);

    return {
      gameId: game.id,
      moves: analyzedMoves,
      playerColor,
      mistakes,
      recommendations,
      overallAccuracy,
      openingName,
      endgameType: this.identifyEndgameType(game.pgn)
    };
  }

  private getPlayerColor(game: Game, playerUsername: string): 'white' | 'black' {
    return game.white.username === playerUsername ? 'white' : 'black';
  }

  private isPlayerMove(move: Move, playerColor: 'white' | 'black'): boolean {
    return (playerColor === 'white' && move.isWhiteMove) ||
           (playerColor === 'black' && !move.isWhiteMove);
  }

  private calculateMoveAccuracy(classification: Move['classification']): number {
    switch (classification) {
      case 'excellent': return 100;
      case 'good': return 90;
      case 'inaccuracy': return 70;
      case 'mistake': return 50;
      case 'blunder': return 20;
      default: return 80;
    }
  }

  private identifyMistakePatterns(moves: Move[], playerColor: 'white' | 'black') {
    const patterns = [];
    const playerMoves = moves.filter(move => this.isPlayerMove(move, playerColor));

    const blunders = playerMoves.filter(move => move.classification === 'blunder');
    if (blunders.length > 0) {
      patterns.push({
        type: 'tactical' as const,
        description: 'Frequent blunders losing material',
        frequency: blunders.length,
        severity: blunders.length > 2 ? 'major' as const : 'moderate' as const,
        examples: blunders.slice(0, 3).map(move => ({
          gameId: '',
          moveNumber: move.moveNumber,
          position: move.fen,
          explanation: `Blunder on move ${move.moveNumber}: ${move.san}`
        }))
      });
    }

    const mistakes = playerMoves.filter(move => move.classification === 'mistake');
    if (mistakes.length > 0) {
      patterns.push({
        type: 'positional' as const,
        description: 'Positional mistakes',
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

  private generateRecommendations(moves: Move[], mistakes: any[]): string[] {
    const recommendations: string[] = [];

    const blunders = moves.filter(move => move.classification === 'blunder').length;
    const mistakes_count = moves.filter(move => move.classification === 'mistake').length;
    const inaccuracies = moves.filter(move => move.classification === 'inaccuracy').length;

    if (blunders > 2) {
      recommendations.push('Focus on tactical training - solve 10-15 tactical puzzles daily');
      recommendations.push('Take more time on critical moves to avoid blunders');
    }

    if (mistakes_count > 3) {
      recommendations.push('Study positional chess principles and pawn structures');
      recommendations.push('Practice evaluating positions before making moves');
    }

    if (inaccuracies > 5) {
      recommendations.push('Work on calculation skills and candidate move selection');
    }

    const openingMistakes = moves.slice(0, 15).filter(move =>
      move.classification && ['mistake', 'blunder'].includes(move.classification)
    );

    if (openingMistakes.length > 1) {
      recommendations.push('Study opening principles and common opening patterns');
    }

    const endgameMistakes = moves.slice(-15).filter(move =>
      move.classification && ['mistake', 'blunder'].includes(move.classification)
    );

    if (endgameMistakes.length > 1) {
      recommendations.push('Practice basic endgames and endgame principles');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great game! Continue practicing to maintain this level');
    }

    return recommendations;
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
}