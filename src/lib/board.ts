import { Chess, Square } from "chess.js";

interface Coordinate {
    x: number,
    y: number
}

export interface InfluencingPiece {
    square: Square,
    color: string,
    type: string
}

export const promotions = [undefined, "b", "n", "r", "q"];

export const pieceValues: { [key: string]: number } = {
    "p": 1,
    "n": 3,
    "b": 3,
    "r": 5,
    "q": 9,
    "k": Infinity,
    "m": 0
};

function getBoardCoordinates(square: Square): Coordinate {
    return {
        x: "abcdefgh".indexOf(square[0]),
        y: parseInt(square[1]) - 1
    };
}

function getSquare(coordinate: Coordinate): Square {
    return ("abcdefgh"[coordinate.x] + (coordinate.y + 1).toString()) as Square;
}

export function getAttackers(fen: string, square: Square): InfluencingPiece[] {
    let attackers: InfluencingPiece[] = [];
    let board = new Chess(fen);
    let piece = board.get(square);
    if (!piece) return [];

    board.load(fen
        .replace(/(?<= )(?:w|b)(?= )/g, piece.color === "w" ? "b" : "w")
        .replace(/ [a-h][1-8] /g, " - ")
    );

    let legalMoves = board.moves({ verbose: true });

    for (let move of legalMoves) {
        if (move.to === square) {
            attackers.push({
                square: move.from,
                color: move.color,
                type: move.piece
            });
        }
    }

    return attackers;
}

export function getDefenders(fen: string, square: Square): InfluencingPiece[] {
    let board = new Chess(fen);
    let piece = board.get(square);
    if (!piece) return [];

    let attackers = getAttackers(fen, square);
    let testAttacker = attackers[0];

    if (testAttacker) {
        board.load(fen
            .replace(/(?<= )(?:w|b)(?= )/g, testAttacker.color)
            .replace(/ [a-h][1-8] /g, " - ")
        );

        for (let promotion of promotions) {
            try {
                board.move({
                    from: testAttacker.square,
                    to: square,
                    promotion: promotion
                });
                return getAttackers(board.fen(), square);
            } catch {}
        }
    } else {
        board.load(fen
            .replace(/(?<= )(?:w|b)(?= )/g, piece.color)
            .replace(/ [a-h][1-8] /g, " - ")
        );
        
        board.put({
            color: piece.color === "w" ? "b" : "w",
            type: "q"
        }, square);
        
        return getAttackers(board.fen(), square);
    }

    return [];
}

export function isPieceHanging(lastFen: string, fen: string, square: Square): boolean {
    let lastBoard = new Chess(lastFen);
    let board = new Chess(fen);

    let lastPiece = lastBoard.get(square);
    let piece = board.get(square);

    if (!piece || !lastPiece) return false;

    let attackers = getAttackers(fen, square);
    let defenders = getDefenders(fen, square);

    if (
        pieceValues[lastPiece.type] >= pieceValues[piece.type] &&
        lastPiece.color !== piece.color
    ) {
        return false;
    }

    if (
        piece.type === "r" &&
        pieceValues[lastPiece.type] === 3 &&
        attackers.every(atk => pieceValues[atk.type] === 3) &&
        attackers.length === 1
    ) {
        return false;
    }

    if (attackers.some(atk => pieceValues[atk.type] < pieceValues[piece.type])) {
        return true;
    }

    return attackers.length > defenders.length;
}