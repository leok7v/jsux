"use strict"

export function assert(condition, ...args) {
    if (!condition) {
        var error = String(condition) + '\x20' + args.join('\x20')
        throw new Error('assertion failed.\x20' + error)
    }
}

export function create(tag) {
    const that = document.createElement(tag)
    let displayed = null
    const self = {
        text(text) {
            if (text === undefined) return that.innerText
            that.innerText = text
            that.dispatchEvent(new Event('input'))
            return self
        },
        number(v) {
            // CONFUSION: HOW DO I CALL text() from here
            if (v === undefined) return Number(that.innerText)
            return self.text(String(v))
        },
        style(styles) { Object.assign(that.style, styles); return self },
        on(events) {
            for (const [event, cb] of Object.entries(events)) {
                that.addEventListener(event, (...args) => { cb(...args) })
            }
            return self
        },
        append(node) {
            that.appendChild(typeof node.self === 'function' ?
                            node.self() : node)
            return self
        },
        is_hidden()    { that.classList.contains('hidden') },
        is_invisible() { that.classList.contains('invisible') },
        is_disabled()  { that.classList.contains('disable') },
        hide() {
            assert(that.style.display !== 'none')
            displayed = that.style.display
            that.style.display = 'none'
            return self
        },
        show() {
            if (that.style.display !== 'none') return self
            assert(displayed != null)
            that.style.display = displayed
            displayed = null
            return self
        },
        invisible() { that.classList.add('invisible');    return self },
        visible()   { that.classList.remove('invisible'); return self },
        enabled()   { that.classList.remove('disable');   return self },
        disabled()  { that.classList.add('disable');      return self },
        self() { return that },
        display: {
            inline: () => { that.style.display = 'inline'; return self },
            block:  () => { that.style.display = 'block';  return self },
            none:   () => { that.style.display = 'none';   return self }
        },
        contenteditable: {
            plain: () =>  { that.contentEditable = 'plaintext-only'; return self },
            rich:  () =>  { that.contentEditable = 'true';  return self },
            not:   () =>  { that.contentEditable = 'false'; return self }
        },
        tabindex(n) { that.tabIndex = String(n); return self },
        monospace() { that.style.fontFamily = 'monospace, monospace'; return self }
    }
    return self
}

export function div()    { return create('div') }
export function span()   { return create('span') }
export function button() { return create('button') }

export function proxy(state) {
    const changed  = new Set()
    const changing = new Set()
    let p = new Proxy(state, {
        get(target, prop) {
            return target[prop]
        },
        set(target, prop, value) {
            const before = target[prop]
            if (before !== value) {
                for (const cb of changing) cb(target, prop, before, value)
            }
            target[prop] = value
            if (before !== value) {
                for (const cb of changed) cb(target, prop, value)
            }
            return true
        }
    })
    let bound = false
    const bind = () => {
        if (bound) return
        for (const key of Object.keys(state)) {
            state[key].on({
                input: (e) => {
                    const value = p[key].text()
                    for (const cb of changed) { cb(p, key, value) }
                }
            })
        }
        bound = true
    }
    Object.defineProperty(p, 'on', {
        value: {
            changed:     (cb) => { bind(); changed.add(cb) },
            changing:    (cb) => { bind(); changing.add(cb) },
            unsubscribe: (cb) => { changed.delete(cb); changing.delete(cb) }
        },
        enumerable: false
    })
    return p
}

