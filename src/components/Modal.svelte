<style>
  .modal {
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.7);
    position: fixed;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
  }
  .modal-wrapper {
    z-index: 12;
    background-color: #1d2d4a;
    width: 80%;
    max-width: 500px;
    border-radius: 0.5rem;
    box-shadow: 0 0 12px 2px rgba(255, 255, 255, 0.3);
  }
  .modal-wrapper header {
    padding: 2rem 2.5rem;
    display: flex;
    justify-content: space-between;
  }
  .modal-wrapper header .modal-title {
    font-size: 1.25rem;
    line-height: 1.75rem;
    font-weight: bold;
  }
  section {
    padding: 2rem 2.5rem;
    display: flex;
    justify-content: space-between;
    flex-flow: column wrap;
  }
  h2 {
    text-align: center;
    letter-spacing: 5px;
    font-weight: bold;
    margin-bottom: 1.25rem;
    line-height: 1rem;
    font-size: 0.7rem;
  }
  .modal-wrapper .colors {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .modal-wrapper .colors .inputs label {
    position: relative;
    padding-left: 35px;
    margin-bottom: 12px;
    cursor: pointer;
    font-size: 22px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .colors .inputs label input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
  }
  .checkmark {
    position: absolute;
    top: 0;
    left: 0;
    height: 25px;
    width: 25px;
    border-radius: 50%;
    transition: all 0.5s var(--ttf);
    opacity: 0.8;
  }
  .checkmark:after {
    content: '';
    position: absolute;
    display: none;
    top: 9px;
    left: 9px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: black;
  }
  label:hover input ~ .checkmark {
    opacity: 1;
  }
  label input:checked ~ .checkmark:after {
    display: block;
  }
  /* transition-all opacity-25 hover:opacity-100 */
  @media (max-width: 800px) {
    .time {
      width: 90%;
      padding-left: 0;
      padding-right: 0;
    }
  }
</style>

<script type="ts">
  import NumberInput from './numberInput.svelte';
  import { getContext } from 'svelte';
  import { ITheme } from '../intefaces/themes';
  import { Breaks } from '../intefaces/general';

  type IChangeTheme = { changeTheme: (name: string) => void };
  const { changeTheme }: IChangeTheme = getContext('theme');

  export let breaks: Breaks;
  export let toggleModal: (value: boolean) => boolean | undefined;
  let { pomo, short, long } = breaks;
  $: breaks['pomo'] = pomo * 60;
  $: breaks['short'] = short * 60;
  $: breaks['long'] = long * 60;

  function keydown(e: KeyboardEvent) {
    e.stopPropagation();
    console.log(e);
    if (e.key === 'Escape') {
      toggleModal(false);
    }
  }
  const value = JSON.parse(localStorage.getItem('theme') as string) as ITheme;
  let colors = (value && value.name) || 'red';
  $: changeTheme(colors);
</script>

<div class="modal" on:keydown={keydown} tabindex={0}>
  <div class="modal-wrapper">
    <header>
      <h2 class="modal-title">Settings</h2>
      <button on:click={() => toggleModal(false)}
        ><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
          ><path
            fill="#fff"
            fill-rule="evenodd"
            d="M11.95.636l1.414 1.414L8.414 7l4.95 4.95-1.414 1.414L7 8.414l-4.95 4.95L.636 11.95 5.586 7 .636 2.05 2.05.636 7 5.586l4.95-4.95z"
          /></svg
        ></button
      >
    </header>
    <hr />
    <section class="time">
      <h2 class="subtitle">TIME (MINUTES)</h2>
      <NumberInput label="pomodoro" bind:time={pomo} />
      <NumberInput label="short break" bind:time={short} />
      <NumberInput label="long break" bind:time={long} />
    </section>
    <hr />
    <section class="colors">
      <h2 class="subtitle">COLOR</h2>
      <div class="inputs">
        <label>
          <input type="radio" bind:group={colors} value="red" />
          <span class="checkmark" style="background-color: #f87070;" />
        </label>
        <label>
          <input type="radio" bind:group={colors} value="blue" />
          <span class="checkmark" style="background-color: #70f3f8;" />
        </label>
        <label>
          <input type="radio" bind:group={colors} value="purple" />
          <span class="checkmark" style="background-color: #d881f8;" />
        </label>
      </div>
    </section>
  </div>
</div>
