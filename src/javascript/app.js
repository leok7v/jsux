"use strict"

import { proxy, div, span, button, assert } from "./ui.js"

import * as observable from "./observable.js"
import * as util       from "./util.js"

const debug = false

const traceln = (message) => console.log(message)

const by_id = (id) => document.getElementById(id)

const content_view = {

    state: proxy({ // ui state
        inc: null,
        dec: null,
        min: null,
        max: null,
        num: null
    }),
    
    foo: 'bar', // view variables
    
    init() { // not an closure (aka "arrow function") "this" point to object
        const state  = this.state
        const keydown = (e) => {
            traceln('keydown ' + e.key)
            if (e.key === 'Enter' && e.target.isContentEditable) {
                e.preventDefault()
                e.target.blur()
            }
        }
        const select = (e) => {
            const range = document.createRange()
            range.selectNodeContents(e.target)
            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(range)
        }
        const content = div()
        content.self().className = 'content'
        const inline = (txt, tab) => {
            return div().text(txt).display.inline().tabindex(tab).monospace()
            .contenteditable.plain()
        }
        state.min = inline('0', 0)
        state.max = inline('9', 0)
        state.num = inline('3', 0)
        state.dec = button().text('➖').monospace()
        state.inc = button().text('➕').monospace()
        const { min, max, num, dec, inc } = state
        const block = (txt) => {
            return div().display.block().append(span().text(txt).monospace())
        }
        const minimum = block('min:\x20').append(min)
        const maximum = block('max:\x20').append(max)
        const number = div().display.block().append(dec).append(num).append(inc)
        content.append(minimum).append(maximum).append(number)
        document.getElementById('app').appendChild(content.self())
        for (const key of Object.keys(state)) { state[key].self().id = key }
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
            state.on.changed((target, prop, value) => {
                traceln('Changed: ' + prop + ' to ' + value)
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

const font_family = [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'sans-serif'
].join(',')

const css = [
    ['[data-theme="dark"]', 'filter: invert(100%)'],
    ['[data-theme="light"]', 'filter: invert(0)'],
    ['::-webkit-scrollbar', 'display: none'],
    [':root', '--font-size: 150%'],
    ['*', 'box-sizing: border-box'],
    ['html, body',
     'overflow: hidden',
     'overscroll-behavior: contain',
     'font-size: var(--font-size)',
     'font-family: ' + font_family,
     'user-select: none'],
    ['button',
     'padding: 0',
     'margin: 0',
     'font-size: 0.75em',
     'min-width: 1.25em',
     'max-width: 1.25em',
     'min-height: 1.25em',
     'max-height: 1.25em',
     'align-items: center',
     'justify-content: center'],
    ['.disable', 'opacity: 0.5'],
    ['.invisible', 'visibility: hidden'],
    ['.hidden', 'display: none'],
    ['[contenteditable="plaintext-only"]',
     'border: 1px solid #888',
     'min-width: 0.75em',
     'max-width: 0.75em',
     'display: inline-flex',
     'flex: 1'],
    ['.content > *',
     'display: inline-flex',
     'align-items: center',
     'gap: 0.5em',
     'margin: 0.5em 0'],
    ['.content > *:last-child', 'margin-bottom: 0']
]

function theme() {
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)')
    let percentage = darkMode.matches ? 100 : 0
    document.documentElement.style.filter = `invert(${percentage}%)`
    darkMode.addEventListener('change', (e) => {
        let percentage = e.matches ? 100 : 0
        document.documentElement.style.filter = `invert(${percentage}%)`
    })
}

export function inactive() {
    console.log(">>>app.js inactive() global")
    // called before quit and also on app being inactive on iOS
    console.log("<<<app.js inactive()")
    return "done"
}

export const app = {
    init() {
        content_view.init(content_view.state)
        util.log("app.init")
    },
    inactive() {
        console.log(">>>app.js app.inactive()")
        // called before quit and also on app being inactive on iOS
        console.log("<<<app.js app.inactive()")
        return "done"
    }
}

function test_observable() {
    observable.test(true) // vebose
    
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
}

document.addEventListener('DOMContentLoaded', () => {
    const head = document.createElement('head')
    const meta1 = document.createElement('meta')
    meta1.setAttribute('charset', 'UTF-8')
    head.appendChild(meta1)
    const title = document.createElement('title')
    title.textContent = 'App'
    head.appendChild(title)
    const meta2 = document.createElement('meta')
    meta2.setAttribute('name', 'viewport')
    const device_width = [
        'width=device-width',
        'initial-scale=1.0',
        'maximum-scale=1.0',
        'user-scalable=no'
    ].join(',')
    meta2.setAttribute('content', device_width)
    head.appendChild(meta2)
    const style = document.createElement('style')
    head.appendChild(style)
    document.documentElement.appendChild(head)
    let i = 0
    for (const [selector, ...rules] of css) {
        const body = rules.join('; ')
        const rule = selector + ' { ' + body + ' }'
        style.sheet.insertRule(rule, i++)
    }
    theme()
    
    test_observable()

    app.init(content_view)
})

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOMContentLoaded: DOM is parsed (HTML only).");
});

window.addEventListener("load", function() {
    console.log("load: Entire page is fully loaded.");
});

window.addEventListener("beforeunload", function(event) {
    console.log("beforeunload: Page about to unload.");
});

window.addEventListener("pagehide", function(event) {
    console.log("pagehide: Page is hidden/unloaded.");
});

document.addEventListener("visibilitychange", function() {
    console.log("visibilitychange:", document.visibilityState);
    if (document.visibilityState === "hidden") {
        console.log("visibilitychange: hidden (backgrounded)");
    }
});
