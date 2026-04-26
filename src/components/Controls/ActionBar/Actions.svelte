<script>
	import { cursor } from '@sudoku/stores/cursor';
	import { hints } from '@sudoku/stores/hints';
	import { notes } from '@sudoku/stores/notes';
	import { settings } from '@sudoku/stores/settings';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
	import { gamePaused } from '@sudoku/stores/game';

	import { gameStore } from '@sudoku/stores/createGameStore';
	
	let hintMessage = '';
	let exploreMessage = '';

	$: hintsAvailable = $hints > 0;
	$: canEnterExplore = !$gameStore.isExploring && $gameStore.nextHints.length === 0;
	$: inExplore = $gameStore.isExploring;

	function handleHint() {
		if (!hintsAvailable) return;

		const result = gameStore.hint($cursor);
		if (!result) return;

		if (result.success) {
			hints.useHint();
		}
		
		hintMessage = result.message;
		exploreMessage = ''; // clear explore message
	}

	function handleEnterExplore() {
		if (!canEnterExplore) return;

		const success = gameStore.enterExplore();
		if (success) {
			hintMessage = '';
			exploreMessage = 'Entered explore mode. Try filling cells.';
		} else {
			hintMessage = 'Cannot enter explore mode: hints available.';
			exploreMessage = '';
		}
	}

	function handleCommitExplore() {
		gameStore.commitExplore();
		hintMessage = '';
		exploreMessage = 'Explore committed.';
	}

	function handleAbortExplore() {
		gameStore.abortExplore();
		hintMessage = '';
		exploreMessage = 'Explore aborted.';
	}
</script>

<div class="action-buttons space-x-3">

	<button
	class="btn btn-round"
	on:click={() => gameStore.undo()}
	disabled={$gamePaused || !$gameStore.game.canUndo()}
	title="Undo"
	>
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

	<button
	class="btn btn-round"
	on:click={() => gameStore.redo()}
	disabled={$gamePaused || !$gameStore.game.canRedo()}
	title="Redo"
	>
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

	<button class="btn btn-round btn-badge" disabled={$keyboardDisabled || !hintsAvailable || $gameStore.grid[$cursor.y][$cursor.x] !== 0} on:click={handleHint} title="Hints ({$hints})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>

		{#if $settings.hintsLimited}
			<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

	{#if hintMessage}
		<div class="hint-message mt-2 text-sm text-gray-700">{hintMessage}</div>
	{/if}

	{#if exploreMessage}
		<div class="explore-message mt-2 text-sm text-blue-600">{exploreMessage}</div>
	{/if}

	{#if inExplore}
		<div class="explore-status mt-2 text-sm text-blue-600 font-semibold">
			Exploring: Try different values. Conflicts will auto-revert.
		</div>
	{/if}

	<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>

		<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
	</button>

	<button class="btn btn-round" disabled={!canEnterExplore} on:click={handleEnterExplore} title={canEnterExplore ? "Enter Explore Mode" : "Cannot enter explore: hints available"}>
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
	</button>

	{#if inExplore}
		<button class="btn btn-round btn-success" on:click={handleCommitExplore} title="Commit Explore">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
		</button>

		<button class="btn btn-round btn-danger" on:click={handleAbortExplore} title="Abort Explore">
			<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	{/if}

</div>


<style>
	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}

	.btn-badge {
		@apply relative;
	}

	.badge {
		min-height: 20px;
		min-width:  20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-primary {
		@apply bg-primary;
	}
</style>