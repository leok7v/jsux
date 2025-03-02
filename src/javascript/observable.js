// observable.js

"use strict"

export function create(t) {  // t target
    const subs  = []         // subscribers array
    let watch   = undefined  // property to watch exclusively
    let deep    = false      // flag for deep observation
    let alter   = false      // flag for skipping unchanged values
    function handler(top) {
        return {
            set(obj, prop, val) { // obj object, prop property, val value
                if (top && watch && prop !== watch) {
                    obj[prop] = val
                    return true
                }
                const prev = obj[prop]  // previous value
                if (alter && prev === val) return true
                subs.forEach(s => s.changing?.(prop, prev, val))
                obj[prop] = deep && val instanceof Object ?
                    new Proxy(val, handler(false)) : val // wrap nested objects
                subs.forEach(s => s.changed?.(prop, prev, val))
                return true
            },
            get(obj, prop) { // obj object, prop property
                const val = obj[prop]  // value
                return deep && val instanceof Object ?
                    new Proxy(val, handler(false)) : val // return nested proxy
            }
        }
    }
    const proxy = new Proxy(t, handler(true))
    return {
        proxy,
        only(p)  { watch = p;  return this }, // set property to watch
        deep(v)  { deep = v;   return this }, // toggle deep observation
        alter(v) { alter = v;  return this }, // toggle skipping unchanged
        on(cb)   { subs.push(cb); return this }, // add subscriber
        off(cb)  {
            const i = subs.indexOf(cb)  // index of callback
            if (i !== -1) { subs.splice(i, 1) }
            return this
        }
    }
}

export function test(verbose = false) {
    const log    = verbose ? console.log : () => {}
    const assert = console.assert
    const counts = { changing: 0, changed: 0 } // Track callback counts
    const t      = { a: 1, b: 2, nested: { c: 3 } } // t target
    const phenomenon = create(t)
        .only("a")
        .deep(true)
        .alter(true)
        .on({
            changing: () => counts.changing++,
            changed:  () => counts.changed++
        })
    log("Test 1: Setting a=10")
    phenomenon.proxy.a = 10
    assert(counts.changing === 1, "changing should fire once for a")
    assert(counts.changed === 1,  "changed should fire once for a")
    log("Test 2: Setting b=20 (ignored)")
    phenomenon.proxy.b = 20
    assert(counts.changing === 1, "changing should not fire for b")
    assert(counts.changed === 1,  "changed should not fire for b")
    log("Test 3: Setting nested.c=30")
    phenomenon.proxy.nested.c = 30
    assert(counts.changing === 2, "changing should fire for nested.c")
    assert(counts.changed === 2,  "changed should fire for nested.c")
    log("Test 4: Setting a=10 (same value)")
    phenomenon.proxy.a = 10
    assert(counts.changing === 2, "changing should skip same value")
    assert(counts.changed === 2,  "changed should skip same value")
    log("Test 5: Adding second subscriber")
    phenomenon.on({ changing: () => counts.changing++ })
    phenomenon.proxy.a = 20
    assert(counts.changing === 4, "two changing calls expected")
    assert(counts.changed === 3,  "one changed call expected")
    log("All tests passed")
}

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

const t = { a: 1, nested: { b: 2 } } // `t` target
const callbacks = {
    changing: (prop, oldVal, newVal) =>
        console.log(`${prop}: ${oldVal} -> ${newVal}`),
    changed: (prop, oldVal, newVal) =>
        console.log(`${prop} now ${newVal}`)
}

const phenomenon = observable.create(t)
    .only("a")      // Only watch property 'a'
    .deep(true)     // Observe nested objects
    .alter(true)    // Only trigger if value changes
    .on(callbacks)
phenomenon.proxy.a = 153          // Modify the returned proxy
phenomenon.proxy.nested.b = 42
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
