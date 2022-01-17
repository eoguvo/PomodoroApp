
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/numberInput.svelte generated by Svelte v3.46.2 */
    const file$2 = "src/components/numberInput.svelte";

    function create_fragment$3(ctx) {
    	let div2;
    	let p0;
    	let t0_value = (/*label*/ ctx[1] || 'label nao selecionada') + "";
    	let t0;
    	let t1;
    	let div1;
    	let p1;
    	let t2;
    	let t3;
    	let div0;
    	let button0;
    	let svg0;
    	let path0;
    	let t4;
    	let button1;
    	let svg1;
    	let path1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t2 = text(/*time*/ ctx[0]);
    			t3 = space();
    			div0 = element("div");
    			button0 = element("button");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t4 = space();
    			button1 = element("button");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			attr_dev(p0, "class", "label svelte-1923et9");
    			add_location(p0, file$2, 73, 2, 1500);
    			attr_dev(p1, "class", "value svelte-1923et9");
    			add_location(p1, file$2, 75, 4, 1582);
    			attr_dev(path0, "fill", "none");
    			attr_dev(path0, "stroke", "#1E213F");
    			attr_dev(path0, "stroke-width", "2");
    			attr_dev(path0, "d", "M1 6l6-4 6 4");
    			add_location(path0, file$2, 83, 11, 1869);
    			attr_dev(svg0, "class", "arrow transition-all opacity-25 hover:opacity-100");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "width", "14");
    			attr_dev(svg0, "height", "7");
    			add_location(svg0, file$2, 78, 9, 1698);
    			attr_dev(button0, "class", "increment svelte-1923et9");
    			add_location(button0, file$2, 77, 6, 1642);
    			attr_dev(path1, "fill", "none");
    			attr_dev(path1, "stroke", "#1E213F");
    			attr_dev(path1, "stroke-width", "2");
    			attr_dev(path1, "d", "M1 1l6 4 6-4");
    			add_location(path1, file$2, 88, 11, 2121);
    			attr_dev(svg1, "class", "arrow");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "width", "14");
    			attr_dev(svg1, "height", "7");
    			add_location(svg1, file$2, 87, 9, 2034);
    			attr_dev(button1, "class", "decrement svelte-1923et9");
    			add_location(button1, file$2, 86, 6, 1978);
    			attr_dev(div0, "class", "buttons svelte-1923et9");
    			add_location(div0, file$2, 76, 4, 1614);
    			attr_dev(div1, "class", "input svelte-1923et9");
    			add_location(div1, file$2, 74, 2, 1558);
    			attr_dev(div2, "class", "input-group svelte-1923et9");
    			add_location(div2, file$2, 72, 0, 1472);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, p0);
    			append_dev(p0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t2);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(button0, svg0);
    			append_dev(svg0, path0);
    			append_dev(div0, t4);
    			append_dev(div0, button1);
    			append_dev(button1, svg1);
    			append_dev(svg1, path1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*increment*/ ctx[2], false, false, false),
    					listen_dev(button1, "click", /*decrement*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*label*/ 2 && t0_value !== (t0_value = (/*label*/ ctx[1] || 'label nao selecionada') + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*time*/ 1) set_data_dev(t2, /*time*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function toMinutes(seconds) {
    	return Number(seconds) / 60;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NumberInput', slots, []);
    	let { label } = $$props;
    	let { time } = $$props;

    	onMount(() => {
    		$$invalidate(0, time = toMinutes(time));
    	});

    	function increment() {
    		$$invalidate(0, time = Number(time));
    		if ($$invalidate(0, time += 5) >= 60) return $$invalidate(0, time = 60);
    	}

    	function decrement() {
    		$$invalidate(0, time = Number(time));
    		if ($$invalidate(0, time -= 5) <= 5) return $$invalidate(0, time = 5);
    	}

    	const writable_props = ['label', 'time'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NumberInput> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    		if ('time' in $$props) $$invalidate(0, time = $$props.time);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		label,
    		time,
    		increment,
    		decrement,
    		toMinutes
    	});

    	$$self.$inject_state = $$props => {
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    		if ('time' in $$props) $$invalidate(0, time = $$props.time);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [time, label, increment, decrement];
    }

    class NumberInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { label: 1, time: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NumberInput",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*label*/ ctx[1] === undefined && !('label' in props)) {
    			console.warn("<NumberInput> was created without expected prop 'label'");
    		}

    		if (/*time*/ ctx[0] === undefined && !('time' in props)) {
    			console.warn("<NumberInput> was created without expected prop 'time'");
    		}
    	}

    	get label() {
    		throw new Error("<NumberInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<NumberInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get time() {
    		throw new Error("<NumberInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set time(value) {
    		throw new Error("<NumberInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Modal.svelte generated by Svelte v3.46.2 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/components/Modal.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let div1;
    	let header;
    	let h20;
    	let t1;
    	let button;
    	let svg;
    	let path;
    	let t2;
    	let hr0;
    	let t3;
    	let section0;
    	let h21;
    	let t5;
    	let numberinput0;
    	let updating_time;
    	let t6;
    	let numberinput1;
    	let updating_time_1;
    	let t7;
    	let numberinput2;
    	let updating_time_2;
    	let t8;
    	let hr1;
    	let t9;
    	let section1;
    	let h22;
    	let t11;
    	let div0;
    	let label0;
    	let input0;
    	let t12;
    	let span0;
    	let t13;
    	let label1;
    	let input1;
    	let t14;
    	let span1;
    	let t15;
    	let label2;
    	let input2;
    	let t16;
    	let span2;
    	let current;
    	let mounted;
    	let dispose;

    	function numberinput0_time_binding(value) {
    		/*numberinput0_time_binding*/ ctx[8](value);
    	}

    	let numberinput0_props = { label: "pomodoro" };

    	if (/*pomo*/ ctx[1] !== void 0) {
    		numberinput0_props.time = /*pomo*/ ctx[1];
    	}

    	numberinput0 = new NumberInput({
    			props: numberinput0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberinput0, 'time', numberinput0_time_binding));

    	function numberinput1_time_binding(value) {
    		/*numberinput1_time_binding*/ ctx[9](value);
    	}

    	let numberinput1_props = { label: "short break" };

    	if (/*short*/ ctx[2] !== void 0) {
    		numberinput1_props.time = /*short*/ ctx[2];
    	}

    	numberinput1 = new NumberInput({
    			props: numberinput1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberinput1, 'time', numberinput1_time_binding));

    	function numberinput2_time_binding(value) {
    		/*numberinput2_time_binding*/ ctx[10](value);
    	}

    	let numberinput2_props = { label: "long break" };

    	if (/*long*/ ctx[3] !== void 0) {
    		numberinput2_props.time = /*long*/ ctx[3];
    	}

    	numberinput2 = new NumberInput({
    			props: numberinput2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(numberinput2, 'time', numberinput2_time_binding));

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			header = element("header");
    			h20 = element("h2");
    			h20.textContent = "Settings";
    			t1 = space();
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t2 = space();
    			hr0 = element("hr");
    			t3 = space();
    			section0 = element("section");
    			h21 = element("h2");
    			h21.textContent = "TIME (MINUTES)";
    			t5 = space();
    			create_component(numberinput0.$$.fragment);
    			t6 = space();
    			create_component(numberinput1.$$.fragment);
    			t7 = space();
    			create_component(numberinput2.$$.fragment);
    			t8 = space();
    			hr1 = element("hr");
    			t9 = space();
    			section1 = element("section");
    			h22 = element("h2");
    			h22.textContent = "COLOR";
    			t11 = space();
    			div0 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t12 = space();
    			span0 = element("span");
    			t13 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t14 = space();
    			span1 = element("span");
    			t15 = space();
    			label2 = element("label");
    			input2 = element("input");
    			t16 = space();
    			span2 = element("span");
    			attr_dev(h20, "class", "modal-title svelte-12i7vfm");
    			add_location(h20, file$1, 128, 6, 2827);
    			attr_dev(path, "fill", "#fff");
    			attr_dev(path, "fill-rule", "evenodd");
    			attr_dev(path, "d", "M11.95.636l1.414 1.414L8.414 7l4.95 4.95-1.414 1.414L7 8.414l-4.95 4.95L.636 11.95 5.586 7 .636 2.05 2.05.636 7 5.586l4.95-4.95z");
    			add_location(path, file$1, 131, 11, 2998);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "14");
    			attr_dev(svg, "height", "14");
    			add_location(svg, file$1, 130, 9, 2924);
    			add_location(button, file$1, 129, 6, 2871);
    			attr_dev(header, "class", "svelte-12i7vfm");
    			add_location(header, file$1, 127, 4, 2812);
    			add_location(hr0, file$1, 139, 4, 3267);
    			attr_dev(h21, "class", "subtitle svelte-12i7vfm");
    			add_location(h21, file$1, 141, 6, 3307);
    			attr_dev(section0, "class", "time svelte-12i7vfm");
    			add_location(section0, file$1, 140, 4, 3278);
    			add_location(hr1, file$1, 146, 4, 3541);
    			attr_dev(h22, "class", "subtitle svelte-12i7vfm");
    			add_location(h22, file$1, 148, 6, 3583);
    			attr_dev(input0, "type", "radio");
    			input0.__value = "red";
    			input0.value = input0.__value;
    			attr_dev(input0, "class", "svelte-12i7vfm");
    			/*$$binding_groups*/ ctx[12][0].push(input0);
    			add_location(input0, file$1, 151, 10, 3668);
    			attr_dev(span0, "class", "checkmark svelte-12i7vfm");
    			set_style(span0, "background-color", "#f87070");
    			add_location(span0, file$1, 152, 10, 3733);
    			attr_dev(label0, "class", "svelte-12i7vfm");
    			add_location(label0, file$1, 150, 8, 3650);
    			attr_dev(input1, "type", "radio");
    			input1.__value = "blue";
    			input1.value = input1.__value;
    			attr_dev(input1, "class", "svelte-12i7vfm");
    			/*$$binding_groups*/ ctx[12][0].push(input1);
    			add_location(input1, file$1, 155, 10, 3838);
    			attr_dev(span1, "class", "checkmark svelte-12i7vfm");
    			set_style(span1, "background-color", "#70f3f8");
    			add_location(span1, file$1, 156, 10, 3904);
    			attr_dev(label1, "class", "svelte-12i7vfm");
    			add_location(label1, file$1, 154, 8, 3820);
    			attr_dev(input2, "type", "radio");
    			input2.__value = "purple";
    			input2.value = input2.__value;
    			attr_dev(input2, "class", "svelte-12i7vfm");
    			/*$$binding_groups*/ ctx[12][0].push(input2);
    			add_location(input2, file$1, 159, 10, 4009);
    			attr_dev(span2, "class", "checkmark svelte-12i7vfm");
    			set_style(span2, "background-color", "#d881f8");
    			add_location(span2, file$1, 160, 10, 4077);
    			attr_dev(label2, "class", "svelte-12i7vfm");
    			add_location(label2, file$1, 158, 8, 3991);
    			attr_dev(div0, "class", "inputs");
    			add_location(div0, file$1, 149, 6, 3621);
    			attr_dev(section1, "class", "colors svelte-12i7vfm");
    			add_location(section1, file$1, 147, 4, 3552);
    			attr_dev(div1, "class", "modal-wrapper svelte-12i7vfm");
    			add_location(div1, file$1, 126, 2, 2780);
    			attr_dev(div2, "class", "modal svelte-12i7vfm");
    			attr_dev(div2, "tabindex", 0);
    			add_location(div2, file$1, 125, 0, 2724);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, header);
    			append_dev(header, h20);
    			append_dev(header, t1);
    			append_dev(header, button);
    			append_dev(button, svg);
    			append_dev(svg, path);
    			append_dev(div1, t2);
    			append_dev(div1, hr0);
    			append_dev(div1, t3);
    			append_dev(div1, section0);
    			append_dev(section0, h21);
    			append_dev(section0, t5);
    			mount_component(numberinput0, section0, null);
    			append_dev(section0, t6);
    			mount_component(numberinput1, section0, null);
    			append_dev(section0, t7);
    			mount_component(numberinput2, section0, null);
    			append_dev(div1, t8);
    			append_dev(div1, hr1);
    			append_dev(div1, t9);
    			append_dev(div1, section1);
    			append_dev(section1, h22);
    			append_dev(section1, t11);
    			append_dev(section1, div0);
    			append_dev(div0, label0);
    			append_dev(label0, input0);
    			input0.checked = input0.__value === /*colors*/ ctx[4];
    			append_dev(label0, t12);
    			append_dev(label0, span0);
    			append_dev(div0, t13);
    			append_dev(div0, label1);
    			append_dev(label1, input1);
    			input1.checked = input1.__value === /*colors*/ ctx[4];
    			append_dev(label1, t14);
    			append_dev(label1, span1);
    			append_dev(div0, t15);
    			append_dev(div0, label2);
    			append_dev(label2, input2);
    			input2.checked = input2.__value === /*colors*/ ctx[4];
    			append_dev(label2, t16);
    			append_dev(label2, span2);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[11]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[13]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[14]),
    					listen_dev(div2, "keydown", /*keydown*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const numberinput0_changes = {};

    			if (!updating_time && dirty & /*pomo*/ 2) {
    				updating_time = true;
    				numberinput0_changes.time = /*pomo*/ ctx[1];
    				add_flush_callback(() => updating_time = false);
    			}

    			numberinput0.$set(numberinput0_changes);
    			const numberinput1_changes = {};

    			if (!updating_time_1 && dirty & /*short*/ 4) {
    				updating_time_1 = true;
    				numberinput1_changes.time = /*short*/ ctx[2];
    				add_flush_callback(() => updating_time_1 = false);
    			}

    			numberinput1.$set(numberinput1_changes);
    			const numberinput2_changes = {};

    			if (!updating_time_2 && dirty & /*long*/ 8) {
    				updating_time_2 = true;
    				numberinput2_changes.time = /*long*/ ctx[3];
    				add_flush_callback(() => updating_time_2 = false);
    			}

    			numberinput2.$set(numberinput2_changes);

    			if (dirty & /*colors*/ 16) {
    				input0.checked = input0.__value === /*colors*/ ctx[4];
    			}

    			if (dirty & /*colors*/ 16) {
    				input1.checked = input1.__value === /*colors*/ ctx[4];
    			}

    			if (dirty & /*colors*/ 16) {
    				input2.checked = input2.__value === /*colors*/ ctx[4];
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(numberinput0.$$.fragment, local);
    			transition_in(numberinput1.$$.fragment, local);
    			transition_in(numberinput2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numberinput0.$$.fragment, local);
    			transition_out(numberinput1.$$.fragment, local);
    			transition_out(numberinput2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(numberinput0);
    			destroy_component(numberinput1);
    			destroy_component(numberinput2);
    			/*$$binding_groups*/ ctx[12][0].splice(/*$$binding_groups*/ ctx[12][0].indexOf(input0), 1);
    			/*$$binding_groups*/ ctx[12][0].splice(/*$$binding_groups*/ ctx[12][0].indexOf(input1), 1);
    			/*$$binding_groups*/ ctx[12][0].splice(/*$$binding_groups*/ ctx[12][0].indexOf(input2), 1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Modal', slots, []);
    	const { changeTheme } = getContext('theme');
    	let { breaks } = $$props;
    	let { toggleModal } = $$props;
    	let { pomo, short, long } = breaks;

    	function keydown(e) {
    		e.stopPropagation();
    		console.log(e);

    		if (e.key === 'Escape') {
    			toggleModal(false);
    		}
    	}

    	const value = JSON.parse(localStorage.getItem('theme'));
    	let colors = value && value.name || 'red';
    	const writable_props = ['breaks', 'toggleModal'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];
    	const click_handler = () => toggleModal(false);

    	function numberinput0_time_binding(value) {
    		pomo = value;
    		$$invalidate(1, pomo);
    	}

    	function numberinput1_time_binding(value) {
    		short = value;
    		$$invalidate(2, short);
    	}

    	function numberinput2_time_binding(value) {
    		long = value;
    		$$invalidate(3, long);
    	}

    	function input0_change_handler() {
    		colors = this.__value;
    		$$invalidate(4, colors);
    	}

    	function input1_change_handler() {
    		colors = this.__value;
    		$$invalidate(4, colors);
    	}

    	function input2_change_handler() {
    		colors = this.__value;
    		$$invalidate(4, colors);
    	}

    	$$self.$$set = $$props => {
    		if ('breaks' in $$props) $$invalidate(6, breaks = $$props.breaks);
    		if ('toggleModal' in $$props) $$invalidate(0, toggleModal = $$props.toggleModal);
    	};

    	$$self.$capture_state = () => ({
    		NumberInput,
    		getContext,
    		changeTheme,
    		breaks,
    		toggleModal,
    		pomo,
    		short,
    		long,
    		keydown,
    		value,
    		colors
    	});

    	$$self.$inject_state = $$props => {
    		if ('breaks' in $$props) $$invalidate(6, breaks = $$props.breaks);
    		if ('toggleModal' in $$props) $$invalidate(0, toggleModal = $$props.toggleModal);
    		if ('pomo' in $$props) $$invalidate(1, pomo = $$props.pomo);
    		if ('short' in $$props) $$invalidate(2, short = $$props.short);
    		if ('long' in $$props) $$invalidate(3, long = $$props.long);
    		if ('colors' in $$props) $$invalidate(4, colors = $$props.colors);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*pomo*/ 2) {
    			$$invalidate(6, breaks['pomo'] = pomo * 60, breaks);
    		}

    		if ($$self.$$.dirty & /*short*/ 4) {
    			$$invalidate(6, breaks['short'] = short * 60, breaks);
    		}

    		if ($$self.$$.dirty & /*long*/ 8) {
    			$$invalidate(6, breaks['long'] = long * 60, breaks);
    		}

    		if ($$self.$$.dirty & /*colors*/ 16) {
    			changeTheme(colors);
    		}
    	};

    	return [
    		toggleModal,
    		pomo,
    		short,
    		long,
    		colors,
    		keydown,
    		breaks,
    		click_handler,
    		numberinput0_time_binding,
    		numberinput1_time_binding,
    		numberinput2_time_binding,
    		input0_change_handler,
    		$$binding_groups,
    		input1_change_handler,
    		input2_change_handler
    	];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { breaks: 6, toggleModal: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*breaks*/ ctx[6] === undefined && !('breaks' in props)) {
    			console_1$1.warn("<Modal> was created without expected prop 'breaks'");
    		}

    		if (/*toggleModal*/ ctx[0] === undefined && !('toggleModal' in props)) {
    			console_1$1.warn("<Modal> was created without expected prop 'toggleModal'");
    		}
    	}

    	get breaks() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set breaks(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toggleModal() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggleModal(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function formatTime(totalSeconds) {
      const min = (totalSeconds / 60) >> 0;
      const sec = totalSeconds % 60 >> 0;
      return `${min >= 10 ? min : `0${min}`}:${sec >= 10 ? sec : `0${sec}`}`;
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    // src/themes.js
    const themes = [
      {
        name: 'red',
        colors: {
          primary: '#f87070'
        }
      },
      {
        name: 'blue',
        colors: {
          primary: '#70f3f8'
        }
      },
      {
        name: 'purple',
        colors: {
          primary: '#d881f8'
        }
      }
    ];

    /* src/ThemeContext.svelte generated by Svelte v3.46.2 */

    const { Object: Object_1 } = globals;

    function create_fragment$1(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[1],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ThemeContext', slots, ['default']);
    	let { themes: themes$1 = [...themes] } = $$props;
    	let current = themes$1[0].name;
    	const getTheme = name => themes$1.find(_theme => _theme.name === name);
    	const setProperty = (prop, value) => document.documentElement.style.setProperty(prop, value);
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
    			let index = themes$1.findIndex(t => t.name === current);
    			const i = index === themes$1.length - 1 ? 0 : ++index;
    			current = themes$1[i].name;
    			Theme.update(t => Object.assign(Object.assign({}, t), getTheme(current)));
    			setRootColors(getTheme(current));
    		},
    		changeTheme: name => {
    			Theme.update(t => Object.assign(Object.assign({}, t), getTheme(name)));
    			setRootColors(getTheme(name));
    		}
    	});

    	onMount(() => {
    		hasMounted = true;
    		const value = JSON.parse(localStorage.getItem('theme'));
    		current = value && value.name || themes$1[0].name;
    		setRootColors(getTheme(current));
    	});

    	function setRootColors(theme) {
    		for (const [prop, color] of Object.entries(theme.colors)) {
    			const cssVar = `--theme-${prop}`;
    			setProperty(cssVar, color);
    		}

    		setProperty('--theme-name', theme.name);
    	}

    	const writable_props = ['themes'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ThemeContext> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('themes' in $$props) $$invalidate(0, themes$1 = $$props.themes);
    		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		setContext,
    		onMount,
    		writable,
    		_themes: themes,
    		themes: themes$1,
    		current,
    		getTheme,
    		setProperty,
    		Theme,
    		hasMounted,
    		setRootColors
    	});

    	$$self.$inject_state = $$props => {
    		if ('themes' in $$props) $$invalidate(0, themes$1 = $$props.themes);
    		if ('current' in $$props) current = $$props.current;
    		if ('hasMounted' in $$props) hasMounted = $$props.hasMounted;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [themes$1, $$scope, slots];
    }

    class ThemeContext extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { themes: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ThemeContext",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get themes() {
    		throw new Error("<ThemeContext>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set themes(value) {
    		throw new Error("<ThemeContext>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.2 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    // (234:8) {:else}
    function create_else_block(ctx) {
    	let button;
    	let t_value = (/*interval*/ ctx[4] ? 'STOP' : 'START') + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "play svelte-1xglnmb");
    			add_location(button, file, 234, 10, 5637);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*togglePomodoro*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*interval*/ 16 && t_value !== (t_value = (/*interval*/ ctx[4] ? 'STOP' : 'START') + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(234:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (232:8) {#if time <= 0}
    function create_if_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "RESTART";
    			attr_dev(button, "class", "play svelte-1xglnmb");
    			add_location(button, file, 232, 10, 5552);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*Restart*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(232:8) {#if time <= 0}",
    		ctx
    	});

    	return block;
    }

    // (194:0) <ThemeContext>
    function create_default_slot_1(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let button2;
    	let t7;
    	let div2;
    	let div1;
    	let svg;
    	let circle;
    	let t8;
    	let p;
    	let t9_value = formatTime(/*time*/ ctx[3]) + "";
    	let t9;
    	let t10;
    	let t11;
    	let button3;
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*time*/ ctx[3] <= 0) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "pomodoro";
    			t1 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "pomodoro";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "short break";
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "long break";
    			t7 = space();
    			div2 = element("div");
    			div1 = element("div");
    			svg = svg_element("svg");
    			circle = svg_element("circle");
    			t8 = space();
    			p = element("p");
    			t9 = text(t9_value);
    			t10 = space();
    			if_block.c();
    			t11 = space();
    			button3 = element("button");
    			img = element("img");
    			attr_dev(h1, "class", "title svelte-1xglnmb");
    			add_location(h1, file, 195, 4, 4516);
    			attr_dev(button0, "class", "pomo svelte-1xglnmb");
    			toggle_class(button0, "selected", /*current*/ ctx[1] === 'pomo');
    			add_location(button0, file, 197, 6, 4579);
    			attr_dev(button1, "class", "short svelte-1xglnmb");
    			toggle_class(button1, "selected", /*current*/ ctx[1] === 'short');
    			add_location(button1, file, 203, 6, 4740);
    			attr_dev(button2, "class", "long svelte-1xglnmb");
    			toggle_class(button2, "selected", /*current*/ ctx[1] === 'long');
    			add_location(button2, file, 209, 6, 4907);
    			attr_dev(div0, "class", "breaks svelte-1xglnmb");
    			add_location(div0, file, 196, 4, 4552);
    			attr_dev(circle, "class", "progress-ring__circle svelte-1xglnmb");
    			attr_dev(circle, "fill", "none");
    			attr_dev(circle, "stroke", "currentColor");
    			attr_dev(circle, "cx", "60");
    			attr_dev(circle, "cy", "60");
    			attr_dev(circle, "r", "54");
    			attr_dev(circle, "stroke-width", "4");
    			add_location(circle, file, 219, 10, 5213);
    			attr_dev(svg, "class", "progress-ring svelte-1xglnmb");
    			attr_dev(svg, "data-testid", "svg");
    			attr_dev(svg, "viewBox", "0 0 120 120");
    			add_location(svg, file, 218, 8, 5135);
    			attr_dev(p, "class", "time svelte-1xglnmb");
    			add_location(p, file, 230, 8, 5479);
    			attr_dev(div1, "class", "content svelte-1xglnmb");
    			add_location(div1, file, 217, 6, 5105);
    			attr_dev(div2, "class", "watch svelte-1xglnmb");
    			add_location(div2, file, 216, 4, 5079);
    			attr_dev(img, "height", "24");
    			attr_dev(img, "width", "24");
    			if (!src_url_equal(img.src, img_src_value = "./assets/config.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "configuration");
    			add_location(img, file, 241, 7, 5850);
    			attr_dev(button3, "class", "config svelte-1xglnmb");
    			add_location(button3, file, 240, 4, 5789);
    			attr_dev(main, "class", "svelte-1xglnmb");
    			add_location(main, file, 194, 2, 4505);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(div0, t5);
    			append_dev(div0, button2);
    			append_dev(main, t7);
    			append_dev(main, div2);
    			append_dev(div2, div1);
    			append_dev(div1, svg);
    			append_dev(svg, circle);
    			/*circle_binding*/ ctx[15](circle);
    			append_dev(div1, t8);
    			append_dev(div1, p);
    			append_dev(p, t9);
    			append_dev(div1, t10);
    			if_block.m(div1, null);
    			append_dev(main, t11);
    			append_dev(main, button3);
    			append_dev(button3, img);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[13], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[14], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*current*/ 2) {
    				toggle_class(button0, "selected", /*current*/ ctx[1] === 'pomo');
    			}

    			if (dirty & /*current*/ 2) {
    				toggle_class(button1, "selected", /*current*/ ctx[1] === 'short');
    			}

    			if (dirty & /*current*/ 2) {
    				toggle_class(button2, "selected", /*current*/ ctx[1] === 'long');
    			}

    			if (dirty & /*time*/ 8 && t9_value !== (t9_value = formatTime(/*time*/ ctx[3]) + "")) set_data_dev(t9, t9_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*circle_binding*/ ctx[15](null);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(194:0) <ThemeContext>",
    		ctx
    	});

    	return block;
    }

    // (251:0) {#if show}
    function create_if_block(ctx) {
    	let themecontext;
    	let current;

    	themecontext = new ThemeContext({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(themecontext.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(themecontext, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const themecontext_changes = {};

    			if (dirty & /*$$scope, breaks*/ 524292) {
    				themecontext_changes.$$scope = { dirty, ctx };
    			}

    			themecontext.$set(themecontext_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(themecontext.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(themecontext.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(themecontext, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(251:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    // (252:2) <ThemeContext>
    function create_default_slot(ctx) {
    	let modal;
    	let updating_breaks;
    	let current;

    	function modal_breaks_binding(value) {
    		/*modal_breaks_binding*/ ctx[17](value);
    	}

    	let modal_props = { toggleModal: /*toggleModal*/ ctx[9] };

    	if (/*breaks*/ ctx[2] !== void 0) {
    		modal_props.breaks = /*breaks*/ ctx[2];
    	}

    	modal = new Modal({ props: modal_props, $$inline: true });
    	binding_callbacks.push(() => bind(modal, 'breaks', modal_breaks_binding));

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};

    			if (!updating_breaks && dirty & /*breaks*/ 4) {
    				updating_breaks = true;
    				modal_changes.breaks = /*breaks*/ ctx[2];
    				add_flush_callback(() => updating_breaks = false);
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(252:2) <ThemeContext>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let themecontext;
    	let t;
    	let if_block_anchor;
    	let current;

    	themecontext = new ThemeContext({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block = /*show*/ ctx[5] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			create_component(themecontext.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(themecontext, target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const themecontext_changes = {};

    			if (dirty & /*$$scope, show, time, interval, circleRef, current*/ 524347) {
    				themecontext_changes.$$scope = { dirty, ctx };
    			}

    			themecontext.$set(themecontext_changes);

    			if (/*show*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 32) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(themecontext.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(themecontext.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(themecontext, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let time;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let circleRef, interval, circumference = 0, dashoffset = 0, show = false;
    	let current = 'pomo';
    	let breaks = JSON.parse(localStorage.getItem('breaks')) || { pomo: 1500, short: 300, long: 900 };

    	onMount(() => {
    		if (circleRef) {
    			$$invalidate(10, circumference = 2 * Math.PI * circleRef.r.baseVal.value);
    			$$invalidate(0, circleRef.style.strokeDasharray = circumference.toString(), circleRef);
    			$$invalidate(0, circleRef.style.strokeDashoffset = circumference.toString(), circleRef);
    		}
    	});

    	function ResetCircle() {
    		if (circleRef) {
    			$$invalidate(0, circleRef.style.strokeDasharray = circumference.toString(), circleRef);
    			$$invalidate(0, circleRef.style.strokeDashoffset = circumference.toString(), circleRef);
    		}
    	}

    	function togglePomodoro() {
    		if (interval) {
    			clearInterval(interval);
    			$$invalidate(4, interval = undefined);
    			return;
    		}

    		$$invalidate(4, interval = setInterval(
    			() => {
    				if ($$invalidate(3, --time) <= 0) {
    					clearInterval(interval);
    				}

    				if (circleRef) {
    					$$invalidate(0, circleRef.style.strokeDasharray = circumference.toString(), circleRef);
    					$$invalidate(0, circleRef.style.strokeDashoffset = dashoffset.toString(), circleRef);
    				}
    			},
    			1000
    		));
    	}

    	function Restart() {
    		ResetCircle();
    		$$invalidate(4, interval = undefined);
    		$$invalidate(3, time = breaks[current]);
    		togglePomodoro();
    	}

    	function changePomodoro(name) {
    		$$invalidate(1, current = name);

    		if (interval) {
    			clearInterval(interval);
    			$$invalidate(4, interval = undefined);
    		}

    		if (circleRef) {
    			ResetCircle();
    		}
    	}

    	function toggleModal(value) {
    		if (!value) return $$invalidate(5, show = !show);
    		$$invalidate(5, show = value);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => changePomodoro('pomo');
    	const click_handler_1 = () => changePomodoro('short');
    	const click_handler_2 = () => changePomodoro('long');

    	function circle_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			circleRef = $$value;
    			$$invalidate(0, circleRef);
    		});
    	}

    	const click_handler_3 = () => $$invalidate(5, show = true);

    	function modal_breaks_binding(value) {
    		breaks = value;
    		$$invalidate(2, breaks);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Modal,
    		formatTime,
    		ThemeContext,
    		circleRef,
    		interval,
    		circumference,
    		dashoffset,
    		show,
    		current,
    		breaks,
    		ResetCircle,
    		togglePomodoro,
    		Restart,
    		changePomodoro,
    		toggleModal,
    		time
    	});

    	$$self.$inject_state = $$props => {
    		if ('circleRef' in $$props) $$invalidate(0, circleRef = $$props.circleRef);
    		if ('interval' in $$props) $$invalidate(4, interval = $$props.interval);
    		if ('circumference' in $$props) $$invalidate(10, circumference = $$props.circumference);
    		if ('dashoffset' in $$props) $$invalidate(11, dashoffset = $$props.dashoffset);
    		if ('show' in $$props) $$invalidate(5, show = $$props.show);
    		if ('current' in $$props) $$invalidate(1, current = $$props.current);
    		if ('breaks' in $$props) $$invalidate(2, breaks = $$props.breaks);
    		if ('time' in $$props) $$invalidate(3, time = $$props.time);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*breaks*/ 4) {
    			localStorage.setItem('breaks', JSON.stringify(breaks));
    		}

    		if ($$self.$$.dirty & /*breaks, current*/ 6) {
    			$$invalidate(3, time = breaks[current]);
    		}

    		if ($$self.$$.dirty & /*circleRef, breaks, current, time, circumference, dashoffset*/ 3087) {
    			if (circleRef) {
    				const perc = (breaks[current] - time) % 360 + 1;
    				$$invalidate(11, dashoffset = circumference - perc / breaks[current] * circumference);

    				console.log({
    					perc,
    					dashoffset,
    					break: breaks[current],
    					circumference
    				});
    			}
    		}
    	};

    	return [
    		circleRef,
    		current,
    		breaks,
    		time,
    		interval,
    		show,
    		togglePomodoro,
    		Restart,
    		changePomodoro,
    		toggleModal,
    		circumference,
    		dashoffset,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		circle_binding,
    		click_handler_3,
    		modal_breaks_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
