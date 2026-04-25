# EVOLUTION.md - 设计演进文档

## 一、Homework 1 到 Homework 2 的演进

### 1. 你如何实现提示功能？

#### 实现方式

提示功能分为两个层级，都实现在 `Sudoku` 域对象中：

**a) 候选数提示（Candidate Hints）**
- 方法：`getCandidates(row, col): number[]` - 获取单个格子的候选数
- 方法：`getAllCandidates(): Object` - 获取所有空格的候选数映射
- 实现原理：
  - 对于每个空格，遍历同行、同列、同宫的已填数字
  - 从1-9的全集中排除这些数字，得到候选数集合

**b) 下一步提示（Next Step Hints）**
- 方法：`findUniqueCandidates(): Array` - 找出所有只有一个候选数的格子
- 返回格式：`[{row, col, value}, ...]`
- 这些格子可以直接填写，是推断数（naked single）

**c) Game 层的聚合**
- `Game.getCandidates(row, col)` - 委托给Sudoku
- `Game.getAllCandidates()` - 委托给Sudoku
- `Game.getNextHints()` - 委托给Sudoku的findUniqueCandidates
- Store Adapter通过`game.getAllCandidates()`和`game.getNextHints()`将其暴露给UI

#### 为什么在Sudoku中？

提示功能本质上是对棋盘状态的**分析**，不涉及状态转移或历史管理。因此：
- ✅ 属于 `Sudoku` 的职责：分析棋盘、计算候选数
- ❌ 不属于 `Game` 的职责：Game主要负责会话、Undo/Redo、状态转移
- `Game` 的角色是**适配器**：向外暴露Sudoku的分析能力

---

### 2. 你认为提示功能更属于 Sudoku 还是 Game？为什么？

**答案：属于 Sudoku**

**理由：**

1. **单一职责原则**
   - `Sudoku` = 棋盘状态 + 棋盘规则分析
   - `Game` = 会话管理 + 历史管理 + 生命周期

2. **无状态转移**
   - 提示功能不改变棋盘状态（readonly操作）
   - 不涉及Undo/Redo历史
   - 因此不需要Game的状态管理能力

3. **可复用性**
   - Sudoku的提示方法可以被多个Game实例使用
   - 可以被测试框架直接调用，不需要依赖Game

4. **设计一致性**
   - 棋盘规则验证已经在Sudoku中（`getInvalidCells()`）
   - 提示功能是规则分析的自然扩展

---

### 3. 你如何实现探索模式？

#### 核心设计

探索模式采用**"分支快照栈"** 模式：

```
Game#exploreStack: 
[
  { sudoku, undoStack, redoStack },  // 探索分支1的起点
  { sudoku, undoStack, redoStack },  // 探索分支2的起点（如有嵌套）
  ...
]

Game#inExploreMode: boolean  // 标志是否在探索中
Game#exploredStates: Set    // 已失败局面的哈希记忆
```

#### 三个核心操作

**1) 进入探索 - `enterExploreMode()`**
```javascript
enterExploreMode() {
  // 保存当前局面快照到栈
  this.#exploreStack.push({
    sudoku: this.#currentSudoku.clone(),
    undoStack: this.#undoStack.map(s => s.clone()),
    redoStack: this.#redoStack.map(s => s.clone())
  });
  
  this.#inExploreMode = true;
  // 重置undo/redo栈，探索时独立管理
  this.#undoStack = [];
  this.#redoStack = [];
}
```

**2) 放弃探索 - `abandonExplore()`**
```javascript
abandonExplore() {
  // 从栈弹出，恢复到探索前的状态
  const restored = this.#exploreStack.pop();
  this.#currentSudoku = restored.sudoku;
  this.#undoStack = restored.undoStack;
  this.#redoStack = restored.redoStack;
  
  // 如果探索栈为空，退出探索模式
  if (this.#exploreStack.length === 0) {
    this.#inExploreMode = false;
  }
}
```

**3) 提交探索 - `commitExplore()`**
```javascript
commitExplore() {
  // 弹出探索前的快照
  const beforeExplore = this.#exploreStack.pop();
  
  // 把它作为一个"合并点"加入主undo栈
  // 这样允许用户能够撤销整个探索结果
  this.#undoStack.unshift(beforeExplore.sudoku);
  this.#redoStack = [];
  
  // 退出探索模式
  if (this.#exploreStack.length === 0) {
    this.#inExploreMode = false;
  }
}
```

#### 四个支持方法

**1) 冲突判断 - `isConflict(x, y): boolean`**
- 已在Game中实现，检查指定格子是否违反数独规则
- 在探索UI中可用于实时反馈

**2) 回溯能力**
- 通过`abandonExplore()`实现快速回滚
- 用户可多次尝试不同候选值

**3) 记忆机制 - `recordFailedState()` / `isKnownFailedState()`**
```javascript
recordFailedState() {
  const grid = this.#currentSudoku.getGrid();
  const hash = JSON.stringify(grid);
  this.#exploredStates.add(hash);
  return hash;
}

isKnownFailedState() {
  const grid = this.#currentSudoku.getGrid();
  const hash = JSON.stringify(grid);
  return this.#exploredStates.has(hash);
}
```
- 用Set存储已失败局面的哈希值
- 当再次到达同一局面时，告知用户"此路已探索失败"

**4) 探索模式状态查询 - `isInExploreMode(): boolean`**
- UI用此判断是否显示探索相关控件

---

### 4. 主局面与探索局面的关系是什么？

#### 对象关系

**复制关系，非共享**

```
主局面: Game#currentSudoku (Sudoku实例)
探索局面: 在exploreStack中的快照 (Sudoku实例的clone)
```

#### 为什么是复制而非共享？

1. **独立性保证**
   - 探索过程中的任何修改都不影响主局面
   - 可以安全地尝试多条分支

2. **防止污染**
   - 如果共享，放弃探索时无法恢复原状
   - 复制确保隔离

3. **嵌套探索支持**
   - 栈的存在允许多层探索分支
   - 每层都有独立的副本

#### 深拷贝问题？

**使用了深拷贝，但受控**

```javascript
// 进入探索时
sudoku: this.#currentSudoku.clone()  // Sudoku.clone()使用deepClone

// 为什么可行：
// - clone()次数受探索层数限制（通常不超过3-4层）
// - 棋盘只有81个单元格，内存开销小
// - 游戏生命周期短，GC压力不大
```

#### 提交与回滚

**提交流程**
```
用户点击"确认探索"
  ↓
commitExplore()
  ↓
当前探索的sudoku成为"已探索结果"
探索前的sudoku加入主undo栈
  ↓
主局面=当前探索sudoku
允许undo回到探索前
```

**放弃流程**
```
用户点击"放弃探索"
  ↓
abandonExplore()
  ↓
恢复到exploredStack顶部快照
  ↓
currentSudoku = 探索前的状态
所有探索操作丢弃
```

---

### 5. 你的 history 结构在本次作业中是否发生了变化？

**是的，发生了显著变化**

#### Homework 1 的History

```
#undoStack: [Sudoku, Sudoku, Sudoku, ...]  (线性栈)
#redoStack: [Sudoku, Sudoku, Sudoku, ...]  (线性栈)

特点：
- 全局单一时间线
- Guess → Push undoStack
- Undo → Pop undoStack, Push redoStack
- 新Guess → Clear redoStack
```

#### Homework 2 的History

```
Game状态：
#currentSudoku        (当前棋盘)
#initialSudoku        (初始棋盘)
#undoStack            (主undo栈)
#redoStack            (主redo栈)

探索状态：
#exploreStack         (快照栈)
#inExploreMode        (标志)
#exploredStates       (失败记忆)

时间模型从"线性"变成"线性+分支"
```

#### 具体变化

**1) 探索时的独立History**
```
进入探索模式时：
  主undo栈保存 → 用于commitExplore()
  主redo栈清空
  新建探索局部undo/redo栈 → 用于探索中的操作

这允许：
- 探索中可以Undo/Redo
- 不污染主History
- 提交时作为"原子操作"进入主History
```

**2) 分支能力的引入**

原来：Guess → undoStack.push()（线性）

现在：
- 主线上：Guess → undoStack.push()（线性）
- 探索线上：
  - Enter → 保存快照
  - Guess → 探索局部undo.push()
  - Commit → 快照→主undo（形成合并点）
  - Abandon → 快照→丢弃

**3) 对Serialize的影响**

```javascript
toJSON() {
  return {
    currentSudoku,
    initialSudoku,
    undoStack,
    redoStack,
    // 注意：exploreStack, exploredStates 不序列化
    // 因为探索是临时交互状态，不应持久化
  }
}
```

---

### 6. Homework 1 中的哪些设计，在 Homework 2 中暴露出了局限？

#### 局限1：History只支持线性

**问题**
```
Homework 1: 只能撤销/重做到单一时间线上的点
Homework 2 需求: 从一个格子尝试3个不同的值，需要3条分支路径
```

**解决方向**
- 引入`exploreStack`作为"虚拟分支"
- 不改变序列化格式（仍保持线性），但在运行时支持分支

#### 局限2：Game没有"模式"概念

**问题**
```
Homework 1: Game只有一种状态（正常游戏）
Homework 2 需求: 需要区分"正常游戏" vs "探索模式"
```

**解决方向**
- 添加`#inExploreMode`标志
- 基于模式切换undo/redo的管理策略
- 暴露`isInExploreMode()`查询接口

#### 局限3：Sudoku被动提供状态，主动分析不足

**问题**
```
Homework 1: Sudoku提供getGrid(), getInvalidCells()
但没有"分析能力"（候选数、推断）
```

**解决方向**
- 添加`getCandidates()` - 格子级候选分析
- 添加`getAllCandidates()` - 全局分析
- 添加`findUniqueCandidates()` - 推断分析
- 这些是纯分析，不改变状态

#### 局限4：UI和Game的交互不够灵活

**问题**
```
Homework 1: UI只能调用guess/undo/redo
没有方式表达"我想尝试这个格子"
```

**解决方向**
- 在Game层暴露`enterExploreMode()`, `commitExplore()`, `abandonExplore()`
- Store Adapter添加对应方法
- UI获得显式的控制接口

---

### 7. 如果重做一次 Homework 1，你会如何修改原设计？

#### 修改1：分离Analysis和State Transfer

**原设计问题**
```javascript
// Game既管理状态，又做所有判断
class Game {
  guess(move) { /* 状态转移 + 合法性判断 */ }
  isConflict(x, y) { /* 规则分析 */ }
}
```

**改进设计**
```javascript
// 清晰的职责分离
class Sudoku {
  // 状态（grid）+ 分析（candidates, conflicts）
  getCandidates(row, col)     // 分析
  getInvalidCells()            // 分析
  guess({ row, col, value })  // 状态转移
}

class Game {
  // 聚合Sudoku + 管理History
  guess(move)  // 委托给sudoku，管理history
  undo()
  redo()
}

Store {
  // 暴露Sudoku的分析能力
  candidates = game.getAllCandidates()
  nextHints = game.getNextHints()
}
```

**好处**
- UI可以直接查询分析结果，不改变游戏状态
- 便于测试候选数计算逻辑
- 为扩展（如自动求解）预留空间

#### 修改2：预设"模式"框架

**原设计问题**
```javascript
// 没有表达不同游戏阶段的概念
class Game {
  #currentSudoku
  #undoStack
  // ... 一切都混在一起
}
```

**改进设计**
```javascript
// 显式的模式管理
class Game {
  #mode = 'normal'  // 'normal' | 'explore' | 'paused'
  
  enterExploreMode() { /* ... */ }
  exitExploreMode()  { /* ... */ }
  getMode() { return this.#mode }
  
  // 基于模式的操作
  guess(move) {
    if (this.#mode === 'explore') {
      // 探索特殊逻辑
    } else {
      // 主线逻辑
    }
  }
}
```

**好处**
- 从第一版就支持模式扩展（Homework 2 / Explore）
- 不需要后续修改核心结构
- UI可以根据mode显示/隐藏控件

#### 修改3：History支持分支（可选）

**原设计**
```javascript
// 线性栈
#undoStack = [...]
#redoStack = [...]
```

**改进设计（可选）**
```javascript
// 树状History（Homework 2不需要，但利于未来扩展）
class HistoryNode {
  state: Sudoku
  parent: HistoryNode | null
  children: HistoryNode[] = []
}

class Game {
  #historyRoot: HistoryNode
  #currentNode: HistoryNode
  
  undo() { this.#currentNode = this.#currentNode.parent }
  redo() { this.#currentNode = this.#currentNode.children[0] }  
  enterBranch(index) { this.#currentNode = this.#currentNode.children[index] }
}
```

**权衡**
- ❌ 复杂度高，Homework 1不需要
- ✅ 为Homework 2多分支提前铺垫
- ✅ 支持更丰富的探索体验

**我的选择**：使用 `#exploreStack` 作为"轻量级分支"，足以满足需求

#### 修改4：准备Store Adapter

**原设计**
```javascript
// 硬编码到组件
// Components直接import Sudoku / Game
```

**改进设计**
```javascript
// 从第一版就用Store Adapter
// App初始化：
const gameStore = createGameStore(initialGrid)

// Components：
const { grid, candidates, invalidCells } = $gameStore
gameStore.guess({ row, col, value })
gameStore.enterExplore()
```

**好处**
- 状态集中管理
- 容易添加新的UI查询（如`nextHints`）
- 便于单元测试（Mock store）

---

## 总结

### 核心设计原则（Homework 1→2的演进）

| 原则 | Homework 1 | Homework 2 |
|------|----------|-----------|
| **职责分离** | Sudoku/Game混合 | Sudoku分析 + Game管理 |
| **模式支持** | 单一模式 | 支持"正常"和"探索"模式 |
| **History** | 线性栈 | 线性+栈式分支 |
| **Candidate** | 无 | 在Sudoku中提供 |
| **Explore** | 无 | 通过快照栈实现 |
| **UI通信** | 被动 | 主动查询分析结果 |

### Homework 2新增核心概念

1. **Sudoku.getCandidates()** - 候选数计算
2. **Game.enterExploreMode()** - 进入分支
3. **Game.recordFailedState()** - 路径记忆
4. **Store.nextHints** - UI驱动的推断提示

### 设计保留

- ✅ 仍保持Sudoku的不可变性（clone）
- ✅ 仍保持Game的History机制（undo/redo）
- ✅ 仍保持Store Adapter的中介角色
- ✅ 序列化格式不变（exploreStack临时不序列化）

---

## 参考

- Homework 1: 基础OOP/OOD实现（Sudoku/Game/History）
- Homework 2: 功能演进（Hints/Explore）
- 核心思想：**在不推翻原设计的基础上，通过分离关注点和引入新的数据结构，支持新功能**
