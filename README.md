[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/y6xxJB6y)
# [sudoku](https://sudoku.jonasgeiler.com)

这是一个用Svelte和TailwindCSS构建的简洁数独游戏。

## 📦 项目状态

### Homework 1 ✅
- ✅ `Sudoku` 对象 - 棋盘状态管理与规则验证
- ✅ `Game` 对象 - 游戏会话与历史管理
- ✅ Undo/Redo - 完整的历史回溯
- ✅ 序列化/反序列化 - 游戏状态持久化
- ✅ Svelte Store 接入 - UI响应式数据流

### Homework 2 ✅ NEW
- ✅ **棋盘初始化** - 游戏启动时自动生成合法局面
- ✅ **提示功能** - 候选数提示和下一步推断
- ✅ **探索模式** - 支持尝试/回滚/记忆的分支探索

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📚 核心设计

### 域对象层次

```
Sudoku (棋盘)
├── 状态：grid (9x9数组)
├── 规则验证：guess(), getInvalidCells()
├── 规则分析：getCandidates(), getNextHints() [Homework 2新增]
└── 序列化：toJSON(), fromJSON()

Game (游戏)
├── 会话管理：newGame(), getSudoku()
├── 历史管理：undo(), redo(), guess()
├── 胜利判定：isWon()
├── 提示聚合：getNextHints() → Sudoku [Homework 2新增]
├── 探索模式：enterExploreMode(), commitExplore(), abandonExplore() [Homework 2新增]
└── 序列化：toJSON(), fromJSON()

Store Adapter (createGameStore)
├── 暴露UI状态：grid, candidates, invalidCells, won, paused
├── 暴露UI操作：guess(), undo(), redo(), pause(), resume()
├── 提示接口：nextHints, getAllCandidates() [Homework 2新增]
└── 探索接口：enterExplore(), commitExplore(), abandonExplore() [Homework 2新增]
```

## 🎯 Homework 2 核心功能

### 1. 棋盘初始化

```javascript
// Welcome.svelte
const initialGrid = validateSencode(sencode) 
  ? decodeSencode(sencode)
  : generateSudoku(difficulty)

gameStore.newGame(initialGrid)
```

### 2. 提示功能

```javascript
// 获取单个格子的候选数
const candidates = game.getCandidates(row, col)  // [1,2,3,5]

// 获取所有格子的候选数映射
const allCandidates = game.getAllCandidates()  // {"0,1": [1,2], ...}

// 获取下一步推断（唯一候选的格子）
const nextHints = game.getNextHints()  // [{row:1, col:2, value:5}, ...]
```

### 3. 探索模式

```javascript
// 进入探索模式（保存快照）
gameStore.enterExplore()

// 填写数字（可undo/redo）
gameStore.guess({ row: 0, col: 0, value: 5 })

// 检查是否已知失败
if (gameStore.isKnownFailedState()) {
  alert('此路已探索失败')
  gameStore.abandonExplore()  // 放弃回滚
} else {
  gameStore.commitExplore()   // 确认提交
}
```

## 📖 文档

- **[EVOLUTION.md](./EVOLUTION.md)** - 设计演进与决策详解（必读）
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - 功能使用指南
- **[HOMEWORK2_SUMMARY.md](./HOMEWORK2_SUMMARY.md)** - 完成总结
- **[TEST_HOMEWORK2.js](./TEST_HOMEWORK2.js)** - 单元测试用例

## 🏗️ 项目结构

```
src/
├── domain/                    # 核心域对象
│   ├── game.js               # Game类（Homework 1/2）
│   ├── sudoku.js             # Sudoku类（Homework 1/2）
│   └── utils.js              # 工具函数
├── node_modules/@sudoku/stores/
│   └── createGameStore.js    # Store Adapter（Homework 1/2）
├── components/               # UI组件
│   ├── Board/                # 棋盘显示
│   ├── Controls/             # 游戏控制
│   ├── Header/               # 菜单栏
│   ├── Modal/                # 弹窗（Welcome等）
│   └── Utils/                # 工具组件
├── App.svelte                # 主应用入口
└── styles/                   # 样式文件
```

## 📊 关键设计决策

| 问题 | 决策 | 理由 |
|-----|------|------|
| 候选数在哪里？ | Sudoku | 是棋盘规则的分析，不涉及状态转移 |
| 探索如何实现？ | 快照栈 + 状态标志 | 支持嵌套探索，隔离分支状态 |
| 初始化由谁驱动？ | Welcome弹窗 | 用户显式选择，符合UX流程 |
| 提示属于谁？ | Sudoku + Game | Sudoku分析，Game聚合暴露 |
| History会变吗？ | 线性 + 快照栈 | 保留原有线性，探索用栈 |

## ✅ 测试与验证

```bash
# 运行Homework 2测试
node TEST_HOMEWORK2.js

# 手动测试清单
[ ] 启动应用 → Welcome弹窗显示
[ ] 选择难度 → 棋盘生成
[ ] 输入编码 → 自定义题目加载
[ ] 显示候选数 → 提示准确
[ ] 进入探索 → 可Undo/Redo
[ ] 放弃探索 → 状态回滚
[ ] 提交探索 → 可Undo整个结果
```

## 🎨 UI集成建议

### 显示候选数
```svelte
<div class="candidates">
  {#each $gameStore.candidates[`${row},${col}`] as num}
    <span>{num}</span>
  {/each}
</div>
```

### 显示推断提示
```svelte
{#if $gameStore.nextHints.length > 0}
  <p>下一步提示：{$gameStore.nextHints[0].value}可填在({$gameStore.nextHints[0].row},{$gameStore.nextHints[0].col})</p>
{/if}
```

### 探索模式控件
```svelte
{#if $gameStore.inExploreMode}
  <button on:click={() => gameStore.commitExplore()}>确认探索</button>
  <button on:click={() => gameStore.abandonExplore()}>放弃回滚</button>
{:else}
  <button on:click={() => gameStore.enterExplore()}>进入探索</button>
{/if}
```

## 🔗 相关资源

- [Svelte 文档](https://svelte.dev/)
- [TailwindCSS 文档](https://tailwindcss.com/)
- [数独规则](https://www.conceptispuzzles.com/index.aspx?a=27&ct=17&cd=42&f=0)

## 📝 许可证

[MIT License](LICENSE)

---

Have fun! 😉

> [!NOTE]
> Homework 2 已完成！
> - ✅ 棋盘自动初始化
> - ✅ 候选数提示
> - ✅ 下一步推断  
> - ✅ 探索模式（尝试/回滚/记忆）
> - ✅ 完整文档与测试