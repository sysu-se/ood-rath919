<script>
	import Cell from './Cell.svelte';
	import { BOX_SIZE } from '@sudoku/constants';
	import { cursor } from '@sudoku/stores/cursor';

	// 接收 gameStore
	export let gameStore;

	// 辅助方法
	function isSelected(cursorStore, x, y) {
		return cursorStore.x === x && cursorStore.y === y;
	}

	function isSameArea(cursorStore, x, y) {
		if (cursorStore.x === null && cursorStore.y === null) return false;
		if (cursorStore.x === x || cursorStore.y === y) return true;

		const cursorBoxX = Math.floor(cursorStore.x / BOX_SIZE);
		const cursorBoxY = Math.floor(cursorStore.y / BOX_SIZE);
		const cellBoxX = Math.floor(x / BOX_SIZE);
		const cellBoxY = Math.floor(y / BOX_SIZE);
		return (cursorBoxX === cellBoxX && cursorBoxY === cellBoxY);
	}

	function getValueAtCursor(gridStore, cursorStore) {
		if (cursorStore.x === null && cursorStore.y === null) return null;
		return gridStore[cursorStore.y][cursorStore.x];
	}
	
	$: initialGrid = $gameStore.game.getInitialSudoku().getGrid();
	
</script>

<div class="board-padding relative z-10">
	<div class="max-w-xl relative">
		<div class="w-full" style="padding-top: 100%"></div>
	</div>
	<div class="board-padding absolute inset-0 flex justify-center">
		<div class="bg-white shadow-2xl rounded-xl overflow-hidden w-full h-full max-w-xl
					grid grid-cols-9">
			{#each $gameStore.grid as row, y}
				{#each row as value, x}
					<Cell {value}
					      cellY={y + 1}
					      cellX={x + 1}
					      disabled={false}
					      selected={isSelected($cursor, x, y)}
					      userNumber={initialGrid[y][x] === 0}
					      sameArea={isSameArea($cursor, x, y)}
						  sameNumber={getValueAtCursor($gameStore.grid, $cursor) !== 0 &&getValueAtCursor($gameStore.grid, $cursor) === value}
					      conflictingNumber={initialGrid[y][x] === 0 && $gameStore.invalidCells?.includes(x + ',' + y)} />
				{/each}
			{/each}

		</div>
	</div>
</div>

<style>
	.board-padding { @apply px-4 pb-4; }
</style>