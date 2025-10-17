import { Chess } from 'chess.js';
import { Game, Move, Player } from '../models/Game'
import { ChessComGame } from '../services/ChessComService'

export class PgnParser {
  static parseChessComGame(chessComGame: ChessComGame): Game {
    const chess = new Chess();
    const moves: Move[] = [];

    try {
      chess.loadPgn(chessComGame.pgn);
      const history = chess.history({ verbose: true });

      history.forEach((move, index) => {
        const moveNumber = Math.floor(index / 2) + 1;
        const isWhiteMove = index % 2 === 0;

        moves.push({
          san: move.san,
          fen: move.after,
          moveNumber,
          isWhiteMove
        });
      });

      return {
        id: chessComGame.uuid,
        url: chessComGame.url,
        pgn: chessComGame.pgn,
        timeControl: chessComGame.time_control,
        timeClass: chessComGame.time_class as any,
        endTime: new Date(chessComGame.end_time * 1000),
        rated: chessComGame.rated,
        white: {
          username: chessComGame.white.username,
          rating: chessComGame.white.rating,
          result: this.parseResult(chessComGame.white.result)
        },
        black: {
          username: chessComGame.black.username,
          rating: chessComGame.black.rating,
          result: this.parseResult(chessComGame.black.result)
        },
        accuracies: chessComGame.accuracies,
        rules: chessComGame.rules
      };
    } catch (error) {
      throw new Error(`Failed to parse PGN: ${error}`);
    }
  }

  private static parseResult(result: string): Player['result'] {
    switch (result) {
      case 'win':
        return 'win';
      case 'checkmated':
      case 'timeout':
      case 'resigned':
      case 'abandoned':
        return result as Player['result'];
      case 'agreed':
      case 'stalemate':
      case 'repetition':
      case 'insufficient':
        return 'draw';
      default:
        return 'lose';
    }
  }

  static extractMovesFromPgn(pgn: string): Move[] {
    const chess = new Chess();
    const moves: Move[] = [];

    try {
      chess.loadPgn(pgn);
      const history = chess.history({ verbose: true });

      history.forEach((move, index) => {
        const moveNumber = Math.floor(index / 2) + 1;
        const isWhiteMove = index % 2 === 0;

        moves.push({
          san: move.san,
          fen: move.after,
          moveNumber,
          isWhiteMove
        });
      });

      return moves;
    } catch (error) {
      throw new Error(`Failed to extract moves from PGN: ${error}`);
    }
  }

  static getOpeningName(pgn: string): string | undefined {
    const lines = pgn.split('\n');
    for (const line of lines) {
      if (line.startsWith('[Opening ') || line.startsWith('[ECO ')) {
        const match = line.match(/\[.*?"(.*)"\]/);
        if (match) {
          return match[1];
        }
      }
    }
    return undefined;
  }
}