import { Chess } from 'chess.js';
import { Move } from '../models/Game'

export interface MoveEvaluation {
  move: string;
  evaluation: number;
  classification: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  bestMove?: string;
  explanation: string;
}

export class MoveAnalyzer {
  private chess: Chess;

  constructor() {
    this.chess = new Chess();
  }

  analyzePosition(fen: string): {
    evaluation: number;
    bestMoves: string[];
    threats: string[];
    tacticalMotifs: string[];
  } {
    this.chess.load(fen);

    const evaluation = this.evaluatePosition();
    const bestMoves = this.findBestMoves();
    const threats = this.findThreats();
    const tacticalMotifs = this.findTacticalMotifs();

    return { evaluation, bestMoves, threats, tacticalMotifs };
  }

  evaluateMove(beforeFen: string, move: string, afterFen: string): MoveEvaluation {
    this.chess.load(beforeFen);

    const beforeEval = this.evaluatePosition();
    const legalMoves = this.chess.moves();

    if (!legalMoves.includes(move)) {
      throw new Error(`Illegal move: ${move}`);
    }

    this.chess.move(move);
    const afterEval = this.evaluatePosition();

    const evalDiff = afterEval - beforeEval;
    const bestMove = this.findBestMove(beforeFen);

    return {
      move,
      evaluation: afterEval,
      classification: this.classifyMove(evalDiff, move, bestMove),
      bestMove: move !== bestMove ? bestMove : undefined,
      explanation: this.generateMoveExplanation(evalDiff, move, bestMove)
    };
  }

  private evaluatePosition(): number {
    const materialBalance = this.calculateMaterialBalance();
    const positionalFactors = this.calculatePositionalFactors();

    return materialBalance + positionalFactors;
  }

  private calculateMaterialBalance(): number {
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let balance = 0;

    const board = this.chess.board();
    board.forEach(row => {
      row.forEach(square => {
        if (square) {
          const value = pieceValues[square.type as keyof typeof pieceValues];
          balance += square.color === 'w' ? value : -value;
        }
      });
    });

    return balance;
  }

  private calculatePositionalFactors(): number {
    let score = 0;

    score += this.evaluatePieceActivity();
    score += this.evaluateKingSafety();
    score += this.evaluatePawnStructure();
    score += this.evaluateCenterControl();

    return score * 0.1;
  }

  private evaluatePieceActivity(): number {
    const moves = this.chess.moves();
    return moves.length * (this.chess.turn() === 'w' ? 0.1 : -0.1);
  }

  private evaluateKingSafety(): number {
    let safety = 0;
    const turn = this.chess.turn();

    if (this.chess.inCheck()) {
      safety -= turn === 'w' ? 0.5 : -0.5;
    }

    return safety;
  }

  private evaluatePawnStructure(): number {
    return 0;
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

  private findBestMoves(): string[] {
    const moves = this.chess.moves();
    const evaluatedMoves: { move: string; eval: number }[] = [];

    moves.forEach(move => {
      this.chess.move(move);
      const evaluation = -this.evaluatePosition();
      evaluatedMoves.push({ move, eval: evaluation });
      this.chess.undo();
    });

    evaluatedMoves.sort((a, b) => b.eval - a.eval);
    return evaluatedMoves.slice(0, 3).map(m => m.move);
  }

  private findBestMove(fen: string): string {
    this.chess.load(fen);
    return this.findBestMoves()[0] || '';
  }

  private findThreats(): string[] {
    const threats: string[] = [];
    const moves = this.chess.moves({ verbose: true });

    moves.forEach(move => {
      if (move.captured) {
        threats.push(`Capture ${move.captured} on ${move.to}`);
      }

      this.chess.move(move);
      if (this.chess.inCheck()) {
        threats.push(`Check with ${move.piece} to ${move.to}`);
      }
      this.chess.undo();
    });

    return threats;
  }

  private findTacticalMotifs(): string[] {
    const motifs: string[] = [];

    if (this.chess.inCheck()) {
      motifs.push('Check');
    }

    if (this.chess.isCheckmate()) {
      motifs.push('Checkmate');
    }

    if (this.chess.isStalemate()) {
      motifs.push('Stalemate');
    }

    return motifs;
  }

  private classifyMove(evalDiff: number, move: string, bestMove: string): MoveEvaluation['classification'] {
    if (move === bestMove) return 'excellent';

    if (evalDiff >= -0.1) return 'excellent';
    if (evalDiff >= -0.25) return 'good';
    if (evalDiff >= -0.5) return 'inaccuracy';
    if (evalDiff >= -1.0) return 'mistake';
    return 'blunder';
  }

  private generateMoveExplanation(evalDiff: number, move: string, bestMove: string): string {
    if (move === bestMove) {
      return 'Excellent move! This was the best choice in the position.';
    }

    if (evalDiff >= -0.1) {
      return 'Good move, very close to the best option.';
    }

    if (evalDiff >= -0.25) {
      return `Inaccuracy. Consider ${bestMove} instead.`;
    }

    if (evalDiff >= -0.5) {
      return `Mistake. ${bestMove} would have been much better.`;
    }

    return `Blunder! This move loses significant material or position. ${bestMove} was the correct move.`;
  }
}