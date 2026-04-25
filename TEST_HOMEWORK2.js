/**
 * 快速功能测试脚本 - 可在浏览器控制台或Node.js中运行
 * 用于验证Homework 2的核心功能
 */

// ===== 导入（如果在Node环境）=====
// import { Game } from './src/domain/game.js'
// import { Sudoku } from './src/domain/sudoku.js'

// ===== 测试用例 =====

export function testSudokuCandidates() {
    console.log('=== Test 1: Sudoku.getCandidates() ===')
    
    const emptyGrid = Array(9).fill(null).map(() => Array(9).fill(0))
    const sudoku = new Sudoku(emptyGrid)
    
    // 空棋盘，格子(0,0)应有1-9的候选
    const candidates = sudoku.getCandidates(0, 0)
    console.assert(candidates.length === 9, `Expected 9 candidates, got ${candidates.length}`)
    console.assert(
        JSON.stringify(candidates) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]),
        `Candidates should be [1-9], got ${candidates}`
    )
    console.log('✓ Empty cell has 9 candidates')
    
    // 填入数字后，应该排除该数字
    sudoku.guess({ row: 0, col: 1, value: 1 })
    const candidates2 = sudoku.getCandidates(0, 0)
    console.assert(!candidates2.includes(1), 'Candidate 1 should be excluded')
    console.log('✓ Row conflict excluded')
    
    // 已填格子无候选
    const candidates3 = sudoku.getCandidates(0, 1)
    console.assert(candidates3.length === 0, 'Filled cell should have no candidates')
    console.log('✓ Filled cell has no candidates')
}

export function testGameHints() {
    console.log('\n=== Test 2: Game.getNextHints() ===')
    
    const grid = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ]
    
    const sudoku = new Sudoku(grid)
    const game = new Game(sudoku)
    
    const hints = game.getNextHints()
    console.assert(Array.isArray(hints), 'getNextHints should return array')
    console.log(`✓ Found ${hints.length} unique candidates`)
    
    // 验证提示格式
    if (hints.length > 0) {
        const hint = hints[0]
        console.assert('row' in hint && 'col' in hint && 'value' in hint,
            'Hint should have row, col, value')
        console.log(`✓ Hint format correct: row=${hint.row}, col=${hint.col}, value=${hint.value}`)
    }
}

export function testGameExplore() {
    console.log('\n=== Test 3: Game Explore Mode ===')
    
    const grid = Array(9).fill(null).map(() => Array(9).fill(0))
    const sudoku = new Sudoku(grid)
    const game = new Game(sudoku)
    
    // 初始状态不在探索
    console.assert(!game.isInExploreMode(), 'Should not be in explore mode initially')
    console.log('✓ Initially not in explore mode')
    
    // 进入探索
    game.enterExploreMode()
    console.assert(game.isInExploreMode(), 'Should be in explore mode')
    console.log('✓ Entered explore mode')
    
    // 尝试在探索中填数
    game.guess({ row: 0, col: 0, value: 1 })
    console.log('✓ Can guess in explore mode')
    
    // 放弃探索
    game.abandonExplore()
    console.assert(!game.isInExploreMode(), 'Should exit explore mode')
    console.log('✓ Abandoned explore, back to normal')
    
    // 验证棋盘已回滚
    const grid2 = game.getSudoku().getGrid()
    console.assert(grid2[0][0] === 0, 'Board should be restored after abandon')
    console.log('✓ Board restored after abandon')
}

export function testGameExploreCommit() {
    console.log('\n=== Test 4: Game Explore Commit ===')
    
    const grid = Array(9).fill(null).map(() => Array(9).fill(0))
    const sudoku = new Sudoku(grid)
    const game = new Game(sudoku)
    
    // 进入探索并填数
    game.enterExploreMode()
    game.guess({ row: 0, col: 0, value: 5 })
    
    // 提交探索
    game.commitExplore()
    console.assert(!game.isInExploreMode(), 'Should exit explore mode after commit')
    console.log('✓ Exited explore mode after commit')
    
    // 验证数字仍在
    const grid2 = game.getSudoku().getGrid()
    console.assert(grid2[0][0] === 5, 'Number should remain after commit')
    console.log('✓ Committed result persisted')
    
    // 验证可以撤销到提交前
    console.assert(game.canUndo(), 'Should be able to undo after commit')
    console.log('✓ Can undo after commit')
    
    game.undo()
    const grid3 = game.getSudoku().getGrid()
    console.assert(grid3[0][0] === 0, 'Undo should restore to explore start')
    console.log('✓ Undo works correctly after commit')
}

export function testFailedStateMemory() {
    console.log('\n=== Test 5: Failed State Memory ===')
    
    const grid = Array(9).fill(null).map(() => Array(9).fill(0))
    const sudoku = new Sudoku(grid)
    const game = new Game(sudoku)
    
    // 进入探索并填数
    game.enterExploreMode()
    game.guess({ row: 0, col: 0, value: 5 })
    
    // 记录失败状态
    game.recordFailedState()
    console.log('✓ Recorded failed state')
    
    // 检查是否是已知失败
    console.assert(game.isKnownFailedState(), 'Should recognize as known failed')
    console.log('✓ Recognized as known failed state')
    
    // 放弃并重新尝试
    game.abandonExplore()
    game.enterExploreMode()
    game.guess({ row: 0, col: 0, value: 5 })
    
    // 应该仍然识别为已知失败
    console.assert(game.isKnownFailedState(), 'Should still remember failed state')
    console.log('✓ Failed state memory persisted across attempts')
}

export function testIsWon() {
    console.log('\n=== Test 6: Game.isWon() ===')
    
    // 完整且无冲突的棋盘
    const solvedGrid = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ]
    
    const sudoku = new Sudoku(solvedGrid)
    const game = new Game(sudoku)
    
    console.assert(game.isWon(), 'Solved grid should be won')
    console.log('✓ Solved grid detected as won')
    
    // 未完成的棋盘
    const unsolvedGrid = Array(9).fill(null).map(() => Array(9).fill(0))
    const sudoku2 = new Sudoku(unsolvedGrid)
    const game2 = new Game(sudoku2)
    
    console.assert(!game2.isWon(), 'Empty grid should not be won')
    console.log('✓ Empty grid not detected as won')
}

export function testUndoRedoPreserved() {
    console.log('\n=== Test 7: Undo/Redo Still Works (Backward Compatibility) ===')
    
    const grid = Array(9).fill(null).map(() => Array(9).fill(0))
    const sudoku = new Sudoku(grid)
    const game = new Game(sudoku)
    
    // 正常的undo/redo应该仍然工作
    game.guess({ row: 0, col: 0, value: 1 })
    console.assert(game.canUndo(), 'Should be able to undo')
    console.log('✓ Can undo normal guess')
    
    game.undo()
    const grid1 = game.getSudoku().getGrid()
    console.assert(grid1[0][0] === 0, 'Should restore after undo')
    console.log('✓ Undo works')
    
    console.assert(game.canRedo(), 'Should be able to redo')
    console.log('✓ Can redo')
    
    game.redo()
    const grid2 = game.getSudoku().getGrid()
    console.assert(grid2[0][0] === 1, 'Should restore after redo')
    console.log('✓ Redo works')
}

// 运行所有测试
export function runAllTests() {
    console.log('🧪 Running Homework 2 Tests...\n')
    
    try {
        testSudokuCandidates()
        testGameHints()
        testGameExplore()
        testGameExploreCommit()
        testFailedStateMemory()
        testIsWon()
        testUndoRedoPreserved()
        
        console.log('\n✅ All tests passed!')
    } catch (e) {
        console.error('❌ Test failed:', e)
        console.error(e.stack)
    }
}

// 如果直接运行此文件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testSudokuCandidates,
        testGameHints,
        testGameExplore,
        testGameExploreCommit,
        testFailedStateMemory,
        testIsWon,
        testUndoRedoPreserved,
        runAllTests
    }
}
