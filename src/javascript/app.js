"use strict"

import * as observable from "./observable.js"
import * as util       from "./util.js"
import * as dom        from "./dom.js"
import { assert }      from "./util.js" // better assert

const debug = true

export function render_log(log) {
    // be careful not to use logging here because it will result in endless loop
    const list = dom.ul()
    for (const msg of util.console_log) {
        list.append(dom.li().text(msg))
    }
    log.element.innerHTML = ""
    log.append(list)
}

function create_log() {
    const log = dom.div().style({
        position: "fixed",
        bottom: "0",
        left: "0",
        width: "100%",
        background: "#fff",
        maxHeight: "200px",
        overflowY: "auto",
        borderTop: "1px solid #ccc"
    })
    util.console_log.on({ changed: () => render_log(log) })
    return log
}

const content_view = {

    state: observable.observe({ // ui state
        inc: null,
        dec: null,
        min: null,
        max: null,
        num: null
    }).deep(true),
    
    foo: 'bar', // view variables
    
    init() { // not an closure (aka "arrow function") "this" point to object
        const state  = this.state
        const keydown = (e) => {
            if (e.key === 'Enter' && e.target.isContentEditable) {
                e.preventDefault()
                e.target.blur()
            }
        }
        const select = (e) => { // need to delay because focus() selects too
            requestAnimationFrame(() => {
                const range = document.createRange()
                range.selectNodeContents(e.target)
                const sel = window.getSelection()
                sel.removeAllRanges()
                sel.addRange(range)
            })
        }
        const content = dom.div()
        content.element.className = 'content'
        const inline = (txt, tab) => {
            return dom.div().text(txt).display.inline().tabindex(tab).monospace()
            .contenteditable.plain()
        }
        state.min = inline('0', 0)
        state.max = inline('9', 0)
        state.num = inline('3', 0)
        state.dec = dom.button().text('➖').monospace()
        state.inc = dom.button().text('➕').monospace()
        const { min, max, num, dec, inc } = state
        const block = (txt) => {
            return dom.div().display.block().append(dom.span().text(txt).monospace())
        }
        const minimum = block('min:\x20').append(min)
        const maximum = block('max:\x20').append(max)
        const number = dom.div().display.block().append(dec).append(num).append(inc)
        content.append(minimum).append(maximum).append(number)
        let log = create_log()
        content.append(log)
        render_log(log) // DEBUG!
        document.getElementById('app').appendChild(content.element)
        for (const key of Object.keys(state)) { state[key].element.id = key }
        min.on({ input: () => this.update(state), keydown: (e) => keydown(e),
                 focus: (e) => select(e) })
        max.on({ input: () => this.update(state), keydown: (e) => keydown(e),
                 focus: (e) => select(e) })
        num.on({ input: () => this.update(state), keydown: (e) => keydown(e),
                 focus: (e) => select(e) })
        const inc_dec = (delta) => {
            const
            minimum = min.number(),
            maximum = max.number(),
            n = num.number()
            if (delta > 0 && min.number() <= num.number() && n < max.number() ||
                delta < 0 && min.number() <  num.number() && n <= max.number()) {
                num.number(num.number() + delta)
            }
        }
        inc.on({ click: () => inc_dec(+1) })
        dec.on({ click: () => inc_dec(-1) })
        if (debug) {
            state.on({
                changing: (o, t, w, v) => { // object, target, was, value
                    console.log(`changing .o:${o} .t:${t} .w:${w} .v:${v}`)
                },
                changed: (o, t, w, v) => { // object, target, was, value
                    console.log(`changed  .o:${o} .t:${t} .w:${w} .v:${v}`)
                }
            })
        }
    },
    
    update(state) {
        // update enforces range constraints
        // not an closure (aka "arrow function")
        // must be called this.update()
        // or             update(state)
        const { min, max, num, dec, inc } = state || this.state
        const
            minimum = min.number(),
            maximum = max.number(),
            v = num.number()
        if (v < minimum) {
            num.number(minimum)
        } else if (v > maximum) {
            num.number(maximum)
        }
        const n = num.number()
        assert(minimum <= maximum && minimum <= n && n <= maximum,
               'minimum:', minimum, 'n: ', n, 'maximum: ', maximum)
        dec[minimum == n ? 'disabled' : 'enabled']()
        inc[n == maximum ? 'disabled' : 'enabled']()
    },
    
}


function observe_array(arr, callback) {
    return new Proxy(arr, {
        set(target, prop, value, receiver) {
            const old = target[prop]
            const result = Reflect.set(target, prop, value, receiver)
            callback(prop, old, value)
            return result
        }
    })
}

// Example usage:
const arr = observe_array([1, 2, 3], (prop, old, value) => {
    console.log(`Property ${prop} changed from ${old} to ${value}`)
})

function test() {
    console.log(">>>arr.push(4)")
    arr.push(4) // will log the changes for '3' (new length) and index assignment
    console.log("<<<arr.push(4)")
}

test()

export const app = {
    init(content_view) { content_view.init(content_view.state) },
    inactive() {
        console.log("app.js: inactive()")
        return "done"
    }
}

window.app = app // IMPORTANT!
// allow evaluateJavaScript("app.inactive()") call

document.addEventListener('DOMContentLoaded', () => { app.init(content_view) })


/* attic:
 
 Unicode: ↺ ↻ ⟲ ⟳ ⥀ ⥁ ⤽ ⤼ ⤺ ⤻ ⎘ ⎗ 📄
          ❰❰ ❱❱  ❮❮ ❯❯  ➰ ✎ ✕ ❖ ⟲ ⟳䷖ ䷀ ⌫ ⎅
          ⎆ ⏎ ⏾ ☀ ☼ ㊐ ⽇ 𖣖 🗨
 
*/
