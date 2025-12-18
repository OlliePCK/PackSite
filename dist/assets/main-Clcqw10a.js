(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))f(e);new MutationObserver(e=>{for(const n of e)if(n.type==="childList")for(const v of n.addedNodes)v.tagName==="LINK"&&v.rel==="modulepreload"&&f(v)}).observe(document,{childList:!0,subtree:!0});function s(e){const n={};return e.integrity&&(n.integrity=e.integrity),e.referrerPolicy&&(n.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?n.credentials="include":e.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function f(e){if(e.ep)return;e.ep=!0;const n=s(e);fetch(e.href,n)}})();(function(){"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").then(t=>{console.log("SW registered:",t.scope)}).catch(t=>{console.log("SW registration failed:",t)})});function c(){const t=document.getElementById("hamburger"),s=document.getElementById("nav-links"),f=document.getElementById("mobile-divider"),e=document.getElementById("mobile-user-info"),n=document.getElementById("mobile-user-avatar"),v=document.getElementById("mobile-user-name"),w=document.getElementById("mobile-settings"),a=document.getElementById("mobile-logout"),g=document.getElementById("mobile-login");if(!t){console.log("Hamburger not found");return}console.log("Nav.js: Hamburger menu initialized"),window.updateMobileNav=function(i,m){i&&m?(f&&f.classList.add("visible"),e&&(e.classList.add("visible"),n&&(n.src=m.avatar),v&&(v.textContent=m.username)),w&&w.classList.add("visible"),a&&a.classList.add("visible"),g&&g.classList.remove("visible")):(f&&f.classList.add("visible"),e&&e.classList.remove("visible"),w&&w.classList.remove("visible"),a&&a.classList.remove("visible"),g&&g.classList.add("visible"))},g&&g.addEventListener("click",i=>{i.preventDefault(),window.packBotAPI&&window.packBotAPI.login()}),a&&a.addEventListener("click",i=>{i.preventDefault(),window.packBotAPI&&window.packBotAPI.logout()}),t.addEventListener("click",i=>{i.preventDefault(),i.stopPropagation(),t.classList.toggle("active"),s&&s.classList.toggle("active")}),s&&s.querySelectorAll(".nav-link, .mobile-nav-item, .mobile-login-btn").forEach(i=>{i.addEventListener("click",()=>{t.classList.remove("active"),s.classList.remove("active")})}),document.addEventListener("click",i=>{const m=t.contains(i.target),o=s&&s.contains(i.target);!m&&!o&&(t.classList.remove("active"),s&&s.classList.remove("active"))});const L=document.querySelector("img.text");if(L){let i=function(){const o=window.innerWidth<=768?"/img/text-centred.svg":"/img/text.svg";L.setAttribute("src",o)};var E=i;i(),window.addEventListener("resize",i),window.addEventListener("load",i),setTimeout(i,100)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c()})();const R=`
precision mediump float;
varying vec2 vUv;
attribute vec2 a_position;

void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`,B=`
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
    noise = max(.0, noise - .38);
    noise *= (1. - length(vUv - .5) * 0.8);
    noise = clamp(noise * 1.6, 0., 1.);

    // Cyan Glow #00A0DA = vec3(0.0, 0.627, 0.855)
    // Ice Blue #9FE8FF = vec3(0.624, 0.91, 1.0)
    // Hot Red #FE3C2F = vec3(0.996, 0.235, 0.184)
    vec3 cyan = vec3(0.0, 0.627, 0.855);
    vec3 ice = vec3(0.624, 0.91, 1.0);
    vec3 hot = vec3(0.996, 0.235, 0.184);

    float n = noise;
    // Mix from cyan base to hot red at peaks
    float hotMix = smoothstep(0.15, 0.55, n) * 0.45;
    hotMix *= (0.4 + 0.6 * p);
    vec3 color = mix(cyan, hot, hotMix);
    // Add ice highlights at bright spots
    color = mix(color, ice, smoothstep(0.5, 0.9, n) * 0.3);

    color = color * n * 1.4;
    color += hot * pow(n, 2.5) * 0.12;
    color += cyan * pow(n, 1.5) * 0.08;

    gl_FragColor = vec4(color, noise);
}
`,d=document.querySelector("canvas#neuro");var S,x;const F=((x=(S=window.matchMedia)==null?void 0:S.call(window,"(prefers-reduced-motion: reduce)"))==null?void 0:x.matches)??!1;let y=1,l,h,u;d?(y=Math.min(window.devicePixelRatio||1,2),l={x:0,y:0,tX:window.innerWidth*.5,tY:window.innerHeight*.5},u=U(),!u||!h?console.debug("main.js: shader init failed, skipping background"):(A(),window.addEventListener("resize",A),F?(d.style.opacity="0.35",I(0)):(T(),P()))):console.debug("main.js: neuro canvas not found, skipping background");function U(){const c=document.getElementById("vertShader"),t=document.getElementById("fragShader"),s=((c==null?void 0:c.textContent)||R).trim(),f=((t==null?void 0:t.textContent)||B).trim(),e=d.getContext("webgl")||d.getContext("experimental-webgl");if(!e)return console.warn("WebGL is not supported by your browser."),null;function n(o,p,b){const r=o.createShader(b);return o.shaderSource(r,p),o.compileShader(r),o.getShaderParameter(r,o.COMPILE_STATUS)?r:(console.error("An error occurred compiling the shaders: "+o.getShaderInfoLog(r)),o.deleteShader(r),null)}const v=n(e,s,e.VERTEX_SHADER),w=n(e,f,e.FRAGMENT_SHADER),a=g(e,v,w);if(!a)return null;h=L(a);function g(o,p,b){if(!p||!b)return null;const r=o.createProgram();return o.attachShader(r,p),o.attachShader(r,b),o.linkProgram(r),o.getProgramParameter(r,o.LINK_STATUS)?r:(console.error("Unable to initialize the shader program: "+o.getProgramInfoLog(r)),null)}function L(o){let p=[],b=e.getProgramParameter(o,e.ACTIVE_UNIFORMS);for(let r=0;r<b;r++){let _=e.getActiveUniform(o,r).name;p[_]=e.getUniformLocation(o,_)}return p}const E=new Float32Array([-1,-1,1,-1,-1,1,1,1]),i=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,E,e.STATIC_DRAW),e.useProgram(a);const m=e.getAttribLocation(a,"a_position");return e.enableVertexAttribArray(m),e.bindBuffer(e.ARRAY_BUFFER,i),e.vertexAttribPointer(m,2,e.FLOAT,!1,0,0),e}function I(c){!u||!h||(l.x+=(l.tX-l.x)*.5,l.y+=(l.tY-l.y)*.5,u.uniform1f(h.u_time,c),u.uniform2f(h.u_pointer_position,l.x/window.innerWidth,1-l.y/window.innerHeight),u.uniform1f(h.u_scroll_progress,window.pageYOffset/(2*window.innerHeight)),u.drawArrays(u.TRIANGLE_STRIP,0,4))}function P(){I(performance.now()),requestAnimationFrame(P)}function A(){d.width=window.innerWidth*y,d.height=window.innerHeight*y,u.uniform1f(h.u_ratio,d.width/d.height),u.viewport(0,0,d.width,d.height)}function T(){window.addEventListener("pointermove",t=>{c(t.clientX,t.clientY)}),window.addEventListener("touchmove",t=>{c(t.targetTouches[0].clientX,t.targetTouches[0].clientY)}),window.addEventListener("click",t=>{c(t.clientX,t.clientY)});function c(t,s){l.tX=t,l.tY=s}}
