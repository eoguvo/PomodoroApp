<script type="ts">
  import { setContext, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { ITheme } from './intefaces/themes.js';
  import _themes from './themes.js';

  export let themes = [..._themes];

  let current = themes[0].name;

  const getTheme = (name: string) =>
    themes.find(_theme => _theme.name === name) as ITheme;
  const setProperty = (prop: string, value: string) =>
    document.documentElement.style.setProperty(prop, value);

  const Theme = writable(getTheme(current));

  let hasMounted = false;

  Theme.subscribe(value => {
    if (hasMounted) {
      localStorage.setItem('theme', JSON.stringify(value));
    }
  });

  setContext('theme', {
    theme: Theme,
    toggle: () => {
      let index = themes.findIndex(t => t.name === current);
      const i = index === themes.length - 1 ? 0 : ++index;
      current = themes[i].name;

      Theme.update(t => ({ ...t, ...getTheme(current) }));
      setRootColors(getTheme(current));
    },
    changeTheme: (name: string) => {
      Theme.update(t => ({ ...t, ...getTheme(name) }));
      setRootColors(getTheme(name));
    }
  });

  onMount(() => {
    hasMounted = true;
    const value = JSON.parse(localStorage.getItem('theme') as string) as ITheme;
    current = (value && value.name) || themes[0].name;
    setRootColors(getTheme(current));
  });

  function setRootColors(theme: ITheme) {
    for (const [prop, color] of Object.entries(theme.colors)) {
      const cssVar = `--theme-${prop}`;
      setProperty(cssVar, color);
    }
    setProperty('--theme-name', theme.name);
  }
</script>

<slot>
  <!-- {children} -->
</slot>
