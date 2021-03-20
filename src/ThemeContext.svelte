<script>
    import { setContext, onMount } from 'svelte';
    import { writable } from 'svelte/store';
    import _themes from './_themes.js';

    export let themes = [..._themes];

    let current = themes[0].name;

    const getTheme = name => themes.find(_theme => _theme.name === name);
    const setProperty = (prop, value) => document.documentElement.style.setProperty(prop, value);

    const Theme = writable(getTheme(current));

    setContext('theme', {
        theme: Theme,
        toggle: () => {
            let index = themes.findIndex(t => t.name === current);
            const i = index === themes.length - 1 ? 0 : (++index)
            current = themes[i].name

            Theme.update(t=>({ ...t, ...getTheme(current) }))
            setRootColors(getTheme(current));
        },
        changeTheme: (name)=>{
            Theme.update(t=>({ ...t, ...getTheme(name) }))
            setRootColors(getTheme(name));

        }
    })

    onMount(()=>{
        setRootColors(getTheme(current));
    })

    function setRootColors (theme) {
        for(const [prop, color] of Object.entries(theme.colors)) {
            const cssVar = `--theme-${prop}`;
            setProperty(cssVar, color);
        }
        setProperty('--theme-name', theme.name);
    }
</script>

<slot>
    <!-- {children} -->
</slot>
