# con-oo-rath919-1 - Review

## Review 结论

代码里已经有了 `Sudoku` / `Game` 和 `createGameStore` 这一条正确方向的主线，棋盘渲染、数字输入、撤销/重做也有一部分接到了领域对象上；但整体仍然是“半接入”。开局、载入自定义局、暂停恢复、胜利判定、提示等关键流程仍与旧 store/旧 `@sudoku/game` 并存，导致领域模型没有真正成为唯一的游戏核心；同时 `Game` 的序列化和新局生命周期还存在会直接破坏业务语义的核心缺陷，因此这份实现还不能算是质量较好的 OOP/OOD 设计，也没有完整满足作业要求中的 Svelte 接入目标。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. `Game` 序列化丢失初始题面，反序列化后业务语义被破坏

- 严重程度：core
- 位置：src/domain/game.js:77-99
- 原因：`toJSON()` 只保存当前 `sudoku`、undo/redo 栈，没有保存 `#initialSudoku`；`fromJSON()` 又用当前局面构造新 `Game`。这样一来，恢复后的对象会把“当前所有非 0 格”都当成 givens，后续 `guess()` 的“题目给定数字不可改”规则就会失真。这不是普通实现细节，而是直接改变了数独游戏的核心业务语义。

### 2. `newGame()` 没有重置历史，Undo/Redo 会跨局污染

- 严重程度：core
- 位置：src/domain/game.js:71-75
- 原因：`newGame()` 只替换了 `#currentSudoku` 和 `#initialSudoku`，但没有清空 `#undoStack` / `#redoStack`。因此开启新局后仍可能撤销回上一局的状态，历史边界错误，游戏生命周期被破坏。

### 3. “开始新局/加载自定义题目”的主流程仍绕过领域对象

- 严重程度：core
- 位置：src/components/Modal/Types/Welcome.svelte:3-24; src/components/Header/Dropdown.svelte:11-23,41-55; src/App.svelte:48-60
- 原因：欢迎弹窗和下拉菜单仍调用旧的 `@sudoku/game.startNew/startCustom`，这些函数操作的是旧 `grid` store；而棋盘实际渲染的是 `$gameStore.grid`。与此同时，`App.svelte` 在 `onMount` 里硬编码 `demoGrid` 直接喂给 `gameStore.newGame(...)`。结果是用户可见的开局流程与当前渲染棋盘不是同一条状态链，领域对象并没有真正接管“开始一局游戏”。

### 4. 胜利判定流程没有真正接通

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/createGameStore.js:25-30; src/App.svelte:29-34
- 原因：store adapter 里用 `game.isWon ? game.isWon() : false` 计算 `won`，但 `Game` 并没有实现 `isWon()`。这会让 `won` 长期退化为 `false`，`App.svelte` 里依赖 `state.won` 触发 game over 的逻辑也就没有可靠来源，和作业要求中的“真实游戏流程接入”不符。

### 5. 提示/笔记等控制仍在操作旧状态树，和当前棋盘状态分裂

- 严重程度：major
- 位置：src/components/Controls/ActionBar/Actions.svelte:2-22,50-66
- 原因：`Actions.svelte` 里的 hint/candidates/notes 仍依赖旧的 `userGrid`、`candidates`、`notes` store；但棋盘渲染来自 `$gameStore.grid`。这意味着同一页面上的不同控件并不共享同一个游戏模型，属于典型的双状态源问题，严重削弱 OOD 和 Svelte 架构一致性。

### 6. 暂停状态被拆成两套来源，store adapter 不是权威状态源

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/createGameStore.js:71-74; src/node_modules/@sudoku/stores/keyboard.js:1-18; src/components/Controls/ActionBar/Timer.svelte:2-10; src/components/Header/Buttons.svelte:2-13
- 原因：`createGameStore` 自己维护了 `paused`，但键盘禁用、计时器按钮、设置/分享弹窗又依赖旧的 `gamePaused` 和 `pauseGame/resumeGame`。这使暂停恢复的语义分散在两套机制里，增加了状态不一致风险，也说明领域对象接入没有覆盖完整游戏流程。

### 7. 数独规则没有被统一建模，验证职责散落且约束不足

- 严重程度：major
- 位置：src/domain/sudoku.js:12-34,94-132; src/domain/game.js:101-137
- 原因：`Sudoku.guess()` 只检查越界，不验证 9x9 结构、值域、整数性，也不统一表达“此步是否合法”；冲突判断又分别出现在 `Sudoku.getInvalidCells()` 和 `Game.isConflict()` 中，逻辑重复且边界含义不完全一致。这样虽然能拼出一些 UI 功能，但没有形成清晰、单一职责的业务模型。

### 8. Svelte 数据流不一致：上层传 prop，下层却直接依赖全局单例

- 严重程度：minor
- 位置：src/App.svelte:76-78; src/components/Controls/index.svelte:1-11; src/components/Controls/Keyboard.svelte:4; src/components/Controls/ActionBar/Actions.svelte:11
- 原因：`App.svelte` 把 `gameStore` 作为 prop 传给 `<Controls>`，但 `Controls.svelte` 没有声明该 prop，子组件又直接 import 全局 `gameStore` 单例。这种写法让组件的依赖关系不透明，也降低了复用性和可测试性，不符合较好的 Svelte 架构习惯。

### 9. `printSudoku()` 既不面向对象也存在明显失效代码

- 严重程度：minor
- 位置：src/domain/sudoku.js:61-92
- 原因：这个实例方法没有使用对象内部的 `#grid`，反而要求外部再传一个 `sudoku` 参数；同时它依赖的 `SUDOKU_SIZE` / `BOX_SIZE` 在文件中并未定义，静态上看调用即会报错。它体现了领域对象内部职责不稳定，也降低了代码整洁度。

## 优点

### 1. `Sudoku` 对棋盘状态做了基本封装和防御性拷贝

- 位置：src/domain/sudoku.js:7-19,37-50
- 原因：使用私有字段 `#grid` 存储内部状态，构造函数、`getGrid()`、`clone()`、`toJSON()` 都避免直接暴露内部二维数组，至少在对象边界上建立了基本封装。

### 2. `Game` 以快照方式承载 Undo/Redo，接口面向 UI 操作

- 位置：src/domain/game.js:16-27,42-69
- 原因：`Game` 持有当前 `Sudoku`，在 `guess()` 前推入 undo 栈、在 `undo()/redo()` 中切换快照，并提供 `canUndo()/canRedo()` 这类面向界面的查询接口，整体形态符合“由 Game 统一对外暴露游戏操作”的方向。

### 3. 采用了 store adapter 思路把领域对象桥接到 Svelte

- 位置：src/node_modules/@sudoku/stores/createGameStore.js:15-30,36-75
- 原因：`createGameStore()` 用 writable store 包装 `Game`，并把 `grid`、`invalidCells`、`guess`、`undo`、`redo` 暴露给 UI，这正是作业要求中推荐的接入方式，比让组件直接改二维数组更合理。

### 4. 棋盘渲染、数字输入、撤销/重做已有一部分真实走向领域对象

- 位置：src/components/Board/index.svelte:30-52; src/components/Controls/Keyboard.svelte:8-18; src/components/Controls/ActionBar/Actions.svelte:28-42
- 原因：Board 从 `$gameStore.grid` 渲染，Keyboard 调 `gameStore.guess(...)`，Undo/Redo 按钮调 `gameStore.undo()/redo()`。这说明接入不是完全停留在测试层面，而是已经开始进入真实 UI。

### 5. “givens 不可编辑”被同时放进领域层和 UI 层保护

- 位置：src/domain/game.js:37-45; src/node_modules/@sudoku/stores/keyboard.js:14-17
- 原因：`Game.guess()` 会拒绝修改初始题面中的 givens，`keyboardDisabled` 也用 `getInitialSudoku()` 来禁用这些格子的输入。虽然实现还有重复，但至少业务约束方向是对的。

## 补充说明

- 本次结论全部基于静态阅读，按要求未运行 tests，也未实际打开浏览器验证交互。
- 关于“新局/自定义局未真正驱动当前棋盘”“胜利弹窗不会可靠触发”“提示/暂停状态分裂”等判断，来自对 `src/domain/*`、`src/App.svelte`、`src/components/*`、`src/node_modules/@sudoku/stores/createGameStore.js`、`src/node_modules/@sudoku/game.js` 之间数据流的静态分析。
- 评审范围仅覆盖 `src/domain/*` 及其直接 Svelte 接入点；未扩展到无关目录，也没有把旧实现之外的其他模块当作本次 review 的主要对象。
