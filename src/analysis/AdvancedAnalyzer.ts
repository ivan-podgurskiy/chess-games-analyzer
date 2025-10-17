import { Chess } from 'chess.js';

export interface AdvancedEvaluation {
  evaluation: number; // In centipawns
  classification: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  bestMove: string;
  evaluationDrop: number;
  tacticalMotifs: string[];
  positionalFactors: {
    kingSafety: number;
    pawnStructure: number;
    pieceActivity: number;
    centerControl: number;
  };
}

export class AdvancedAnalyzer {
  private chess: Chess;

  constructor() {
    this.chess = new Chess();
  }

  async initialize(): Promise<void> {
    console.log('🧠 Initializing Advanced Chess AI Analyzer');
    console.log('🔍 Enhanced pattern recognition and position evaluation');
    return Promise.resolve();
  }

  async evaluateMove(beforeFen: string, move: string, afterFen: string): Promise<AdvancedEvaluation> {
    // Load position before move
    this.chess.load(beforeFen);
    const beforeEval = this.evaluatePosition();

    // Load position after move
    this.chess.load(afterFen);
    const afterEval = this.evaluatePosition();

    // Find best move in the before position
    this.chess.load(beforeFen);
    const bestMoveData = await this.findBestMove();

    // Calculate evaluation drop
    const isWhiteMove = this.chess.turn() === 'w';
    let evaluationDrop: number;

    if (isWhiteMove) {
      evaluationDrop = beforeEval.total - afterEval.total;
    } else {
      evaluationDrop = afterEval.total - beforeEval.total;
    }

    // Convert to centipawns and make absolute
    evaluationDrop = Math.abs(evaluationDrop * 100);

    // Classify move based on evaluation drop
    const classification = this.classifyMove(evaluationDrop, move, bestMoveData.move);

    // Find tactical motifs
    const tacticalMotifs = this.findTacticalMotifs(beforeFen, afterFen);

    return {
      evaluation: afterEval.total * 100, // Convert to centipawns
      classification,
      bestMove: bestMoveData.move,
      evaluationDrop,
      tacticalMotifs,
      positionalFactors: afterEval.factors
    };
  }

  private evaluatePosition(): { total: number; factors: any } {
    const material = this.evaluateMaterial();
    const kingSafety = this.evaluateKingSafety();
    const pawnStructure = this.evaluatePawnStructure();
    const pieceActivity = this.evaluatePieceActivity();
    const centerControl = this.evaluateCenterControl();
    const endgameFactors = this.evaluateEndgame();

    const factors = {
      kingSafety,
      pawnStructure,
      pieceActivity,
      centerControl
    };

    const total = material + kingSafety + pawnStructure + pieceActivity + centerControl + endgameFactors;

    return { total, factors };
  }

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

    // Check if in check
    if (this.chess.inCheck()) {
      safety -= this.chess.turn() === 'w' ? 0.5 : -0.5;
    }

    // Evaluate pawn shield
    const kingSquare = this.findKing('w');
    const enemyKingSquare = this.findKing('b');

    if (kingSquare) {
      safety += this.evaluatePawnShield(kingSquare, 'w') * 0.1;
    }
    if (enemyKingSquare) {
      safety -= this.evaluatePawnShield(enemyKingSquare, 'b') * 0.1;
    }

    return safety;
  }

  private evaluatePawnStructure(): number {
    let score = 0;
    const board = this.chess.board();

    // Evaluate doubled pawns, isolated pawns, passed pawns
    for (let file = 0; file < 8; file++) {
      const whitePawns = [];
      const blackPawns = [];

      for (let rank = 0; rank < 8; rank++) {
        const piece = board[rank][file];
        if (piece && piece.type === 'p') {
          if (piece.color === 'w') {
            whitePawns.push(rank);
          } else {
            blackPawns.push(rank);
          }
        }
      }

      // Doubled pawns penalty
      if (whitePawns.length > 1) score -= 0.1 * (whitePawns.length - 1);
      if (blackPawns.length > 1) score += 0.1 * (blackPawns.length - 1);

      // Passed pawns bonus
      score += this.evaluatePassedPawns(file, whitePawns, blackPawns);
    }

    return score;
  }

  private evaluatePieceActivity(): number {
    let activity = 0;

    // Count legal moves for mobility
    const whiteMoves = this.chess.turn() === 'w' ? this.chess.moves().length : 0;
    this.chess.load(this.chess.fen().replace(' w ', ' b ').replace(' b ', ' w '));
    const blackMoves = this.chess.moves().length;

    activity += (whiteMoves - blackMoves) * 0.05;

    return activity;
  }

  private evaluateCenterControl(): number {
    let control = 0;
    const centerSquares = [
      [3, 3], [3, 4], [4, 3], [4, 4], // d4, d5, e4, e5
      [2, 2], [2, 3], [2, 4], [2, 5], // c3, c4, c5, c6
      [3, 2], [4, 2], [5, 2], // d3, e3, f3
      [3, 5], [4, 5], [5, 5]  // d6, e6, f6
    ];

    centerSquares.forEach(([rank, file]) => {
      const piece = this.chess.board()[rank][file];
      if (piece) {
        const value = piece.type === 'p' ? 0.1 : 0.2;
        control += piece.color === 'w' ? value : -value;
      }
    });

    return control;
  }

  private evaluateEndgame(): number {
    const totalPieces = this.countTotalPieces();

    if (totalPieces <= 6) {
      // King activity becomes more important in endgame
      return this.evaluateKingActivity() * 0.3;
    }

    return 0;
  }

  private async findBestMove(): Promise<{ move: string; evaluation: number }> {
    const moves = this.chess.moves();
    if (moves.length === 0) return { move: '', evaluation: 0 };

    let bestMove = moves[0];
    let bestEvaluation = -Infinity;

    // Analyze top candidate moves
    const movesToAnalyze = Math.min(moves.length, 5);

    for (let i = 0; i < movesToAnalyze; i++) {
      const move = moves[i];
      this.chess.move(move);

      const evaluation = -this.evaluatePosition().total; // Negate for opponent

      if (evaluation > bestEvaluation) {
        bestEvaluation = evaluation;
        bestMove = move;
      }

      this.chess.undo();
    }

    return { move: bestMove, evaluation: bestEvaluation };
  }

  private classifyMove(evaluationDrop: number, move: string, bestMove: string): AdvancedEvaluation['classification'] {
    // More nuanced classification based on centipawn loss
    if (move === bestMove || evaluationDrop <= 5) return 'excellent';
    if (evaluationDrop <= 15) return 'good';
    if (evaluationDrop <= 30) return 'inaccuracy';
    if (evaluationDrop <= 75) return 'mistake';
    return 'blunder';
  }

  private findTacticalMotifs(beforeFen: string, afterFen: string): string[] {
    const motifs: string[] = [];

    this.chess.load(beforeFen);
    const beforeMaterial = this.evaluateMaterial();

    this.chess.load(afterFen);
    const afterMaterial = this.evaluateMaterial();

    // Check for captures
    if (Math.abs(afterMaterial - beforeMaterial) > 0.5) {
      motifs.push('Material gain/loss');
    }

    // Check for checks
    if (this.chess.inCheck()) {
      motifs.push('Check');
    }

    // Check for checkmate
    if (this.chess.isCheckmate()) {
      motifs.push('Checkmate');
    }

    // Check for stalemate
    if (this.chess.isStalemate()) {
      motifs.push('Stalemate');
    }

    return motifs;
  }

  private findKing(color: 'w' | 'b'): [number, number] | null {
    const board = this.chess.board();
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && piece.type === 'k' && piece.color === color) {
          return [rank, file];
        }
      }
    }
    return null;
  }

  private evaluatePawnShield(kingPos: [number, number], color: 'w' | 'b'): number {
    let shield = 0;
    const [kingRank, kingFile] = kingPos;
    const direction = color === 'w' ? -1 : 1;

    // Check pawns in front of king
    for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
      const file = kingFile + fileOffset;
      if (file >= 0 && file < 8) {
        for (let rankOffset = 1; rankOffset <= 2; rankOffset++) {
          const rank = kingRank + direction * rankOffset;
          if (rank >= 0 && rank < 8) {
            const piece = this.chess.board()[rank][file];
            if (piece && piece.type === 'p' && piece.color === color) {
              shield += 1.0 / rankOffset; // Closer pawns more valuable
              break;
            }
          }
        }
      }
    }

    return shield;
  }

  private evaluatePassedPawns(file: number, whitePawns: number[], blackPawns: number[]): number {
    let score = 0;

    // A pawn is passed if there are no enemy pawns on the same file or adjacent files that can stop it
    whitePawns.forEach(rank => {
      if (this.isPassed(file, rank, 'w')) {
        score += 0.2 * (7 - rank); // More advanced passed pawns are more valuable
      }
    });

    blackPawns.forEach(rank => {
      if (this.isPassed(file, rank, 'b')) {
        score -= 0.2 * rank; // More advanced passed pawns are more valuable
      }
    });

    return score;
  }

  private isPassed(file: number, rank: number, color: 'w' | 'b'): boolean {
    const direction = color === 'w' ? -1 : 1;
    const board = this.chess.board();

    // Check if there are enemy pawns that can stop this pawn
    for (let checkFile = Math.max(0, file - 1); checkFile <= Math.min(7, file + 1); checkFile++) {
      for (let checkRank = rank + direction;
           color === 'w' ? checkRank >= 0 : checkRank < 8;
           checkRank += direction) {
        const piece = board[checkRank][checkFile];
        if (piece && piece.type === 'p' && piece.color !== color) {
          return false; // Enemy pawn can stop this pawn
        }
      }
    }

    return true;
  }

  private evaluateKingActivity(): number {
    const kingSquares = this.findKing('w');
    const enemyKingSquares = this.findKing('b');

    if (!kingSquares || !enemyKingSquares) return 0;

    // In endgame, centralized kings are better
    const [wRank, wFile] = kingSquares;
    const [bRank, bFile] = enemyKingSquares;

    const wCentrality = Math.abs(wRank - 3.5) + Math.abs(wFile - 3.5);
    const bCentrality = Math.abs(bRank - 3.5) + Math.abs(bFile - 3.5);

    return (bCentrality - wCentrality) * 0.1;
  }

  private countTotalPieces(): number {
    let count = 0;
    const board = this.chess.board();

    board.forEach(row => {
      row.forEach(square => {
        if (square && square.type !== 'k') {
          count++;
        }
      });
    });

    return count;
  }

  async close(): Promise<void> {
    console.log('🔧 Advanced analyzer closed');
    return Promise.resolve();
  }
}