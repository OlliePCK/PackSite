import './nav.js';

const DEFAULT_VERT_SHADER = `
precision mediump float;
varying vec2 vUv;
attribute vec2 a_position;

void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const DEFAULT_FRAG_SHADER = `
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
`;

const canvasEl = document.querySelector("canvas#neuro");
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
let devicePixelRatio = 1;
let pointer;
let uniforms;
let gl;

if (!canvasEl) {
    console.debug("main.js: neuro canvas not found, skipping background");
} else {
    devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    pointer = {
        x: 0,
        y: 0,
        tX: window.innerWidth * 0.5,
        tY: window.innerHeight * 0.5,
    };

    gl = initShader();
    if (!gl || !uniforms) {
        console.debug("main.js: shader init failed, skipping background");
    } else {
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        if (prefersReducedMotion) {
            canvasEl.style.opacity = "0.35";
            renderFrame(0);
        } else {
            setupEvents();
            render();
        }
    }
}

function initShader() {
    const vsEl = document.getElementById("vertShader");
    const fsEl = document.getElementById("fragShader");

    const vsSource = (vsEl?.textContent || DEFAULT_VERT_SHADER).trim();
    const fsSource = (fsEl?.textContent || DEFAULT_FRAG_SHADER).trim();

    const gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");

    if (!gl) {
        console.warn("WebGL is not supported by your browser.");
        return null;
    }

    function createShader(gl, sourceCode, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, sourceCode);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

    const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!shaderProgram) return null;
    uniforms = getUniforms(shaderProgram);

    function createShaderProgram(gl, vertexShader, fragmentShader) {
        if (!vertexShader || !fragmentShader) return null;
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    function getUniforms(program) {
        let uniforms = [];
        let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            let uniformName = gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
        return uniforms;
    }

    const vertices = new Float32Array([-1., -1., 1., -1., -1., 1., 1., 1.]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(shaderProgram);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return gl;
}

function renderFrame(currentTime) {
    if (!gl || !uniforms) return;

    pointer.x += (pointer.tX - pointer.x) * 0.5;
    pointer.y += (pointer.tY - pointer.y) * 0.5;

    gl.uniform1f(uniforms.u_time, currentTime);
    gl.uniform2f(uniforms.u_pointer_position, pointer.x / window.innerWidth, 1 - pointer.y / window.innerHeight);
    gl.uniform1f(uniforms.u_scroll_progress, window.pageYOffset / (2 * window.innerHeight));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function render() {
    renderFrame(performance.now());
    requestAnimationFrame(render);
}

function resizeCanvas() {
    canvasEl.width = window.innerWidth * devicePixelRatio;
    canvasEl.height = window.innerHeight * devicePixelRatio;
    gl.uniform1f(uniforms.u_ratio, canvasEl.width / canvasEl.height);
    gl.viewport(0, 0, canvasEl.width, canvasEl.height);
}

function setupEvents() {
    window.addEventListener("pointermove", (e) => {
        updateMousePosition(e.clientX, e.clientY);
    });
    window.addEventListener("touchmove", (e) => {
        updateMousePosition(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
    });
    window.addEventListener("click", (e) => {
        updateMousePosition(e.clientX, e.clientY);
    });

    function updateMousePosition(eX, eY) {
        pointer.tX = eX;
        pointer.tY = eY;
    }
}
