import React from 'react'
import App from './App'
import request from 'superagent-bluebird-promise'

var scripts = document.getElementsByTagName("script");
var src = scripts[scripts.length - 1].getAttribute("src");
window.__webpack_public_path__ = src.substr(0, src.lastIndexOf("/") + 1);

const items = Object.keys(Mapping);

var root = document.getElementById('root')
var sessionId = localStorage.getItem("id")
if (!sessionId) {
    sessionId = Math.floor(Math.random() * 1000000)
    localStorage.setItem("id", sessionId)
}
function load (id) {
    if (id) { history.replaceState(null, null, '?'+encodeURIComponent(id)) }
    React.render( <App id={id} chars={ Mapping[id] } onPick={(pick)=>onPick(id, pick)} />, root );
}
function onPick (id, pick) {
    load(items[ Math.floor(Math.random() * items.length) ])
    const payload = `"F${ id }","${ pick }","${ sessionId }"`
    request.post("https://ethercalc.org/_/koktai-dodo")
        .type("text/csv").accept("application/json")
        .send(payload)
        .then(()=>console.log(payload))
} 
if (/^\?([a-f0-9]{4})$/.test(location.search) && Mapping[location.search.slice(1)]) {
    load(location.search.slice(1))
}
else {
    load(items[ Math.floor(Math.random() * items.length) ]);
}
