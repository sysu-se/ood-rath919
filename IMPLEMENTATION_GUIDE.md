# 实现完成指南 - Homework 2

## 完成内容总览

### ✅ 部分1：棋盘初始化功能

**目标**：游戏开始时自动生成合法的游戏局面，用户填写第一个数字时开始

**实现方式**：
1. **App.svelte** - 移除硬编码的demoGrid，改为由Welcome弹窗驱动
2. **Welcome.svelte** - 接收gameStore，通过`gameStore.newGame(initialGrid)`启动游戏
3. **Dropdown.svelte** - 改用gameStore而不是旧的startNew/startCustom
4. **Modal.svelte** - 传递gameStore给Welcome组件

**关键流程**：
```
用户打开应用
  ↓
App.onMount() 显示Welcome弹窗 + 传入gameStore
  ↓
用户选择难度或输入自定义编码
  ↓
Welcome调用 gameStore.newGame(generatedGrid)
  ↓
棋盘初始化，用户可开始填写
```

---

### ✅ 部分2：提示功能（Hint System）

**在Sudoku中实现**：
- `getCandidates(row, col): number[]` - 获取单个格子的候选数
- `getAllCandidates(): Object` - 获取所有空格的候选数映射 `{row,col: [1,2,3...]}`
- `findUniqueCandidates(): Array` - 找出所有只有一个候选数的格子

**在Game中暴露**：
- `Game.getCandidates(row, col)` - 委托给Sudoku
- `Game.getAllCandidates()` - 委托给Sudoku
- `Game.getNextHints()` - 返回可直接填写的推断数

**在Store中提供给UI**：
```javascript
// createGameStore.js
{
  candidates: game.getAllCandidates(),  // 所有候选数
  nextHints: game.getNextHints()         // 推断格子
}
```

**使用场景**：
```javascript
// UI显示候选数
const candidates = $gameStore.candidates['0,0']  // [1,2,3,5]

// 自动提示下一步
const hints = $gameStore.nextHints  // [{row:1, col:2, value:5}, ...]
```

---

### ✅ 部分3：探索模式（Explore Mode）

**在Game中实现**：

#### 核心数据结构
```javascript
#exploreStack = []          // 快照栈
#inExploreMode = false      // 模式标志
#exploredStates = Set()     // 失败记忆
```

#### 三个主要操作

**1) 进入探索 - `enterExploreMode()`**
```javascript
// 保存当前局面快照
// 重置undo/redo栈用于探索
// 设置inExploreMode = true
```

**2) 放弃探索 - `abandonExplore()`**
```javascript
// 从栈弹出快照
// 恢复到探索前状态
// 所有探索操作丢弃
```

**3) 提交探索 - `commitExplore()`**
```javascript
// 弹出快照，作为"合并点"
// 加入主undo栈
// 用户可后续撤销整个探索结果
```

#### 支持方法

**冲突判断**：`isConflict(x, y): boolean`
- 检查指定格子是否违反数独规则

**记忆功能**：
- `recordFailedState()` - 记录当前局面为"已探索失败"
- `isKnownFailedState()` - 检查是否是已知失败局面

**状态查询**：
- `isInExploreMode()` - 返回是否在探索模式

---

## Store Adapter更新

**createGameStore.js新增方法**：

```javascript
gameStore.enterExplore()      // 进入探索
gameStore.commitExplore()     // 提交探索
gameStore.abandonExplore()    // 放弃探索
gameStore.recordFailedState() // 记录失败
gameStore.isKnownFailedState() // 检查是否已知失败

// 新增state属性
$gameStore.inExploreMode     // 是否在探索模式
$gameStore.nextHints         // 推断格子列表
```

---

## 使用示例

### 例子1：显示候选数提示

```svelte
<script>
  import { gameStore } from '@sudoku/stores/createGameStore'
</script>

{#if $gameStore.candidates['2,3']}
  <p>格子(2,3)的候选数：{$gameStore.candidates['2,3'].join(',')}</p>
{/if}
```

### 例子2：自动提示下一步

```svelte
{#each $gameStore.nextHints as hint}
  <div class="hint">
    格子({hint.row},{hint.col})只能填{hint.value}
  </div>
{/each}
```

### 例子3：使用探索模式

```javascript
// 用户点击"尝试"时
function tryExplore(row, col, value) {
  if (!$gameStore.inExploreMode) {
    gameStore.enterExplore()
  }
  
  gameStore.guess({ row, col, value })
  
  // 检查是否已知失败
  if (gameStore.isKnownFailedState()) {
    alert('此路已知失败')
    gameStore.abandonExplore()
  }
}

// 确认探索结果
function confirmExplore() {
  gameStore.commitExplore()
}

// 放弃回滚
function backtrack() {
  gameStore.abandonExplore()
}
```

---

## 设计决策总结

| 决策 | 理由 |
|------|------|
| 候选数在Sudoku中 | 提示是棋盘分析，不涉及状态转移 |
| 提示在Game中聚合 | 便于暴露给Store和UI |
| 探索用快照栈 | 支持嵌套探索，简化实现 |
| 快照不序列化 | 探索是临时交互状态 |
| 独立的探索undo栈 | 防止污染主history |
| 记忆用Hash | 快速判断是否到达已失败局面 |

---

## 向后兼容性

✅ **所有Homework 1的功能保留**：
- Sudoku.guess() / Sudoku.getGrid() / Sudoku.clone()
- Game.undo() / Game.redo() / Game.canUndo() / Game.canRedo()
- Game.isWon() / Game.isConflict()
- 序列化/反序列化保持兼容
- Store的guess/undo/redo/pause/resume

✅ **扩展不破坏现有**：
- 新方法都是additive，不改变原方法签名
- 探索模式是可选的，不在explore时行为完全同Homework 1

---

## 测试建议

### 单元测试范围

1. **Sudoku.getCandidates()**
   - 空棋盘：应返回[1-9]
   - 有冲突：应排除冲突的数字
   - 已填格：应返回[]

2. **Game.getNextHints()**
   - 应返回所有唯一候选的格子

3. **Game探索流程**
   ```
   Normal → enterExplore → Guess → commitExplore → Normal ✓
   Normal → enterExplore → Guess → abandonExplore → Normal ✓
   ```

4. **Undo/Redo在探索时**
   - 探索中的Guess应被探索的undo/redo管理
   - 探索外的Undo应不受影响

### 集成测试范围

1. Welcome → 生成新局 → 棋盘显示 ✓
2. 下拉菜单 → 选择难度 → 新局 ✓
3. 显示候选数 → 更新正确 ✓
4. 进入探索 → Guess → 回滚 ✓

---

## 文件修改清单

### 核心域对象
- ✅ `src/domain/sudoku.js` - 新增候选数方法
- ✅ `src/domain/game.js` - 新增提示和探索方法

### Store Adapter
- ✅ `src/node_modules/@sudoku/stores/createGameStore.js` - 新增方法和状态

### UI组件
- ✅ `src/App.svelte` - 移除硬编码初始化
- ✅ `src/components/Modal/Types/Welcome.svelte` - 接收gameStore
- ✅ `src/components/Header/Dropdown.svelte` - 使用gameStore
- ✅ `src/components/Modal/index.svelte` - 传递gameStore

### 文档
- ✅ `EVOLUTION.md` - 设计演进详细说明

---

## 后续可选扩展

1. **多层级提示**
   - 不只显示候选数，还显示原因（行冲突/列冲突/宫冲突）

2. **自动求解**
   - 使用现有的`getNextHints()`快速推进
   - 与Explore Mode结合做深度优先搜索

3. **探索可视化**
   - 高亮显示当前探索分支的格子
   - 显示已失败分支的预警

4. **分支管理**
   - 显示探索栈深度
   - 允许用户在分支间切换

5. **提示统计**
   - 记录使用了多少次提示
   - 游戏结束后显示"自主率"

---

## 问题排查

### Q: 为什么候选数在Sudoku不在Game?
**A**: Sudoku负责"棋盘本身"，包括状态和规则。候选数是对规则的分析，属于Sudoku职责。Game只管理"游戏会话"（history、模式切换）。

### Q: 为什么探索快照不序列化?
**A**: 探索是临时交互状态。用户存档不应包含"正在探索中"的状态。序列化时只保留最终结果。

### Q: 能否嵌套探索?
**A**: 能。`#exploreStack`是栈，支持多层。每进入一层，就push一个快照。

### Q: 探索中能Undo/Redo吗?
**A**: 能。探索时使用独立的undo/redo栈。commit时作为整体操作合并到主undo栈。

---

## 性能考虑

- **候选数计算**：O(1)格子查询或O(81)全盘扫描，可接受
- **快照开销**：81个单元格的deepClone，毫秒级
- **记忆开销**：Set存储JSON字符串，最多几十条失败路径

**结论**：所有操作对实时游戏体验无明显影响。
