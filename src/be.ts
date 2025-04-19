
function temp(): number {
    console.log("123");

    return 1;
}
temp()

// play area
let ROW_NUM = 4;
let REEL_NUM = 5;
const SYMBOLS = [0, 1, 2, 3, 4, 5]

const PAY_TABLE =
    [
        [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    ]


const REEL_1 = [1, 4, 0, 5, 5, 3, 1]
const REEL_2 = [2, 2, 5, 4, 2, 5, 3]
const REEL_3 = [1, 5, 0, 1, 4, 3, 1]
const REEL_4 = [1, 2, 4, 0, 2, 3, 2]
const REEL_5 = [1, 2, 3, 1, 5, 3, 4]
const REEL_6 = [5, 2, 3, 0, 2, 5, 1]

const REEL_SET = [REEL_1, REEL_2, REEL_3, REEL_4, REEL_5, REEL_6];

/** class of position
 * x and y are coordinates
 */
class Position {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

/** class of win
 * symID: id of win symbols
 * positions: coordinates of win symbols
 * amount: amount of win
 */
export class Win {
    symId: number;
    positions: Position[];
    amount: number;

    constructor(symId: number, positions: Position[], amount: number) {
        this.symId = symId;
        this.positions = positions;
        this.amount = amount;
    }
}

/** class of spin result
 * reelStops: spin results
 * wins: if more than one win conbination occurs at one time, it contains all win conbinations
 */
class SpinRes {
    reelStopsFirst: number[]
    reelStops: number[][]
    wins: Win[]

    constructor(reelStopsFirst: number[], reelStops: number[][], wins: Win[]) {
        this.reelStopsFirst = reelStopsFirst;
        this.reelStops = reelStops;
        this.wins = wins;
    }
}


// get the all symbols and reels of reel set
export function GetReelSet(): number[][] {
    return REEL_SET;
}

// get the number of rows of play area
export function GetRowNum(): number {
    return ROW_NUM;
}
export function GetReelNum(): number {
    return REEL_NUM;
}

export function SetReelNum(value: number) {
    REEL_NUM = value;
}

export function SetRowNum(value: number) {
    ROW_NUM = value;
}

// get spin result
function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
}

export function GetSpinResult(): SpinRes {
    const reelStopsFirst = [];
    const reelStops: number[][] = [];
    // every reel
    for (let i = 0; i < REEL_NUM; i++) {

        const reel = REEL_SET[i];
        const reelLength = reel.length;
        const stopIndex = getRandomInt(0, reel.length);
        // random index of every symbol of the first row
        reelStopsFirst.push(stopIndex);

        const symbols: number[] = [];
        for (let j = 0; j < ROW_NUM; j++) {
            const index = (stopIndex + j) % reelLength;
            symbols.push(reel[index]);
        }
        reelStops.push(symbols);
    }
    // console.log('reel1 ' + REEL_SET[0]);

    // console.log('reelstopFirst ' + reelStopsFirst);

    return new SpinRes(reelStopsFirst, reelStops, winResults(reelStops));
}


function winResults(reelStops: number[][]): Win[] {
    const wins: Win[] = []
    // every symbol type 
    for (let symbolId = 0; symbolId < SYMBOLS.length; symbolId++) {
        let symbolNum = 0;
        const win = new Win(symbolId, [], 0)

        // every reel
        for (let reelId = 0; reelId < REEL_NUM; reelId++) {
            const reelStop = reelStops[reelId]

            // every symbol of one reel
            for (let symbolY = 0; symbolY < ROW_NUM; symbolY++) {
                const symbolIndex = reelStop[symbolY]
                const symbolPosition = new Position(reelId, symbolY)
                if (symbolIndex === symbolId) {
                    symbolNum++
                    win.positions.push(symbolPosition)
                }
            }
        }
        win.amount = PAY_TABLE[symbolId][symbolNum]
        if (win.amount > 0) { wins.push(win) }
    }
    return wins
}



// ---- test -----
const spin = GetSpinResult();
console.log(spin);


