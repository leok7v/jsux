"use strict"

import * as detect     from "./detect.js"
import * as observable from "./observable.js"

export function assert(condition, ...args) {
    if (!condition) {
        var error = 'assertion failed.\x20' +
                    String(condition) + '\x20' + args.join('\x20')
        console.trace(error)
        throw new Error(error)
    }
}

const http = (url, method, req = "", done = null) => {
    let error = null
    let text = `Failed to load ${url}`
    try {
        const request = new XMLHttpRequest()
        request.open(method, url, false) // false = synchronous
        request.setRequestHeader("Content-Type", "text/plain")
        if (method === "POST") {
            request.send(req)
        } else {
            request.send()
        }
        if (request.status === 200) {
            text = request.responseText
            if (done) done(text)
        } else {
            error = new Error(`${url} ${method} failed: ${request.status}`)
        }
    } catch (e) {
        error = new Error(`${url} ${method} failed: ${e}`)
    }
    if (error) throw error
    return text
}

export const load = (url) => http(url, "GET")

export const post = (url, req = "", done = null) => http(url, "POST", req, done)

export const console_log = observable.observe([ "start" ])

export const log = (...args) => {
    const message = args.join('')
    console_log.push(message)
    if (console_log.length > 128) console_log.shift()
    return post("./call:log", message, null)
}

export const quit = (...args) => {
    return post("./call:quit", args.join(''), null)
}

function console_intercept() {
    const saved = {}
    Object.getOwnPropertyNames(console).forEach(key => {
        if (typeof console[key] === "function") {
            saved[key] = console[key].bind(console)
            console[key] = (...args) => {
                const short = key.replace(/^console\.?/, "")
                log(short + ": ", ...args)
                saved[key](...args)
            }
        }
    })
}

// console_intercept()

export const init_theme = () => {
    let theme = localStorage.getItem("settings.theme")
    if (!theme) {
        theme = "dark"  // default theme
        localStorage.setItem("settings.theme", theme)
    }
    document.documentElement.setAttribute("data-theme", theme)
}

export const toggle_theme = () => {
    const html = document.documentElement
    let current = html.getAttribute("data-theme")
    let theme = current === "dark" ? "light" : "dark"
    html.setAttribute("data-theme", theme)
    localStorage.setItem("settings.theme", theme)
}

export const init_font_size = () => {
    let fs = 100
    if (detect.iPhone) fs = 130
    if (detect.iPad)   fs = 160
    let font_size = localStorage.getItem("settings.font-size") || fs;
    document.body.style.fontSize = font_size + "%";
    localStorage.setItem("settings.font-size", font_size);
}

export const decrease_font_size = () => {
    let font_size = parseInt(localStorage.getItem("settings.font-size")) || 100;
    font_size = Math.max(90, font_size - 10);
    document.body.style.fontSize = font_size + "%";
    localStorage.setItem("settings.font-size", font_size);
}

export const increase_font_size = () => {
    let font_size = parseInt(localStorage.getItem("settings.font-size")) || 100;
    const max_font = detect.iPad ? 200 : 160
    font_size = Math.min(max_font, font_size + 10);
    document.body.style.fontSize = font_size + "%";
    localStorage.setItem("settings.font-size", font_size);
}

