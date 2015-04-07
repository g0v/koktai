import React from 'react'
import App from './App'
import request from 'superagent-bluebird-promise'

var scripts = document.getElementsByTagName("script");
var src = scripts[scripts.length - 1].getAttribute("src");
window.__webpack_public_path__ = src.substr(0, src.lastIndexOf("/") + 1);

var done = 0
var items = Object.keys(Mapping)
var max = items.length
var root = document.getElementById('root')
var sessionId = localStorage.getItem("id")
if (!sessionId) {
    sessionId = Math.floor(Math.random() * 1000000)
    localStorage.setItem("id", sessionId)
}
function load (id) {
    if (id) { history.replaceState(null, null, '?'+encodeURIComponent(id)) }
    React.render( <App id={id} max={max} done={done} chars={ Mapping[id] } onPick={(pick)=>onPick(id, pick)} />, root );
}
function onPick (id, pick) {
    load(items[ Math.floor(Math.random() * items.length) ])
    const payload = `"F${ id }","${ pick }","${ sessionId }"`
    request.post("https://ethercalc.org/_/koktai-dodo.2")
        .type("text/csv").accept("application/json")
        .send(payload)
        .then(()=>console.log(payload))
} 
if (/^\?([a-f0-9]{4})$/.test(location.search) && Mapping[location.search.slice(1)]) {
    load(location.search.slice(1))
}
else {
    if (items.length == 0) {
        alert("恭喜完成！下階段明天開始。\n現在，可以自行鍵入字形，打好字複製回視窗裡貼上即可。")
        items = Object.keys(Mapping)
    }
    load(items.splice( Math.floor(Math.random() * items.length), 1 )[0]);
}

request.get("https://ethercalc.org/log/scripts/ethercalc-dodo-done.2.json").then(res => {
    var Remaining = JSON.parse(JSON.stringify(Mapping))
    for (var i = 0; i < res.body.length; i++) {
        delete Remaining[res.body[i]]
    }
    done = items.length
    items = Object.keys(Remaining)
    if (items.length > 0) {
        done -= items.length
    }
    else {
        items = Object.keys(Mapping)
    }
    load(location.search.slice(1))
})
