<script>
    import NumberInput from './numberInput.svelte'
    import { getContext } from 'svelte';
    const { changeTheme } = getContext('theme');
    export let breaks;
    export let toggleModal;
    let {pomo,short,long} = breaks;
    $: breaks["pomo"] = pomo*60;
    $: breaks["short"] = short*60;
    $: breaks["long"] = long*60;
    
    let modalElement;
    function keydown(e) {
      e.stopPropagation()
      console.log(e)
      if (e.key === 'Escape') {
        toggleModal(false);
      }
    }
    let colors = "red";
    $: colors, changeTheme(colors)
    // rgb(112,243,248)
</script>

<div
  bind:this={modalElement}
  class="modal"
  on:keydown={keydown} tabindex={0}>
  <div class="modal-wrapper" >
      <header>
        <h2 class="modal-title">Settings</h2>
        <button on:click="{()=>toggleModal(false)}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><path fill="#fff" fill-rule="evenodd" d="M11.95.636l1.414 1.414L8.414 7l4.95 4.95-1.414 1.414L7 8.414l-4.95 4.95L.636 11.95 5.586 7 .636 2.05 2.05.636 7 5.586l4.95-4.95z" ></path></svg></button>
      </header>
      <hr>
      <section class="time">
        <h2 class="subtitle">TIME (MINUTES)</h2>
        <NumberInput label="pomodoro" bind:time="{pomo}"/>
        <NumberInput label="short break" bind:time="{short}"/>
        <NumberInput label="long break" bind:time="{long}"/>
      </section>
      <hr>
      <section class="colors">
        <h2 class="subtitle">COLOR</h2>
        <label>Red
          <input type="radio" bind:group={colors} value="red">
        </label>
        <label>Blue
          <input type="radio" bind:group={colors} value="blue">
        </label>
        <label>Purple
          <input type="radio" bind:group={colors} value="purple">
        </label>
        <!-- red blue purple -->
      </section>
  </div>
</div>


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
        background-color: #1D2D4A;
        width: 70%;
        max-width: 500px;
        border-radius:.5rem;
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
      font-size: .7rem;
    }
    /* transition-all opacity-25 hover:opacity-100 */
    @media(max-width: 800px) {
        .time {
            width: 90%
        }
    }
</style>