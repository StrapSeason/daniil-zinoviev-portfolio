/**
 * particle-video.js — video-driven particle renderer (WebGL2, zero dependencies)
 *
 * Renders a video as a field of particles: brightness drives size/depth,
 * swipe/scroll steps reveal the composition band by band, each section has
 * backdrop particle shapes that blast apart on transition.
 *
 * Usage:
 *   import { createParticleVideo } from './particle-video.js';
 *   const pv = createParticleVideo(document.querySelector('#hero'), { src: '/video.mp4' });
 *   pv.destroy(); // when unmounting
 */

const NOISE = `
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
vec3 sNoise3(vec3 p){
  return vec3(snoise(p), snoise(p + vec3(123.4, 71.9, 452.3)), snoise(p + vec3(-91.2, 313.1, -8.7)));
}
vec3 curlNoise(vec3 p){
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  vec3 px0 = sNoise3(p - dx), px1 = sNoise3(p + dx);
  vec3 py0 = sNoise3(p - dy), py1 = sNoise3(p + dy);
  vec3 pz0 = sNoise3(p - dz), pz1 = sNoise3(p + dz);
  float x = py1.z - py0.z - pz1.y + pz0.y;
  float y = pz1.x - pz0.x - px1.z + px0.z;
  float z = px1.y - px0.y - py1.x + py0.x;
  return normalize(vec3(x, y, z) * (1.0 / (2.0 * e)));
}
mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }`;

const VIDEO_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 aUV;
layout(location=1) in vec4 aSeed;
uniform sampler2D uVideo;
uniform float uTime;
uniform vec2 uRot;
uniform mat4 uProj;
uniform float uHeight;
uniform float uFit;
uniform float uStage;
uniform float uReduced;
out vec3 vColor;
out float vAlpha;
${NOISE}
void main(){
  vec2 split = (vec2(aSeed.x, aSeed.y) - 0.5) * 0.006;
  vec3 col;
  col.r  = texture(uVideo, aUV + split).r;
  col.gb = texture(uVideo, aUV - split * 0.6).gb;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float v = pow(max(max(col.r, col.g), col.b), 1.45);

  const float W = 4.6;
  const float H = 4.6 * 0.5621;
  vec3 pos = vec3((aUV.x - 0.5) * W, (0.5 - aUV.y) * H, lum * 0.85 - 0.25);

  float loose = 1.0 - smoothstep(0.04, 0.3, v);
  pos += curlNoise(pos * 1.1 + uTime * 0.16) * (0.035 + loose * 0.24) * (1.0 - uReduced);

  float band = step(0.32, aUV.y) + step(0.48, aUV.y) + step(0.63, aUV.y);
  float shown = clamp((uStage - band - aSeed.w * 0.3) / 0.65, 0.0, 1.0);
  shown = smoothstep(0.0, 1.0, shown);
  float g = 1.0 - shown;
  pos += curlNoise(pos * 0.5 + aSeed.y * 7.0) * g * (1.6 + aSeed.z * 2.2);
  pos.y += g * g * (0.8 + aSeed.x * 1.2);

  pos = rotX(uRot.y) * rotY(uRot.x) * (pos * uFit);
  vec4 mv = vec4(pos, 1.0);
  mv.z -= 5.4;
  gl_Position = uProj * mv;

  float size = mix(0.3, 2.6, v) * (0.4 + aSeed.z * aSeed.z * 1.5) * uFit;
  gl_PointSize = max(size * uHeight * 0.0021 * (5.4 / -mv.z), 0.6);

  float a = mix(0.06, 1.0, smoothstep(0.02, 0.65, v));
  a *= 0.72 + 0.28 * sin(uTime * (2.0 + aSeed.w * 14.0) + aSeed.x * 40.0);
  vColor = mix(vec3(lum), col, 0.9) * mix(0.85, 1.9, v);
  vAlpha = a * (0.5 + 0.5 * aSeed.z) * (1.0 - g);
}`;

const VIDEO_FRAG = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
out vec4 outColor;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = dot(uv, uv);
  if (d > 1.0) discard;
  float a = smoothstep(1.0, 0.25, d) * vAlpha;
  outColor = vec4(vColor * a, a);
}`;

const SHAPE_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aSeed;
layout(location=2) in vec4 aMeta;
uniform float uTime;
uniform vec2 uRot;
uniform mat4 uProj;
uniform float uHeight;
uniform float uFit;
uniform float uStageF;
uniform float uReduced;
out float vFade;
${NOISE}
void main(){
  float id = aMeta.w;
  float ownStage = floor(id / 10.0);
  float h = fract(sin(id * 12.9898) * 43758.5453);
  float k = 1.0 - uReduced;
  vec3 c = aMeta.xyz;
  vec3 l = aPos - c;
  l = rotY(uTime * mix(0.08, 0.25, h) * (h > 0.5 ? 1.0 : -1.0) * k) * l;
  c.y += sin(uTime * (0.25 + h * 0.3) + id * 2.7) * 0.04 * k;
  vec3 pos = c + l;

  float b = smoothstep(0.0, 1.0, clamp((uStageF - (ownStage - 1.0) - aSeed.w * 0.3) / 0.65, 0.0, 1.0));
  float gb = 1.0 - b;
  pos += curlNoise(pos * 0.5 + aSeed.y * 7.0) * gb * (1.6 + aSeed.z * 2.2);
  pos.y += gb * gb * (0.8 + aSeed.x * 1.2);

  float d = smoothstep(0.0, 1.0, clamp((uStageF - ownStage - aSeed.w * 0.25) / 0.75, 0.0, 1.0));
  vec3 dir = normalize(pos - c + vec3(0.001, 0.002, 0.001));
  pos += (curlNoise(pos * 0.6 + aSeed.x * 9.0) * 1.4 + dir * 1.8) * d;
  pos.y += d * d * 0.6;

  pos = rotX(uRot.y) * rotY(uRot.x) * (pos * uFit);
  vec4 mv = vec4(pos, 1.0);
  mv.z -= 5.4;
  gl_Position = uProj * mv;
  float size = (0.5 + aSeed.w * aSeed.w * 1.6) * uFit;
  gl_PointSize = max(size * uHeight * 0.0021 * (5.4 / -mv.z), 0.6);
  vFade = smoothstep(-9.4, -4.8, mv.z) * (0.35 + 0.65 * aSeed.z) * b * (1.0 - d);
}`;

const SHAPE_FRAG = `#version 300 es
precision highp float;
in float vFade;
out vec4 outColor;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = dot(uv, uv);
  if (d > 1.0) discard;
  float a = smoothstep(1.0, 0.25, d) * vFade;
  outColor = vec4(vec3(0.93, 0.92, 0.90) * a, a);
}`;

const GRAIN_URL = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ---- shape generators (unit space) ---- */
const rnd = Math.random;
const jit = a => (rnd() - 0.5) * a;
const GEN = {
  sphere() {
    const th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 2 - 1), r = 1 + jit(0.07);
    return [r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)];
  },
  ring() {
    const a = rnd() * Math.PI * 2, r = 1 + jit(0.09);
    return [Math.cos(a) * r, Math.sin(a) * r, jit(0.05)];
  },
  lens() {
    const k = rnd(), a = rnd() * Math.PI * 2;
    const r = k < 0.45 ? 1 + jit(0.07) : k < 0.8 ? 0.55 + jit(0.06) : Math.sqrt(rnd()) * 0.2;
    return [Math.cos(a) * r, Math.sin(a) * r, jit(0.06)];
  },
  cubeEdges() {
    const e = (rnd() * 12) | 0, axis = e % 3, b = (e / 3) | 0, t = rnd() * 2 - 1;
    const p = [jit(0.03), jit(0.03), jit(0.03)];
    p[axis] += t;
    p[(axis + 1) % 3] += (b & 1) ? 1 : -1;
    p[(axis + 2) % 3] += (b & 2) ? 1 : -1;
    return p;
  },
  cubeShell() {
    const f = (rnd() * 6) | 0, axis = f % 3, p = [0, 0, 0];
    p[axis] = f < 3 ? 1 : -1;
    p[(axis + 1) % 3] = rnd() * 2 - 1;
    p[(axis + 2) % 3] = rnd() * 2 - 1;
    return p;
  },
  grid() {
    const n = 8;
    return [(((rnd() * n) | 0) / (n - 1)) * 2 - 1 + jit(0.02),
            (((rnd() * n) | 0) / (n - 1)) * 2 - 1 + jit(0.02), jit(0.03)];
  },
  gyro() {
    const k = (rnd() * 3) | 0, a = rnd() * Math.PI * 2, r = 1 - k * 0.2 + jit(0.05);
    let x = Math.cos(a) * r, y = Math.sin(a) * r, z = jit(0.04);
    const [rx, ry] = [[1.15, 0.25], [0.45, 1.2], [1.9, 2.15]][k];
    let c = Math.cos(rx), s = Math.sin(rx), t;
    t = y * c - z * s; z = y * s + z * c; y = t;
    c = Math.cos(ry); s = Math.sin(ry);
    t = x * c + z * s; z = -x * s + z * c; x = t;
    return [x, y, z];
  },
  wave() {
    const t = rnd() * 2 - 1;
    return [t, Math.sin(t * Math.PI * 1.5) * 0.4 + jit(0.06), jit(0.06)];
  },
  comet() {
    if (rnd() < 0.4) {
      const th = rnd() * Math.PI * 2, ph = Math.acos(rnd() * 2 - 1), r = Math.cbrt(rnd()) * 0.2;
      return [0.85 + r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)];
    }
    const t = Math.pow(rnd(), 1.6), spread = 0.05 + t * 0.3;
    return [0.85 - t * 1.9, jit(spread * 2), jit(spread * 2)];
  },
  tri() {
    const V = [[0, 1.05], [0.95, -0.6], [-0.95, -0.6]];
    const e = (rnd() * 3) | 0, t = rnd(), a = V[e], b = V[(e + 1) % 3];
    return [a[0] + (b[0] - a[0]) * t + jit(0.03), a[1] + (b[1] - a[1]) * t + jit(0.03), jit(0.03)];
  }
};
function xform(p, o) {
  let [x, y, z] = p;
  x *= o.s; y *= o.s; z *= o.s;
  let c = Math.cos(o.rot[0]), s = Math.sin(o.rot[0]), t;
  t = y * c - z * s; z = y * s + z * c; y = t;
  c = Math.cos(o.rot[1]); s = Math.sin(o.rot[1]);
  t = x * c + z * s; z = -x * s + z * c; x = t;
  c = Math.cos(o.rot[2]); s = Math.sin(o.rot[2]);
  t = x * c - y * s; y = x * s + y * c; x = t;
  return [x + o.pos[0], y + o.pos[1], z + o.pos[2]];
}
function comp(gen, x, y, z, s, rx, ry, rz) {
  return { gen,
    pos: [x + jit(0.25), y + jit(0.2), z + jit(0.4)],
    s: s * (1 + jit(0.2)),
    rot: [rx + jit(0.5), ry + jit(0.5), rz + jit(0.5)] };
}
const DEFAULT_SHAPE_SCENES = () => [
  [ comp('gyro',  -2.7,  0.9, -1.6, 0.55, 0.3, 0.5, 0),
    comp('comet',  2.7,  0.75, -1.8, 0.5, 0, 0, -0.35),
    comp('sphere', -2.4, -0.9, -1.2, 0.16, 0, 0, 0) ],
  [ comp('cubeEdges', 2.7,  0.95, -1.5, 0.5, 0.5, 0.7, 0.1),
    comp('cubeShell', -2.65, -0.75, -1.3, 0.3, 0.3, 0.8, 0),
    comp('grid', 0.1, 0.05, -2.6, 1.6, 0.15, 0, 0) ],
  [ comp('lens', -2.7,  0.85, -1.4, 0.45, 0.4, -0.5, 0),
    comp('ring',  0.2,  0.0, -2.7, 1.7, 1.2, 0.25, 0),
    comp('sphere', 2.6, -0.8, -1.3, 0.2, 0, 0, 0) ],
  [ comp('sphere', -2.75, 0.85, -1.9, 0.5, 0, 0, 0),
    comp('tri',    2.7,  0.9, -1.4, 0.45, 0, 0, 0.15),
    comp('wave',  -2.65, -0.85, -1.5, 0.5, 0.1, 0.25, -0.15) ],
];

function createParticleVideo(container, options = {}) {
  const opts = Object.assign({
    src: 'video.mp4',        /* path to the mp4 */
    gridW: 480, gridH: 270,  /* particle grid (one per cell) */
    shapeCount: 14000,       /* backdrop shape particles */
    contentStages: 4,        /* swipes that split the calm part of the video */
    explodeT: 9.25,          /* timestamp where the source video blows apart; null = no outro stage */
    shapes: true,            /* backdrop shape satellites */
    grain: true,             /* film grain overlay */
    vignette: true,
    background: '#131312',
    interactive: true,       /* wheel / touch / click / pointer parallax */
  }, options);

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STAGES = opts.explodeT != null ? opts.contentStages + 1 : opts.contentStages;
  const MAX_RATE = 4;      /* fastest catch-up playback before we seek instead */
  const SEEK_GAP = 3.5;    /* seconds behind target at which playing is hopeless */
  const COUNT = opts.gridW * opts.gridH;

  /* ---- DOM ---- */
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.style.background = opts.background;
  const layer = (z, css = {}) => {
    const el = document.createElement('div');
    Object.assign(el.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: z }, css);
    container.appendChild(el);
    return el;
  };
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: 1 });
  container.appendChild(canvas);
  let vignetteEl = null, grainEl = null;
  if (opts.vignette) vignetteEl = layer(2, {
    background: 'radial-gradient(120% 90% at 50% 45%, transparent 40%, rgba(0,0,0,0.5) 100%),' +
                'linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 18%, transparent 82%, rgba(0,0,0,0.35))'
  });
  if (opts.grain) grainEl = layer(3, {
    inset: '-50%', backgroundImage: GRAIN_URL, opacity: '0'
  });
  const video = document.createElement('video');
  video.src = opts.src;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.style.display = 'none';
  container.appendChild(video);

  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) {
    container.textContent = 'WebGL2 is required.';
    return { step() {}, get stage() { return 0; }, destroy() {} };
  }

  /* ---- programs ---- */
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const link = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };
  const prog = link(VIDEO_VERT, VIDEO_FRAG);
  const U = n => gl.getUniformLocation(prog, n);
  const uTime = U('uTime'), uRotU = U('uRot'), uProj = U('uProj'), uHeight = U('uHeight'),
        uFit = U('uFit'), uStageU = U('uStage'), uReducedU = U('uReduced');
  gl.useProgram(prog);
  gl.uniform1i(U('uVideo'), 0);
  gl.uniform1f(uReducedU, REDUCED ? 1 : 0);

  let shapeProg = null, sU = {};
  if (opts.shapes) {
    shapeProg = link(SHAPE_VERT, SHAPE_FRAG);
    ['uTime', 'uRot', 'uProj', 'uHeight', 'uFit', 'uStageF', 'uReduced'].forEach(n => {
      sU[n] = gl.getUniformLocation(shapeProg, n);
    });
    gl.useProgram(shapeProg);
    gl.uniform1f(sU.uReduced, REDUCED ? 1 : 0);
    gl.useProgram(prog);
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);

  /* ---- video grid VAO ---- */
  const vaoVideo = gl.createVertexArray();
  gl.bindVertexArray(vaoVideo);
  {
    const uv = new Float32Array(COUNT * 2);
    const seeds = new Float32Array(COUNT * 4);
    let i = 0;
    for (let y = 0; y < opts.gridH; y++)
      for (let x = 0; x < opts.gridW; x++, i++) {
        uv[i * 2] = (x + 0.5 + (Math.random() - 0.5) * 2.4) / opts.gridW;
        uv[i * 2 + 1] = (y + 0.5 + (Math.random() - 0.5) * 2.4) / opts.gridH;
      }
    for (let k = 0; k < seeds.length; k++) seeds[k] = Math.random();
    const make = (data, loc, sz) => {
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, 0, 0);
    };
    make(uv, 0, 2);
    make(seeds, 1, 4);
  }
  gl.bindVertexArray(null);

  /* ---- backdrop shapes VAO ---- */
  let vaoShapes = null;
  if (opts.shapes) {
    const scenes = DEFAULT_SHAPE_SCENES().slice(0, opts.contentStages);
    vaoShapes = gl.createVertexArray();
    gl.bindVertexArray(vaoShapes);
    const pos = new Float32Array(opts.shapeCount * 3);
    const seeds = new Float32Array(opts.shapeCount * 4);
    const meta = new Float32Array(opts.shapeCount * 4);
    const perStage = Math.floor(opts.shapeCount / scenes.length);
    let i = 0;
    scenes.forEach((scene, si) => {
      const nStage = si === scenes.length - 1 ? opts.shapeCount - i : perStage;
      const perShape = Math.floor(nStage / scene.length);
      scene.forEach((c, ci) => {
        const n = ci === scene.length - 1 ? nStage - perShape * (scene.length - 1) : perShape;
        const id = (si + 1) * 10 + ci + 1;
        for (let e = 0; e < n && i < opts.shapeCount; e++, i++) {
          const p = xform(GEN[c.gen](), c);
          pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
          meta[i * 4] = c.pos[0]; meta[i * 4 + 1] = c.pos[1];
          meta[i * 4 + 2] = c.pos[2]; meta[i * 4 + 3] = id;
        }
      });
    });
    for (let k = 0; k < seeds.length; k++) seeds[k] = Math.random();
    const make = (data, loc, sz) => {
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, 0, 0);
    };
    make(pos, 0, 3);
    make(seeds, 1, 4);
    make(meta, 2, 4);
    gl.bindVertexArray(null);
  }

  /* ---- video texture ---- */
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([19, 19, 18, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  /* ---- projection / resize ---- */
  const perspective = (fovY, aspect, near, far) => {
    const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  };
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const aspect = canvas.width / canvas.height;
    const proj = perspective(0.62, aspect, 0.1, 100);
    const visW = 2 * Math.tan(0.31) * 5.4 * aspect;
    const fit = Math.min(1, (visW * 0.9) / 4.6);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(uProj, false, proj);
    gl.uniform1f(uHeight, canvas.height);
    gl.uniform1f(uFit, fit);
    if (shapeProg) {
      gl.useProgram(shapeProg);
      gl.uniformMatrix4fv(sU.uProj, false, proj);
      gl.uniform1f(sU.uHeight, canvas.height);
      gl.uniform1f(sU.uFit, fit);
      gl.useProgram(prog);
    }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  /* ---- state ---- */
  let stage = 0, stageSmooth = 0, lastStep = 0, videoTarget = 0;
  let rx = 0, ry = 0, trx = 0, try_ = 0;
  let raf = 0, prevT = 0, destroyed = false;

  function step(dir) {
    const now = performance.now();
    if (now - lastStep < 350) return;
    lastStep = now;
    const prev = stage;
    stage = Math.max(0, Math.min(STAGES, stage + dir));
    if (stage === prev) return;
    const dur = video.duration || 10;
    const calmEnd = opts.explodeT != null ? Math.min(opts.explodeT, dur) : dur - 0.05;
    videoTarget = stage <= opts.contentStages
      ? stage * calmEnd / opts.contentStages
      : dur - 0.05;
    if (dir > 0) video.play().catch(() => {});
    else { video.pause(); video.playbackRate = 1; video.currentTime = videoTarget; }
  }

  /* ---- input ---- */
  const onPointerMove = e => {
    const r = container.getBoundingClientRect();
    trx = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
    try_ = ((e.clientY - r.top) / r.height - 0.5) * 0.35;
  };
  const onWheel = e => {
    if (e.deltaY > 12) step(1);
    else if (e.deltaY < -12) step(-1);
  };
  let touchY = null;
  const onTouchStart = e => { touchY = e.touches[0].clientY; };
  const onTouchMove = e => {
    if (touchY === null) return;
    const d = e.touches[0].clientY - touchY;
    if (d > 50) { step(1); touchY = e.touches[0].clientY; }
    else if (d < -50) { step(-1); touchY = e.touches[0].clientY; }
  };
  const onClick = () => step(1);
  if (opts.interactive) {
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('wheel', onWheel, { passive: true });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('click', onClick);
  }

  /* ---- frame loop ---- */
  function frame(t) {
    if (destroyed) return;
    const time = t * 0.001;
    const dt = Math.min((t - prevT) * 0.001, 0.1);
    prevT = t;

    if (video.paused) video.playbackRate = 1;
    else {
      // The stage throttle can queue targets far faster than 1x playback reaches
      // them, so catch up on rate and hard-seek when the gap is hopeless.
      const gap = videoTarget - video.currentTime;
      if (gap <= 0) { video.pause(); video.playbackRate = 1; }
      else if (gap > SEEK_GAP) { video.currentTime = videoTarget - 0.4; video.playbackRate = MAX_RATE; }
      else video.playbackRate = gap > 0.8 ? Math.min(MAX_RATE, 1 + gap) : 1;
    }
    if (video.readyState >= 2) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    }
    rx += (trx - rx) * 0.045;
    ry += (try_ - ry) * 0.045;
    stageSmooth += (stage - stageSmooth) * (1 - Math.exp(-dt * 2.2));
    if (grainEl) grainEl.style.opacity = Math.min(stageSmooth, 1) * 0.09;
    const auto = REDUCED ? 0 : Math.sin(time * 0.22) * 0.05;

    const bg = opts.background;
    const bigint = parseInt(bg.slice(1), 16);
    gl.clearColor(((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (shapeProg) {
      gl.useProgram(shapeProg);
      gl.uniform1f(sU.uTime, time);
      gl.uniform1f(sU.uStageF, stageSmooth);
      gl.uniform2f(sU.uRot, rx + auto, ry);
      gl.bindVertexArray(vaoShapes);
      gl.drawArrays(gl.POINTS, 0, opts.shapeCount);
    }
    gl.useProgram(prog);
    gl.uniform1f(uTime, time);
    gl.uniform1f(uStageU, Math.min(stageSmooth, opts.contentStages));
    gl.uniform2f(uRotU, rx + auto, ry);
    gl.bindVertexArray(vaoVideo);
    gl.drawArrays(gl.POINTS, 0, COUNT);
    raf = requestAnimationFrame(frame);
  }

  resize();
  raf = requestAnimationFrame(frame);

  return {
    step,
    get stage() { return stage; },
    get stages() { return STAGES; },
    /* 0..1 across the final explode stage, so callers can time overlays to it */
    get outroProgress() {
      if (stage < STAGES) return 0;
      if (opts.explodeT == null) return 1;
      const dur = video.duration || 10;
      const from = Math.min(opts.explodeT, dur);
      const span = Math.max(0.01, dur - 0.05 - from);
      const at = (video.currentTime - from) / span;
      return at < 0 ? 0 : at > 1 ? 1 : at;
    },
    video,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (opts.interactive) {
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('wheel', onWheel);
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchmove', onTouchMove);
        container.removeEventListener('click', onClick);
      }
      video.pause();
      [canvas, video, vignetteEl, grainEl].forEach(el => el && el.remove());
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  };
}


window.createParticleVideo = createParticleVideo;
