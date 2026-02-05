(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))c(e);new MutationObserver(e=>{for(const n of e)if(n.type==="childList")for(const d of n.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&c(d)}).observe(document,{childList:!0,subtree:!0});function r(e){const n={};return e.integrity&&(n.integrity=e.integrity),e.referrerPolicy&&(n.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?n.credentials="include":e.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function c(e){if(e.ep)return;e.ep=!0;const n=r(e);fetch(e.href,n)}})();(function(){"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").then(r=>{console.log("SW registered:",r.scope)}).catch(r=>{console.log("SW registration failed:",r)})});function a(){const c=document.getElementById("hamburger"),e=document.getElementById("nav-links"),n=i(),d=document.getElementById("mobile-divider"),E=document.getElementById("mobile-user-info"),b=document.getElementById("mobile-user-avatar"),_=document.getElementById("mobile-user-name"),y=document.getElementById("mobile-settings"),h=document.getElementById("mobile-logout"),f=document.getElementById("mobile-login");if(!c){console.log("Hamburger not found");return}console.log("Nav.js: Hamburger menu initialized");const v=()=>{c.classList.remove("active"),e&&e.classList.remove("active"),n==null||n.classList.remove("active"),document.documentElement.classList.remove("nav-open"),document.body.classList.remove("nav-open")},o=()=>{c.classList.toggle("active"),e&&e.classList.toggle("active"),c.classList.contains("active")&&(e==null?void 0:e.classList.contains("active"))?(n==null||n.classList.add("active"),document.documentElement.classList.add("nav-open"),document.body.classList.add("nav-open")):v()},p=()=>{var t,w;return((w=(t=window.matchMedia)==null?void 0:t.call(window,"(max-width: 1200px)"))==null?void 0:w.matches)??window.innerWidth<=1200};window.updateMobileNav=function(t,w){t&&w?(d&&d.classList.add("visible"),E&&(E.classList.add("visible"),b&&(b.src=w.avatar),_&&(_.textContent=w.username)),y&&y.classList.add("visible"),h&&h.classList.add("visible"),f&&f.classList.remove("visible")):(d&&d.classList.add("visible"),E&&E.classList.remove("visible"),y&&y.classList.remove("visible"),h&&h.classList.remove("visible"),f&&f.classList.add("visible"))},window.updateMobileNav(!1,null),fetch("/api/auth/me",{credentials:"include"}).then(t=>t.json()).then(t=>{t!=null&&t.authenticated?window.updateMobileNav(!0,t):window.updateMobileNav(!1,null)}).catch(()=>{}),f&&f.addEventListener("click",t=>{t.preventDefault(),window.packBotAPI&&window.packBotAPI.login()}),h&&h.addEventListener("click",t=>{t.preventDefault(),window.packBotAPI&&window.packBotAPI.logout()}),c.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),o()}),n&&n.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),v()}),e&&e.querySelectorAll(".nav-link, .mobile-nav-item, .mobile-login-btn").forEach(t=>{t.addEventListener("click",()=>{v()})}),document.addEventListener("click",t=>{const w=c.contains(t.target),A=e&&e.contains(t.target);!w&&!A&&v()}),document.addEventListener("keydown",t=>{t.key==="Escape"&&v()}),window.addEventListener("resize",()=>{p()||v()});const g=document.querySelector("img.text");if(g){let t=function(){const A=window.innerWidth<=768?"/img/text-centred.svg":"/img/text.svg";g.setAttribute("src",A)};var s=t;t(),window.addEventListener("resize",t),window.addEventListener("load",t),setTimeout(t,100)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",a):a();function i(){let r=document.getElementById("nav-scrim");return r||(r=document.createElement("div"),r.id="nav-scrim",r.className="nav-scrim",document.body.appendChild(r),r)}})();const M=`
precision mediump float;
varying vec2 vUv;
attribute vec2 a_position;

void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`,N=`
precision mediump float;

varying vec2 vUv;
uniform float u_time;
uniform float u_ratio;
uniform vec2 u_pointer_position;
uniform float u_scroll_progress;

vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float neuro_shape(vec2 uv, float t, float p) {
    vec2 sine_acc = vec2(0.);
    vec2 res = vec2(0.);
    float scale = 8.;

    for (int j = 0; j < 15; j++) {
        uv = rotate(uv, 1.);
        sine_acc = rotate(sine_acc, 1.);
        vec2 layer = uv * scale + float(j) + sine_acc - t;
        sine_acc += sin(layer);
        res += (.5 + .5 * cos(layer)) / scale;
        scale *= (1.2 - .07 * p);
    }
    return res.x + res.y;
}

void main() {
    vec2 uv = .5 * vUv;
    uv.x *= u_ratio;

    vec2 pointer = vUv - u_pointer_position;
    pointer.x *= u_ratio;
    float p = clamp(length(pointer), 0., 1.);
    p = .5 * pow(1. - p, 2.);

    float t = .001 * u_time;

    float noise = neuro_shape(uv, t, p);

    noise = 1.2 * pow(noise, 3.);
    noise += pow(noise, 10.);
    noise = max(.0, noise - .42);
    noise *= (1. - length(vUv - .5));
    noise = clamp(noise * 1.35, 0., 1.);

    // Teal/orange bias to match site theme (reduce purple/pink dominance).
    vec3 cool = vec3(0.0, 0.627, 0.855);   // #00a0da
    vec3 warm = vec3(1.0, 0.46, 0.10);     // neon orange (less pink)

    float n = noise;
    float warmMask = smoothstep(0.14, 0.78, n);
    float sweep = 0.5 + 0.5 * sin((vUv.x * 5.2) + (vUv.y * 2.1) + (t * 2.2));
    float warmMix = warmMask * (0.18 + 0.62 * sweep);
    warmMix *= (0.22 + 0.78 * p);
    vec3 color = mix(cool, warm, warmMix);

    color = color * n;
    color += cool * pow(n, 2.4) * 0.07;
    color += warm * pow(n, 2.1) * 0.08;

    gl_FragColor = vec4(color, noise);
}
`,u=document.querySelector("canvas#neuro");var P,x;const U=((x=(P=window.matchMedia)==null?void 0:P.call(window,"(prefers-reduced-motion: reduce)"))==null?void 0:x.matches)??!1;let S=1,l,L,m;u?(S=Math.min(window.devicePixelRatio||1,2),l={x:0,y:0,tX:window.innerWidth*.5,tY:window.innerHeight*.5},m=T(),!m||!L?console.debug("main.js: shader init failed, skipping background"):(I(),window.addEventListener("resize",I),U?(u.style.opacity="0.35",B(0)):(k(),R()))):console.debug("main.js: neuro canvas not found, skipping background");function T(){const a=document.getElementById("vertShader"),i=document.getElementById("fragShader"),r=((a==null?void 0:a.textContent)||M).trim(),c=((i==null?void 0:i.textContent)||N).trim(),e=u.getContext("webgl")||u.getContext("experimental-webgl");if(!e)return console.warn("WebGL is not supported by your browser."),null;function n(o,p,g){const s=o.createShader(g);return o.shaderSource(s,p),o.compileShader(s),o.getShaderParameter(s,o.COMPILE_STATUS)?s:(console.error("An error occurred compiling the shaders: "+o.getShaderInfoLog(s)),o.deleteShader(s),null)}const d=n(e,r,e.VERTEX_SHADER),E=n(e,c,e.FRAGMENT_SHADER),b=_(e,d,E);if(!b)return null;L=y(b);function _(o,p,g){if(!p||!g)return null;const s=o.createProgram();return o.attachShader(s,p),o.attachShader(s,g),o.linkProgram(s),o.getProgramParameter(s,o.LINK_STATUS)?s:(console.error("Unable to initialize the shader program: "+o.getProgramInfoLog(s)),null)}function y(o){let p=[],g=e.getProgramParameter(o,e.ACTIVE_UNIFORMS);for(let s=0;s<g;s++){let t=e.getActiveUniform(o,s).name;p[t]=e.getUniformLocation(o,t)}return p}const h=new Float32Array([-1,-1,1,-1,-1,1,1,1]),f=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,f),e.bufferData(e.ARRAY_BUFFER,h,e.STATIC_DRAW),e.useProgram(b);const v=e.getAttribLocation(b,"a_position");return e.enableVertexAttribArray(v),e.bindBuffer(e.ARRAY_BUFFER,f),e.vertexAttribPointer(v,2,e.FLOAT,!1,0,0),e}function B(a){!m||!L||(l.x+=(l.tX-l.x)*.5,l.y+=(l.tY-l.y)*.5,m.uniform1f(L.u_time,a),m.uniform2f(L.u_pointer_position,l.x/window.innerWidth,1-l.y/window.innerHeight),m.uniform1f(L.u_scroll_progress,window.pageYOffset/(2*window.innerHeight)),m.drawArrays(m.TRIANGLE_STRIP,0,4))}function R(){B(performance.now()),requestAnimationFrame(R)}function I(){u.width=window.innerWidth*S,u.height=window.innerHeight*S,m.uniform1f(L.u_ratio,u.width/u.height),m.viewport(0,0,u.width,u.height)}function k(){window.addEventListener("pointermove",i=>{a(i.clientX,i.clientY)}),window.addEventListener("touchmove",i=>{a(i.targetTouches[0].clientX,i.targetTouches[0].clientY)}),window.addEventListener("click",i=>{a(i.clientX,i.clientY)});function a(i,r){l.tX=i,l.tY=r}}
