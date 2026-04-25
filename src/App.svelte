<script>
	import { onMount } from 'svelte';
	import { validateSencode } from '@sudoku/sencode';
	import { modal } from '@sudoku/stores/modal';

	import Board from './components/Board/index.svelte';
	import Controls from './components/Controls/index.svelte';
	import Header from './components/Header/index.svelte';
	import Modal from './components/Modal/index.svelte';

	// 领域对象和store
	import { gameStore } from '@sudoku/stores/createGameStore';

	// 监听胜利
	gameStore.subscribe(state => {
		if (state.won) {
			gameStore.pause();
			modal.show('gameover');
		}
	});

	onMount(() => {
		// 显示欢迎弹窗，由用户选择新局或自定义题目
		let hash = location.hash;
		if (hash.startsWith('#')) hash = hash.slice(1);

		let sencode;
		if (validateSencode(hash)) sencode = hash;

		// 传入gameStore实例，让Welcome能够驱动游戏开始
		modal.show('welcome', { onHide: gameStore.resume, sencode, gameStore });
	});
</script>

<!-- Header -->
<header>
	<Header />
</header>

<!-- Sudoku Board -->
<section>
	<Board {gameStore} />
</section>

<!-- Controls -->
<footer>
	<Controls {gameStore} />
</footer>

<Modal />

<style global>
	@import "./styles/global.css";
</style>