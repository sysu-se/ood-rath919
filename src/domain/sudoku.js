import { deepClone } from './utils.js';

const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

/**
 * Sudoku类：负责棋盘状态
 */
export class Sudoku {
    #grid;

    /**
     * @param {number[][]} inputGrid
     */
    constructor(inputGrid) {
        this.#grid = deepClone(inputGrid);
    }

    /** 获取棋盘 */
    getGrid() {
        return deepClone(this.#grid);
    }

    /**
     * 执行一次填写
     * @param {{row:number, col:number, value:number}} move
     */
    guess({ row, col, value }) {
        // 验证坐标范围
        if (
            row < 0 || row >= this.#grid.length ||
            col < 0 || col >= this.#grid[0].length
        ) {
            throw new Error('Invalid move: out of bounds');
        }

        // 验证值域
        if (value < 0 || value > 9 || !Number.isInteger(value)) {
            throw new Error('Invalid value: must be integer between 0 and 9');
        }

        this.#grid[row][col] = value;
    }

    /** 深拷贝当前 Sudoku */
    clone() {
        return new Sudoku(this.#grid);
    }

    /** 文本输出 */
    toString() {
        return this.#grid.map(row => row.join(' ')).join('\n');
    }

    /** 序列化 */
    toJSON() {
        return {
            grid: deepClone(this.#grid)
        };
    }

    /** 反序列化 */
    static fromJSON(json) {
        if (!json || !Array.isArray(json.grid)) {
            throw new Error('Invalid JSON for Sudoku');
        }
        return new Sudoku(json.grid);
    }
	
	/**
	 * 美化打印当前Sudoku棋盘
	 */
	printSudoku() {
		const sudoku = this.#grid;
		let out = '╔═══════╤═══════╤═══════╗\n';
	
		for (let row = 0; row < SUDOKU_SIZE; row++) {
			if (row !== 0 && row % BOX_SIZE === 0) {
				out += '╟───────┼───────┼───────╢\n';
			}
	
			for (let col = 0; col < SUDOKU_SIZE; col++) {
				if (col === 0) {
					out += '║ ';
				} else if (col % BOX_SIZE === 0) {
					out += '│ ';
				}
	
				out += (sudoku[row][col] === 0 ? '·' : sudoku[row][col]) + ' ';
	
				if (col === SUDOKU_SIZE - 1) {
					out += '║';
				}
			}
	
			out += '\n';
		}
	
		out += '╚═══════╧═══════╧═══════╝';
	
		console.log(out);
	}

    /**
     * 获取所有冲突/无效格子
     */
	getInvalidCells() {
		const grid = this.getGrid();
		const invalid = new Set();

		for (let y = 0; y < 9; y++) {
			for (let x = 0; x < 9; x++) {
				const value = grid[y][x];
				if (value === 0) continue;

				for (let i = 0; i < 9; i++) {
					if (i !== x && grid[y][i] === value) {
						invalid.add(`${x},${y}`);
						invalid.add(`${i},${y}`);
					}
				}

				for (let i = 0; i < 9; i++) {
					if (i !== y && grid[i][x] === value) {
						invalid.add(`${x},${y}`);
						invalid.add(`${x},${i}`);
					}
				}

				const startRow = Math.floor(y / 3) * 3;
				const startCol = Math.floor(x / 3) * 3;

				for (let i = startRow; i < startRow + 3; i++) {
					for (let j = startCol; j < startCol + 3; j++) {
						if ((i !== y || j !== x) && grid[i][j] === value) {
							invalid.add(`${x},${y}`);
							invalid.add(`${j},${i}`);
						}
					}
				}
			}
		}

		return Array.from(invalid);
	}

	/**
	 * 获取某个格子的候选数集合
	 * @param {number} row
	 * @param {number} col
	 * @returns {number[]} 候选数组
	 */
	getCandidates(row, col) {
		const grid = this.getGrid();
		
		// 如果格子已填，无候选
		if (grid[row][col] !== 0) return [];
		
		const candidates = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		
		// 同行冲突去除
		for (let i = 0; i < 9; i++) {
			if (grid[row][i] !== 0) candidates.delete(grid[row][i]);
		}
		
		// 同列冲突去除
		for (let i = 0; i < 9; i++) {
			if (grid[i][col] !== 0) candidates.delete(grid[i][col]);
		}
		
		// 同宫冲突去除
		const boxRow = Math.floor(row / 3) * 3;
		const boxCol = Math.floor(col / 3) * 3;
		for (let i = boxRow; i < boxRow + 3; i++) {
			for (let j = boxCol; j < boxCol + 3; j++) {
				if (grid[i][j] !== 0) candidates.delete(grid[i][j]);
			}
		}
		
		return Array.from(candidates).sort((a, b) => a - b);
	}

	/**
	 * 获取所有空格的候选数映射 {row,col} -> [candidates]
	 * @returns {Object} 格式：{"row,col": [1,2,3...]}
	 */
	getAllCandidates() {
		const grid = this.getGrid();
		const result = {};
		
		for (let row = 0; row < 9; row++) {
			for (let col = 0; col < 9; col++) {
				if (grid[row][col] === 0) {
					const candidates = this.getCandidates(row, col);
					if (candidates.length > 0) {
						result[`${row},${col}`] = candidates;
					}
				}
			}
		}
		
		return result;
	}

	/**
	 * 寻找所有唯一候选的格子（即只有一个候选数的格子）
	 * @returns {Array} [{row, col, value}]
	 */
	findUniqueCandidates() {
		const grid = this.getGrid();
		const uniqueCandidates = [];
		
		for (let row = 0; row < 9; row++) {
			for (let col = 0; col < 9; col++) {
				if (grid[row][col] === 0) {
					const candidates = this.getCandidates(row, col);
					if (candidates.length === 1) {
						uniqueCandidates.push({
							row,
							col,
							value: candidates[0]
						});
					}
				}
			}
		}
		
		return uniqueCandidates;
	}
}

export function createSudoku(inputGrid) {
    return new Sudoku(inputGrid);
}

export function createSudokuFromJSON(json) {
    return Sudoku.fromJSON(json);
}