<style>
  main {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
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
    display: flex;
    align-items: center;
    border-radius: 9999px;
    z-index: 1;
    margin-bottom: 6vh;
    background-color: var(--bg);
    font-family: 'Kumbh Sans', sans-serif;
  }
  .breaks button {
    font-weight: bold;
    width: 105px;
    height: 50px;
    font-size: 0.75rem;
    color: var(--theme-primary);
    opacity: 0.9;
    transition: all 0.3s var(--ttf);
  }
  .breaks button:hover {
    opacity: 1;
  }
  .breaks .selected {
    color: var(--bg);
    opacity: 1;
    background-color: var(--theme-primary);
  }

  .watch {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 300px;
    min-height: 300px;
    border-radius: 9999px;
    background: linear-gradient(to bottom right, #161932, #1e213f);
    box-shadow: -20px -20px 40px 0 #262b594d, 24px 24px 48px #1215304d;
  }

  .watch .content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 90%;
    height: 90%;
    border-radius: 9999px;
    background: var(--bg);
    position: relative;
  }
  .watch .content .play {
    z-index: 1;
    letter-spacing: 15px;
    transition: color 0.2s var(--ttf);
    margin-top: 2.5rem;
    font-weight: bold;
    cursor: pointer;
  }
  .watch .content .play:hover {
    color: var(--theme-primary);
  }
  .watch .content .time {
    font-size: 80px;
    font-weight: bold;
    padding-top: 2.5rem;
    font-family: 'Kumbh Sans', sans-serif;
  }

  .progress-ring {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%;
    margin: auto;
    height: 100%;
  }
  .progress-ring__circle {
    stroke-width: 4;
    transition: stroke-dashoffset 0.15s var(--ttf);
    transform-origin: center;
    stroke-linecap: round;
    transform: rotate(-90deg);
    color: var(--theme-primary);
  }
  .config {
    padding-top: 1rem;
    margin-top: auto;
  }

  @media (min-width: 768px) {
    .watch {
      min-width: 410px;
      min-height: 410px;
    }
  }
  @media (min-width: 1024px) {
    .breaks {
      margin-bottom: 3.5rem;
    }
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import Modal from './components/Modal.svelte';
  import formatTime from './util/formatTime.js';
  import ThemeContext from './ThemeContext.svelte';
  import { Breaks } from './intefaces/general';

  let circleRef: SVGCircleElement,
    interval: number | undefined,
    circumference = 0,
    dashoffset = 0,
    show = false;
  let current: keyof Breaks = 'pomo';
  let breaks = (JSON.parse(localStorage.getItem('breaks') as string) || {
    pomo: 1500,
    short: 300,
    long: 900
  }) as Breaks;

  $: localStorage.setItem('breaks', JSON.stringify(breaks));
  $: time = breaks[current];
  $: if (circleRef) {
    const perc = ((breaks[current] - time) % 360) + 1;
    dashoffset = circumference - (perc / breaks[current]) * circumference;
    console.log({ perc, dashoffset, break: breaks[current], circumference });
  }

  onMount(() => {
    if (circleRef) {
      circumference = 2 * Math.PI * circleRef.r.baseVal.value;
      circleRef.style.strokeDasharray = circumference.toString();
      circleRef.style.strokeDashoffset = circumference.toString();
    }
  });

  function ResetCircle() {
    if (circleRef) {
      circleRef.style.strokeDasharray = circumference.toString();
      circleRef.style.strokeDashoffset = circumference.toString();
    }
  }

  function togglePomodoro() {
    if (interval) {
      clearInterval(interval);
      interval = undefined;
      return;
    }
    interval = setInterval(() => {
      if (--time <= 0) {
        clearInterval(interval);
      }
      if (circleRef) {
        circleRef.style.strokeDasharray = circumference.toString();
        circleRef.style.strokeDashoffset = dashoffset.toString();
      }
    }, 1000);
  }
  function Restart() {
    ResetCircle();
    interval = undefined;
    time = breaks[current];
    togglePomodoro();
  }
  function changePomodoro(name: keyof Breaks) {
    current = name;
    if (interval) {
      clearInterval(interval);
      interval = undefined;
    }
    if (circleRef) {
      ResetCircle();
    }
  }
  function toggleModal(value: boolean) {
    if (!value) return (show = !show);
    show = value;
  }
</script>

<ThemeContext>
  <main>
    <h1 class="title">pomodoro</h1>
    <div class="breaks">
      <button
        on:click={() => changePomodoro('pomo')}
        class="pomo"
        class:selected={current === 'pomo'}
        >pomodoro
      </button>
      <button
        on:click={() => changePomodoro('short')}
        class="short"
        class:selected={current === 'short'}
        >short break
      </button>
      <button
        on:click={() => changePomodoro('long')}
        class="long"
        class:selected={current === 'long'}
        >long break
      </button>
    </div>
    <div class="watch">
      <div class="content">
        <svg class="progress-ring" data-testid="svg" viewBox="0 0 120 120">
          <circle
            class="progress-ring__circle"
            bind:this={circleRef}
            fill="none"
            stroke="currentColor"
            cx="60"
            cy="60"
            r="54"
            stroke-width="4"
          />
        </svg>
        <p class="time">{formatTime(time)}</p>
        {#if time <= 0}
          <button on:click={Restart} class="play"> RESTART </button>
        {:else}
          <button on:click={togglePomodoro} class="play">
            {interval ? 'STOP' : 'START'}
          </button>
        {/if}
      </div>
    </div>
    <button on:click={() => (show = true)} class="config"
      ><img
        height="24"
        width="24"
        src="./assets/config.svg"
        alt="configuration"
      /></button
    >
  </main>
</ThemeContext>
{#if show}
  <ThemeContext>
    <Modal {toggleModal} bind:breaks />
  </ThemeContext>
{/if}
