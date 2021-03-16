<script>
	import { onMount } from 'svelte'
	let circleRef, interval, circumference=0, dashoffset=0;
	let current = 'pomo';
	const breaks = {"pomo": 1500, "short": 300, "long": 900}

	$: time = breaks[current];
	$: if(circleRef) {
		const perc = (breaks[current]-time) % 360 +1;
		dashoffset = circumference-perc/breaks[current]*circumference;
	}

	onMount(()=>{
		if(circleRef) {
			circumference = 2 * Math.PI * circleRef.r.baseVal.value;
			circleRef.style.strokeDasharray = circumference.toString();
			circleRef.style.strokeDashoffset = circumference.toString();
		}
	})

	function formatTime(totalSeconds) {
		const min = (totalSeconds / 60)>>0;
		const sec = (totalSeconds % 60)>>0;
		return `${min>10?min:'0'+min}:${sec>10?sec:'0'+sec}`
	}

	function ResetCircle() {
		if(circleRef) {
			circleRef.style.strokeDasharray = circumference.toString();
			circleRef.style.strokeDashoffset = circumference.toString();
		}
	}

	function togglePomodoro() {
		if(interval) {
			clearInterval(interval);
			interval = undefined;
			return;
		}
		interval = setInterval(() => {
			if(--time <=0) {
				clearInterval(interval);
			}
			if(circleRef) {
				circleRef.style.strokeDasharray = circumference.toString();
				circleRef.style.strokeDashoffset = dashoffset.toString();
			}
		}, 1000)
	}
	function Restart() {
		ResetCircle();
		interval = undefined;
		time = breaks[current];
		togglePomodoro();
	}
	function changePomodoro(name) {
		current = name;
		if(interval) {
			clearInterval(interval);
			interval = undefined;
		}
		if(circleRef) {
			ResetCircle();
		}
	}
</script>

<main>
	<h1 class="title">pomodoro</h1>
	<div class="breaks">
		<button on:click="{() => changePomodoro('pomo')}" 
			class="pomo" class:selected="{current === 'pomo'}" >pomodoro
		</button>
		<button on:click="{()=> changePomodoro('short')}" 
			class="short" class:selected="{current === 'short'}">short break
		</button>
		<button on:click="{()=> changePomodoro('long')}" 
			class="long" class:selected="{current === 'long'}">long break
		</button>
	</div>
	<div class="watch">
		<div class="content">
			<svg class="progress-ring" data-testid="svg" viewBox="0 0 120 120">
				<circle 
					class="progress-ring__circle" 
					bind:this={circleRef} fill="none"  stroke="currentColor" cx="60" cy="60" r="54" strokeWidth="4" 
					/>
			  </svg>
			<p class="time">{formatTime(time)}</p>
			{#if time<=0}
				<button on:click="{Restart}" class="play">
					RESTART
				</button>
			{:else}
			<button on:click="{togglePomodoro}" class="play">
				{interval ? "STOP" : "START"}
			</button>
			{/if}
		</div>
	</div>
	<button on:click="{()=>alert('we are working in this')}" class="config"><img width="24" src="./assets/config.svg" alt="configuration"></button>
</main>

<style>
	main {
		display: flex;
		align-items: center;
		flex-direction: column;
		height: 100%;
		text-align: center;
		width: 90vw;
		max-width: 800px;
		margin: 0 auto;
	}

	.title {
		margin: 2.5rem 0;
		font-size: 2rem;
		font-weight: bold;
		color: var(--gray);
	}

	.breaks {
		border-radius: 9999px;
		z-index: 2;
		margin-bottom: 7rem; /*2.5rem;*/
		background-color: var(--bg);
	}
	.breaks button {
		font-weight: bold;
		width: 105px;
		height: 50px;
		padding: 1rem;
		font-size: .75rem;
		opacity: .4;
	}
	.breaks button:hover {
		opacity: 1;
	}
	.breaks .selected {
		color: var(--bg);
		opacity: 1;
		background-color: var(--primary);
	}

	.watch {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 410px; height: 410px;
		border-radius: 9999px;
		background: linear-gradient(to bottom right,#161932,#1e213f);
		box-shadow: -20px -20px 40px 0 #262b594d, 24px 24px 48px #1215304d;
	}

	.watch .content {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 90%; height: 90%;
		border-radius: 9999px;
		background: var(--bg);
		position: relative;
	}
	.watch .content .play {
		z-index: 10;
		letter-spacing: 15px;
		transition: all .2s cubic-bezier(0.4, 0, 0.2, 1);
		margin-top: 2.5rem;
		font-weight: bold;
		cursor: pointer;
	}
	.watch .content .play:hover {
		color: var(--primary);
	}
	.watch .content .time {
		font-size: 80px;
		font-weight: bold;
		padding-top: 2.5rem;
	}
	
	.progress-ring {
		position: absolute;
		top: 0; bottom: 0;
		width: 100%;
		margin: auto;
		height: 100%;
	}
	.progress-ring__circle {
		stroke-dasharray: var(--arr);
		stroke-dashoffset: var(--off);
		stroke-width: 4;
		transition-property: all;
    	transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    	transition-duration: .15s;
		transform-origin: center;
		stroke-linecap: round;
		transform: rotate(-90deg);
		color: var(--primary);
	}
	.config {
		position: absolute;
		bottom: 2.5rem;
		right: 50%; left: 50%;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>