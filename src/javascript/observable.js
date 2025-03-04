"use strict" // observable.js also see dom.js

function combine(mutation_list) {
    // When a text change occurs in a contenteditable element, the browser may
    // update the existing text node and then replace it with a new node.
    // This can and does result in two MutationRecords for the same change:
    // one with a valid oldValue and one with an empty oldValue.
    // We combine such duplicate records based on their target.
    return mutation_list.reduce((combined, record) => {
        if (record.type === "characterData") {
            const existing = combined.find(r =>
                r.type === "characterData" && r.target === record.target
            )
            if (existing) {
                if (!existing.oldValue && record.oldValue) {
                    existing.oldValue = record.oldValue
                }
                return combined
            }
        }
        combined.push(record)
        return combined
    }, [])
}

function observe_mutations(o, subs) {
    if (!Object.prototype.hasOwnProperty.call(o,
            'observing_mutations')) {
        new MutationObserver((list) => {
            for (const m of combine(list)) { // `m` mutation
                if (m.type === "attributes") {
                    const attr = m.attributeName
                    const was = m.oldValue
                    const val = m.target.getAttribute(attr)
                    subs.forEach(s =>
                        s.changed?.(m.target, attr, was, val))
                } else if (m.type === "characterData") {
                    const was = m.oldValue
                    const val = m.target.data
                    subs.forEach(s =>
                        s.changed?.(m.target, 'characterData', was, val))
                } else if (m.type === "childList") {
                    const was = Array.from(m.removedNodes)
                        .map(n => n.textContent || n.nodeValue)
                    const val   = Array.from(m.addedNodes)
                        .map(n => n.textContent || n.nodeValue)
                    subs.forEach(s =>
                        s.changed?.(m.target, "childList", was, val))
                }
            }
        }).observe(o.element, {
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true,
            childList: true,
            subtree: true
        })
        Object.defineProperty(o, 'observing_mutations', {
            value: true
        })
    }
    return o
}

export function observe(t) {    // `t` target
    const subs = []             // subscribers array
    let watch  = undefined      // property to watch exclusively
    let deep   = false          // deep observation
    let alter  = false          // skipping unchanged values
    const cache = new WeakMap() // cache for nested proxies

    function is_dom_element(o) {
        return o && typeof o === 'object' && 'element' in o
    }
    
    function wrap(o) {
        // dom.js specific element wrapper:
        if (is_dom_element(o)) return observe_mutations(o, subs)
        if (cache.has(o)) return cache.get(o)
        const proxy = new Proxy(o, handler(false))
        cache.set(o, proxy)
        return proxy
    }

    function wrap_nested(v) {
        return !deep || !(v instanceof Object) || typeof v === 'function' ?
                v : wrap(v)
    }
        
    function handler(top) {
        return {
            set(o, p, v) { // `o` object, `p` property, `v` value
                if (top && watch && p !== watch) { o[p] = v; return true }
                const was = o[p]  // previous value
                if (alter && was === v) return true
                subs.forEach(s => s.changing?.(o, p, was, v))
                o[p] = wrap_nested(v)
                subs.forEach(s => s.changed?.(o, p, was, v))
                return true
            },
            get(o, p, r) { // `o` object, `p` property, `r` receiver
                const v = Reflect.get(o, p, r)
                // because array[] functions need "this"
                if (Array.isArray(o) && typeof v === "function") return v.bind(o)
                return typeof v === 'function' ? v.bind(r) : wrap_nested(v)
            }
        }
    }
    const proxy = new Proxy(t, handler(true))
    const methods = {
        only(p)  { watch = p;     return this }, // set property to watch
        deep(v)  { deep = v;      return this }, // toggle deep observation
        alter(v) { alter = v;     return this }, // toggle skipping unchanged
        on(cb)   { subs.push(cb); return this }, // add subscriber
        off(cb)  {
            const i = subs.indexOf(cb)  // index of callback
            if (i !== -1) { subs.splice(i, 1) }
            return this
        }
    }
    for (const i of Object.keys(methods)) {
        Object.defineProperty(proxy, i, { value: methods[i],
            writable: true, configurable: true, /* enumerable: false */
        })
    }
    return proxy
}

export function test(verbose = false) {
    const log    = verbose ? console.log : () => {}
    const assert = console.assert
    const counts = { changing: 0, changed: 0 } // Track callback counts
    const t      = { x: 1, y: 2, nested: { z: 3 } } // t target
    const phenomenon = observe(t)
        .only("x")
        .deep(true)
        .alter(true)
        .on({
            changing: () => counts.changing++,
            changed:  () => counts.changed++
        })
    log("Test 1: Setting x=10")
    phenomenon.x = 10
    assert(counts.changing === 1, "changing should fire once for x")
    assert(counts.changed === 1,  "changed should fire once for x")
    log("Test 2: Setting y=20 (ignored)")
    phenomenon.y = 20
    assert(counts.changing === 1, "changing should not fire for y")
    assert(counts.changed === 1,  "changed should not fire for y")
    log("Test 3: Setting nested.z=30")
    phenomenon.nested.z = 30
    assert(counts.changing === 2, "changing should fire for nested.z")
    assert(counts.changed === 2,  "changed should fire for nested.z")
    log("Test 4: Setting x=10 (same value)")
    phenomenon.x = 10
    assert(counts.changing === 2, "changing should skip same value")
    assert(counts.changed === 2,  "changed should skip same value")
    log("Test 5: Adding second subscriber")
    phenomenon.on({ changing: () => counts.changing++ })
    phenomenon.x = 20
    assert(counts.changing === 4, "two changing calls expected")
    assert(counts.changed === 3,  "one changed call expected")
    log("Test 6: Array push test")
    t.a = [1,2,3]
    const n = phenomenon.a.length
    phenomenon.a.push(4)
    assert(phenomenon.a.length === n + 1, "array length should increase")
    log("Test 7: Array index update")
    phenomenon.a[0] = 42
    assert(phenomenon.a[0] === 42, "array element should update")
    log("Test 8: array test")
    const a = [10,20,30]
    const p = observe(a).deep(true).alter(true)
        .on({
            changing: () => counts.changing++,
            changed:  () => counts.changed++
        })
    const m = p.length
    p.push(40)
    assert(p.length === m + 1, "array length should increase")
    p[0] = 99
    assert(p[0] === 99, "array element should update")
    log("All tests passed")
}

const self_test_on_load = false

function self_test() {
   test(true) // vebose
   // `t` target
   const t = { a: 1, nested: { b: 2,
       toString() { return ".nested ." + JSON.stringify(this) } },
       toString() { return `.a: ${this.a}, .nested: ${this.nested}` }
   }
   const callbacks = {
       changing: (o, p, was, val) =>
           console.log(`changing ${o}.${p}: ${was} -> ${val}`),
       changed:  (o, p, was, val) =>
           console.log(`changed  ${o}.${p}: ${was} -> ${val}`)
   }
   const phenomenon = observe(t)
       .only("a")    // Only watch property 'a'
       .deep(true)   // Observe nested objects
       .alter(true)  // Only trigger if value changes
       .on(callbacks)
   phenomenon.a = 153
   phenomenon.nested.b = 42
   phenomenon.off(callbacks)
}

if (self_test_on_load) self_test()


/*
 
### observable.js

This module creates an observable phenomenon for a target object using
JavaScript Proxies to monitor object property changes, including nested
ones.

 ### Purpose/Features/Usage

- **Purpose**: Watch changes in an object (e.g., `{ a: 1, nested: { b: 2 } }`).
- **Features**:
  - Selective watching (via `only`).
  - Deep nested observation (via `deep`).
  - Skip unchanged values (via `alter`).
  - Add/remove callbacks (via `on`/`off`).
- **Usage**:
```javascript
import * as observable from "./observable.js"

// `t` target: { a: 1, nested: { b: 2 } }
const t = { a: 1, nested: { b: 2,
    toString() { return JSON.stringify(this) } },
    toString() { return `.a: ${this.a}, .nested: ${this.nested}` }
}

 const callbacks = {
    changing: (o, p, was, val) =>
        console.log(`changing ${o}.${p}: ${was} -> ${val}`),
    changed:  (o, p, was, val) =>
        console.log(`changed  ${o}.${p}: ${was} -> ${val}`)
}

const phenomenon = observable.create(t)
    .only("a")      // Only watch property 'a'
    .deep(true)     // Observe nested objects
    .alter(true)    // Only trigger if value changes
    .on(callbacks)
phenomenon.a = 153          // Modify the returned proxy
phenomenon.nested.b = 42
phenomenon.off(callbacks)

### How Does create(t) Work?

1. **Core Structure**:
    - `create(t)`: Returns a Proxy for target `t`.
      Tracks subscribers and settings internally.

2. **Proxy Handler**:
    - `set(o, p, v)`: Handles property updates.
      - Skips if unwatched or unchanged (if set).
      - Calls `changing` before, `changed` after.
      - Wraps nested objects if `deep` is true.
    - `get(o, p)`: Returns values, wrapping nested objects.

3. **Configuration**:
    - Chained methods:
      - `only(p)`: Watch only `p`.
      - `deep(v)`: Toggle nested watching.
      - `alter(v)`: Toggle skipping unchanged.
      - `on(callbacks)`: Add subscriber.
      - `off(callbacks)`: Remove subscriber.

4. **Nested Objects**:
    - If `deep(true)`, nested objects get their own Proxy.
 
 ### What Does test() function confirms?

 - Changes to a trigger callbacks.
 - Unwatched b is ignored.
 - Nested c triggers if deep is on.
 - Same values skip if alter is on.
 - Multiple subscribers work.
 
*/
