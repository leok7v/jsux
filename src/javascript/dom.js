"use strict" // dom.js also see observable.js

import * as detect from "./detect.js"

const assert = console.assert

const font_family_apple = [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'sans-serif'
].join(',')

const font_family_android = [
    'Roboto',
    'Droid Sans',
    'sans-serif'
].join(',');

function header(head) {
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
}

function theme() {
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)')
    let percentage = darkMode.matches ? 100 : 0
    document.documentElement.style.filter = `invert(${percentage}%)`
    darkMode.addEventListener('change', (e) => {
        let percentage = e.matches ? 100 : 0
        document.documentElement.style.filter = `invert(${percentage}%)`
    })
}

const css = [
    ['[data-theme="dark"]', 'filter: invert(100%)'],
    ['[data-theme="light"]', 'filter: invert(0)'],
    ['::-webkit-scrollbar', 'display: none'],
    ['*', 'box-sizing: border-box'],
    ['html, body',
     'overflow: hidden',
     'overscroll-behavior: contain',
     'user-select: none'],
    ['.disable', 'opacity: 0.5'],
    ['.invisible', 'visibility: hidden'],
    ['.hidden', 'display: none'],
]

function DOMContentLoaded() {
    const head = document.createElement('head')
    document.documentElement.appendChild(head)
    header(head)
    const style = document.createElement('style')
    head.appendChild(style)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = './app.css'
    document.head.appendChild(link);
    theme()
    const font_family = detect.apple ?
        font_family_apple : font_family_android // TODO: windows
    let i = style.sheet.cssRules.length
    style.sheet.insertRule(`html, body { font-family: ${font_family}; }`, i++);
    for (const [selector, ...rules] of css) {
        const body = rules.join('; ')
        const rule = selector + ' { ' + body + ' }'
        style.sheet.insertRule(rule, i++)
    }
}

document.addEventListener('DOMContentLoaded', DOMContentLoaded)

export function element(tag) {
    const element = document.createElement(tag)
    new MutationObserver((list, obs) => {
        element.dispatchEvent(new CustomEvent('mutation', { detail: list }))
    }).observe(element, { attributes: true, childList: true, subtree: true })
    let displayed = null // saved state of display: on none
    const self = {
        element: element,
        text(text) {
            if (text === undefined) return element.innerText
            element.innerText = text
            element.dispatchEvent(new Event('input'))
            return self
        },
        number(v) {
            if (v === undefined) return Number(element.innerText)
            return self.text(String(v))
        },
        style(styles) { Object.assign(element.style, styles); return self },
        on(events) {
            for (const [event, cb] of Object.entries(events)) {
                element.addEventListener(event, (...args) => { cb(...args) })
            }
            return self
        },
        append(node) { element.appendChild(node.element || node); return self },
        is_hidden()    { element.classList.contains('hidden') },
        is_invisible() { element.classList.contains('invisible') },
        is_disabled()  { element.classList.contains('disable') },
        hide() {
            assert(element.style.display !== 'none')
            displayed = element.style.display
            element.style.display = 'none'
            return self
        },
        show() {
            if (element.style.display !== 'none') return self
            assert(displayed != null)
            element.style.display = displayed
            displayed = null
            return self
        },
        invisible() { element.classList.add('invisible');    return self },
        visible()   { element.classList.remove('invisible'); return self },
        enabled()   { element.classList.remove('disable');   return self },
        disabled()  { element.classList.add('disable');      return self },
        display: {
            inline: () => { element.style.display = 'inline'; return self },
            block:  () => { element.style.display = 'block';  return self },
            none:   () => { element.style.display = 'none';   return self }
        },
        contenteditable: {
            plain: () =>  { element.contentEditable = 'plaintext-only'; return self },
            rich:  () =>  { element.contentEditable = 'true';  return self },
            not:   () =>  { element.contentEditable = 'false'; return self }
        },
        tabindex(n) { element.tabIndex = String(n); return self },
        monospace() { element.style.fontFamily = 'monospace, monospace'; return self }
    }
    return self
}

export function div()    { return element('div') }
export function span()   { return element('span') }
export function button() { return element('button') }
export function ul()     { return element('ul') }
export function li()     { return element('li') }
