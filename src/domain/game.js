import { Sudoku } from './sudoku.js';
import { deepClone } from './utils.js';

/**
 * Game类：管理游戏状态 + undo/redo
 */
export class Game {
    #currentSudoku;
    #initialSudoku;
    #undoStack = [];
    #redoStack = [];
    #isExploring = false;
    #exploreStartSudoku = null;
    #exploreHistory = [];
    #failedStates = new Set();
    constructor(sudoku) {
        if (!(sudoku instanceof Sudoku)) {
            throw new Error('Invalid Sudoku instance');
        }
        this.#currentSudoku = sudoku.clone();
        this.#initialSudoku = sudoku.clone();
    }

    /** 获取当前数独 */
    getSudoku() {
        return this.#currentSudoku.clone();
    }

    getInitialSudoku() {
        return this.#initialSudoku.clone();
    }

    /**
     * 执行一步操作，保证题目所给数字无法被用户操作
     * @param {{row:number, col:number, value:number}} move
     */
    guess(move) {
        const { row, col, value } = move;
        const initialgrid = this.#initialSudoku.getGrid();
        if (initialgrid[row][col] !== 0) return;

        this.#undoStack.push(this.#currentSudoku.clone());
        this.#currentSudoku.guess(move);
        this.#redoStack = [];
    }

    /** 撤销 */
    undo() {
        if (!this.canUndo()) return;

        this.#redoStack.push(this.#currentSudoku.clone());
        this.#currentSudoku = this.#undoStack.pop();
    }

    /** 重做 */
    redo() {
        if (!this.canRedo()) return;

        this.#undoStack.push(this.#currentSudoku.clone());
        this.#currentSudoku = this.#redoStack.pop();
    }

    canUndo() {
        return this.#undoStack.length > 0;
    }

    canRedo() {
        return this.#redoStack.length > 0;
    }

    /**
     * 判断是否胜利：棋盘已填满且无冲突
     */
    isWon() {
        const grid = this.#currentSudoku.getGrid();

        // 检查是否填满
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (grid[i][j] === 0) return false;
            }
        }

        // 检查无冲突
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                // 检查行
                for (let k = j + 1; k < 9; k++) {
                    if (grid[i][j] === grid[i][k]) return false;
                }
                // 检查列
                for (let k = i + 1; k < 9; k++) {
                    if (grid[i][j] === grid[k][j]) return false;
                }
            }
        }

        // 检查宫
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const values = new Set();
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        const val = grid[boxRow * 3 + i][boxCol * 3 + j];
                        if (values.has(val)) return false;
                        values.add(val);
                    }
                }
            }
        }

        return true;
    }

    /** 新游戏 */
    newGame(initialGrid) {
        this.resetGame(initialGrid);
    }

    /**
     * 重置游戏（修复：补全方法定义）
     * @param {number[][]} initialGrid
     */
    resetGame(initialGrid) {
        const grid = initialGrid || Array.from({ length: 9 }, () => Array(9).fill(0));
        this.#currentSudoku = new Sudoku(grid);
        this.#initialSudoku = new Sudoku(grid);
        // 重置历史栈，防止跨局污染
        this.#undoStack = [];
        this.#redoStack = [];
        // 重置探索状态
        this.#isExploring = false;
        this.#exploreStartSudoku = null;
        this.#exploreHistory = [];
        this.#failedStates = new Set();
    }

    /** 序列化 */
    toJSON() {
        return {
            currentSudoku: this.#currentSudoku.toJSON(),
            initialSudoku: this.#initialSudoku.toJSON(),
            undoStack: this.#undoStack.map(s => s.toJSON()),
            redoStack: this.#redoStack.map(s => s.toJSON()),
            isExploring: this.#isExploring,
            exploreStartSudoku: this.#exploreStartSudoku ? this.#exploreStartSudoku.toJSON() : null,
            exploreHistory: this.#exploreHistory.map(s => s.toJSON()),
            failedStates: Array.from(this.#failedStates)
        };
    }

    /** 反序列化 */
    static fromJSON(json) {
        if (!json || !json.currentSudoku || !json.initialSudoku) {
            throw new Error('Invalid JSON for Game');
        }

        const currentSudoku = Sudoku.fromJSON(json.currentSudoku);
        const initialSudoku = Sudoku.fromJSON(json.initialSudoku);

        const game = new Game(initialSudoku);
        
        // 直接赋值，移除私有方法 #restoreFromJSON
        game.#currentSudoku = currentSudoku;
        game.#undoStack = (json.undoStack || []).map(Sudoku.fromJSON);
        game.#redoStack = (json.redoStack || []).map(Sudoku.fromJSON);
        game.#isExploring = json.isExploring || false;
        game.#exploreStartSudoku = json.exploreStartSudoku ? Sudoku.fromJSON(json.exploreStartSudoku) : null;
        game.#exploreHistory = (json.exploreHistory || []).map(Sudoku.fromJSON);
        game.#failedStates = new Set(json.failedStates || []);

        return game;
    }

    /** 判断数字是否符合数独规则 */
    isConflict(x, y) {
        const grid = this.#currentSudoku.getGrid();
        const initialGrid = this.#initialSudoku.getGrid();

        // 初始格子不能改，直接认为不冲突
        if (initialGrid[y][x] !== 0) return false;

        const value = grid[y][x];

        if (value === 0) return false;

        for (let i = 0; i < 9; i++) {
            if (i !== x && grid[y][i] === value) {
                return true;
            }
        }

        for (let i = 0; i < 9; i++) {
            if (i !== y && grid[i][x] === value) {
                return true;
            }
        }

        const startRow = Math.floor(y / 3) * 3;
        const startCol = Math.floor(x / 3) * 3;

        for (let i = startRow; i < startRow + 3; i++) {
            for (let j = startCol; j < startCol + 3; j++) {
                if ((i !== y || j !== x) && grid[i][j] === value) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * ============ 提示功能 ============
     */

    /**
     * 获取指定格子的候选数
     * @param {number} row
     * @param {number} col
     * @returns {number[]}
     */
    getCandidates(row, col) {
        return this.#currentSudoku.getCandidates(row, col);
    }

    /**
     * 获取所有格子的候选数映射
     * @returns {Object}
     */
    getAllCandidates() {
        return this.#currentSudoku.getAllCandidates();
    }

    /**
     * 获取下一步提示（唯一候选的格子）
     * @returns {Array} [{row, col, value}]
     */
    getNextHints() {
        return this.#currentSudoku.findUniqueCandidates();
    }

    /**
     * 获取当前格子的提示信息，包括候选值和可填的下一步提示
     * @param {number} row
     * @param {number} col
     */
    getHint(row, col) {
        return {
            row,
            col,
            candidates: this.getCandidates(row, col),
            nextHints: this.getNextHints()
        };
    }

    /**
     * ============ 探索功能 ============
     */

    /**
     * 进入探索模式
     * 只有当没有唯一候选时才能进入
     */
    enterExplore() {
        if (this.#isExploring) return false;

        const hints = this.getNextHints();
        if (hints.length > 0) return false; // 有唯一候选，不能进入探索

        this.#isExploring = true;
        this.#exploreStartSudoku = this.#currentSudoku.clone();
        this.#exploreHistory = [];
        return true;
    }

    /**
     * 在探索模式中填写
     * @param {{row:number, col:number, value:number}} move
     * @returns {{success: boolean, reason?: string}}
     */
    exploreGuess(move) {
        if (!this.#isExploring) return { success: false, reason: 'not in explore mode' };

        const { row, col, value } = move;
        const initialGrid = this.#initialSudoku.getGrid();
        if (initialGrid[row][col] !== 0) return { success: false, reason: 'initial cell' };

        // 检查当前状态是否已失败
        const currentJson = JSON.stringify(this.#currentSudoku.toJSON());
        if (this.#failedStates.has(currentJson)) {
            return { success: false, reason: 'already failed state' };
        }

        // 保存当前状态
        const prevSudoku = this.#currentSudoku.clone();
        this.#currentSudoku.guess(move);
        this.#exploreHistory.push(prevSudoku);

        // 检查冲突
        if (this.isConflict(col, row)) {
            // 记录失败状态
            this.#failedStates.add(currentJson);
            // 回滚到探索起点
            this.#currentSudoku = this.#exploreStartSudoku.clone();
            this.#exploreHistory = [];
            return { success: false, reason: 'conflict' };
        }

        return { success: true };
    }

    /**
     * 提交探索结果，合并到主局面
     */
    commitExplore() {
        if (!this.#isExploring) return false;

        // 将探索起点推入undo栈
        this.#undoStack.push(this.#exploreStartSudoku.clone());
        this.#redoStack = [];

        // 重置探索状态
        this.#isExploring = false;
        this.#exploreStartSudoku = null;
        this.#exploreHistory = [];
        return true;
    }

    /**
     * 放弃探索，回滚到探索前
     */
    abortExplore() {
        if (!this.#isExploring) return false;

        this.#currentSudoku = this.#exploreStartSudoku.clone();
        this.#isExploring = false;
        this.#exploreStartSudoku = null;
        this.#exploreHistory = [];
        return true;
    }

    /**
     * 是否在探索模式中
     */
    isInExplore() {
        return this.#isExploring;
    }
}

export function createGame({ sudoku }) {
    return new Game(sudoku);
}

export function createGameFromJSON(json) {
    return Game.fromJSON(json);
}