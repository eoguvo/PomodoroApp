<script>
    import { onMount } from 'svelte';
    export let label;
    export let time;
    onMount(()=>{
        time = toMinutes(time);
    })
    function increment() {
        time = Number(time);
        if((time+=5)>=60) return time = 60;
    }
    function decrement() {
        time = Number(time);
        if((time-=5)<=5) return time = 5;
    }
    function toMinutes(seconds) {
      return Number(seconds)/60;
    }
</script>

<div class="input-group">
    <p class="label">{label || "label nao selecionada"}</p>
    <div class="input">
      <p class="value">{time}</p>
      <div class="buttons">
        <button  on:click="{increment}" class="increment" ><svg class="arrow transition-all opacity-25 hover:opacity-100" xmlns="http://www.w3.org/2000/svg" width="14" height="7"><path fill="none" stroke="#1E213F" stroke-width="2" d="M1 6l6-4 6 4"></path></svg></button>
        <button on:click="{decrement}" class="decrement" ><svg class="arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="7"><path fill="none" stroke="#1E213F" stroke-width="2" d="M1 1l6 4 6-4"></path></svg></button>
      </div>
    </div>
</div>

<style>
    .input-group {
      padding-bottom: .7rem;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-direction: column;
    }
    .input-group .label {
      text-align: center;
      color: var(--primary);
      padding-bottom: .2rem;
      font-weight: bold;
    }
    .input-group .input {
      height: 1.5rem;
      width: 50%;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      border-radius: 1rem;
      background-color: rgba(239,241,250);
    }
    .input-group .input .value {
      color: #000;
      font-weight: bold;
    }
    .input-group .input .buttons {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
    }
    .input-group .input .buttons button {
      padding: 0;
      margin: 0;
      transition: all .2s var(--ttf);
      opacity: .5;
    }
    .input-group .input .buttons button:hover {
      opacity: 1;
    }
    @media(min-width: 800px) {
        .input-group {
            flex-direction: row;
        }
    }
</style>