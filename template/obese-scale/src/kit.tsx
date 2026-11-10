// The 3D kit: cel-shaded parts with ink outlines (the 2D demo's look, in 3D), Pip and his cast, signs, a dusk sky,
// a camera rig. Everything is a pure function of props, so a frame renders the same every time.
import React, {useLayoutEffect, useMemo} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';

export type V3 = [number, number, number];

// ---------------------------------------------------------------- helpers
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** 0 → 1 over [f0, f0 + d] frames, eased. */
export const prog = (f: number, f0: number, d: number) => ease(clamp((f - f0) / d));
/** 0 → 1 with an overshoot and settle (a cartoon pop). */
export const springIn = (f: number, f0: number, d = 14) => {
  const p = clamp((f - f0) / d);
  if (p <= 0) return 0;
  return 1 - Math.cos(p * Math.PI * 2.5) * Math.exp(-p * 5) * (1 - p * 0.2);
};
/** A camera kick after a hit: decays from 1 to 0. */
export const kick = (f: number, f0: number, d = 10) => (f < f0 ? 0 : Math.exp(-((f - f0) / d) * 3));
export const shake = (f: number, f0: number, amp: number, d = 10): V3 => {
  const k = kick(f, f0, d) * amp;
  return [Math.sin(f * 2.3) * k, Math.cos(f * 3.1) * k, 0];
};

// ---------------------------------------------------------------- palette (from the 2D demo)
export const P = {
  skin: '#F6EFE3',
  ink: '#121019',
  face: '#1D2033',
  hoodie: '#2E2B3D',
  mustard: '#F2B33D',
  limb: '#EFE2CC',
  shoe: '#2FB7A6',
  skyTop: '#25184A',
  skyMid: '#6E3A6E',
  horizon: '#F2985A',
  sun: '#FFE7B3',
  warm: '#FFB46A',
};

// ---------------------------------------------------------------- cel-shaded parts with an ink outline
let gradient: THREE.DataTexture | null = null;
const toonRamp = () => {
  if (!gradient) {
    const d = new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255]);
    gradient = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
};

type Shape = 'sphere' | 'box' | 'capsule' | 'cyl';
const Geo: React.FC<{shape: Shape}> = ({shape}) =>
  shape === 'sphere' ? (
    <sphereGeometry args={[0.5, 28, 20]} />
  ) : shape === 'capsule' ? (
    <capsuleGeometry args={[0.5, 1, 8, 16]} />
  ) : shape === 'cyl' ? (
    <cylinderGeometry args={[0.5, 0.5, 1, 20]} />
  ) : (
    <boxGeometry args={[1, 1, 1]} />
  );

/**
 * One part: a shape of size `s` at `p`, cel-shaded in `c`, with an ink outline (an inverted hull) of `line` units.
 * `toon` false gives a plain matte surface, for sets where the outline would be noise.
 */
export const Part: React.FC<{
  shape?: Shape;
  p?: V3;
  s: V3;
  c: string;
  r?: V3;
  line?: number;
  e?: number;
  toon?: boolean;
  shadow?: boolean;
  o?: number;
}> = ({shape = 'box', p = [0, 0, 0], s, c, r = [0, 0, 0], line = 0.035, e = 0, toon = true, shadow = true, o = 1}) => {
  const ls: V3 = [s[0] + line * 2, s[1] + line * 2, s[2] + line * 2];
  // capsules are 2 units long at scale 1 (radius 0.5 + length 1): scale so `s` is the outer size
  const k: V3 = shape === 'capsule' ? [1, 0.5, 1] : [1, 1, 1];
  return (
    <group position={p} rotation={r}>
      <mesh scale={[s[0] * k[0], s[1] * k[1], s[2] * k[2]]} castShadow={shadow} receiveShadow>
        <Geo shape={shape} />
        {toon ? (
          <meshToonMaterial color={c} gradientMap={toonRamp()} emissive={e ? c : '#000000'} emissiveIntensity={e} transparent={o < 1} opacity={o} />
        ) : (
          <meshStandardMaterial color={c} roughness={0.9} emissive={e ? c : '#000000'} emissiveIntensity={e} transparent={o < 1} opacity={o} />
        )}
      </mesh>
      {line > 0 ? (
        <mesh scale={[ls[0] * k[0], ls[1] * k[1], ls[2] * k[2]]}>
          <Geo shape={shape} />
          <meshBasicMaterial color={P.ink} side={THREE.BackSide} transparent={o < 1} opacity={o} />
        </mesh>
      ) : null}
    </group>
  );
};

/** Set pieces: matte, a thin outline, so the characters stay the most graphic things in frame. */
export const Block: React.FC<{p: V3; s: V3; c: string; r?: V3; e?: number; line?: number}> = ({p, s, c, r, e, line = 0.02}) => (
  <Part p={p} s={s} c={c} r={r} e={e} line={line} toon />
);

// ---------------------------------------------------------------- the cast
export type Look = {skin: string; hoodie: string; strings: string; limb: string; shoe: string; hair?: 'curls' | 'none'; hairC?: string; phones?: boolean};
export const CAST: Record<string, Look> = {
  pip: {skin: P.skin, hoodie: P.hoodie, strings: P.mustard, limb: P.limb, shoe: P.shoe},
  mo: {skin: '#C98E68', hoodie: '#5E6E46', strings: '#E9C46A', limb: '#3A3446', shoe: '#D9534F', hair: 'curls', hairC: '#2A1C18', phones: true},
  x1: {skin: '#E8C9A8', hoodie: '#8A5A6A', strings: '#E9C46A', limb: '#3A3446', shoe: '#5A4A6A'},
  x2: {skin: '#A86E4E', hoodie: '#3E8C86', strings: '#F28C6A', limb: '#3A3446', shoe: '#F28C6A'},
  x3: {skin: '#F2D9C0', hoodie: '#4A5A8A', strings: '#F2B33D', limb: '#EFE2CC', shoe: '#2FB7A6'},
  x4: {skin: '#7A4E36', hoodie: '#A8323E', strings: '#F6EFE3', limb: '#3A3446', shoe: '#14151A'},
};
export const CROWD = [CAST.x1, CAST.x2, CAST.x3, CAST.x4, CAST.mo];

export type Eyes = 'open' | 'shock' | 'shut' | 'dead' | 'side' | 'glint';
export type Mouth = 'flat' | 'smile' | 'open' | 'o' | 'wobble';

/**
 * Pip (or any of the cast), feet at the origin, facing +z: a big round head inside a dark hood, mustard
 * drawstrings, light limbs, mitten hands, teal shoes. `fat` widens the body (1 = as drawn in the demo).
 * Arms hinge at the shoulders: `armL`/`armR` raise forward, `armOut` spreads them; legs hinge at the hips.
 */
export const Toon: React.FC<{
  look?: Look;
  p?: V3;
  ry?: number;
  rx?: number;
  s?: number;
  fat?: number;
  armL?: number;
  armR?: number;
  armOut?: number;
  legL?: number;
  legR?: number;
  sit?: number; // 0 standing .. 1 seated (thighs forward)
  eyes?: Eyes;
  mouth?: Mouth;
  look_?: number; // eyes slide -1..1
  headTilt?: number;
  squash?: number;
  sweat?: number;
  blush?: number;
}> = ({look = CAST.pip, p = [0, 0, 0], ry = 0, rx = 0, s = 1, fat = 1, armL = 0, armR = 0, armOut = 0.12, legL = 0, legR = 0, sit = 0, eyes = 'open', mouth = 'flat', look_ = 0, headTilt = 0, squash = 0, sweat = 0, blush = 0}) => {
  const bw = 0.62 * fat;
  const bd = 0.5 * (0.7 + 0.3 * fat) + (fat - 1) * 0.25;
  const hipY = 0.72;
  const legX = 0.13 + (fat - 1) * 0.16;
  const shoulderX = bw / 2 + 0.02;
  const headY = 1.92 + (fat - 1) * 0.04;
  const ex = look_ * 0.06;
  const sy = 1 - squash;
  const sxz = 1 + squash * 0.6;
  return (
    <group position={p} rotation={[rx, ry, 0]} scale={[s * sxz, s * sy, s * sxz]}>
      {/* legs */}
      {([
        [-legX, legL],
        [legX, legR],
      ] as [number, number][]).map(([x, a], i) => (
        <group key={i} position={[x, hipY, 0]} rotation={[a - sit * 1.5, 0, 0]}>
          <Part shape="capsule" p={[0, -0.33, 0]} s={[0.17 + (fat - 1) * 0.08, 0.66, 0.17 + (fat - 1) * 0.08]} c={look.limb} />
          <group position={[0, -0.66, 0]} rotation={[sit * 1.5, 0, 0]}>
            <Part shape="sphere" p={[0, -0.02, 0.08]} s={[0.24, 0.16, 0.34]} c={look.shoe} />
          </group>
        </group>
      ))}
      {/* the hoodie body, a belly when he's big */}
      <Part shape="sphere" p={[0, 1.2, 0]} s={[bw, 1.0, bd]} c={look.hoodie} />
      {fat > 1.05 ? <Part shape="sphere" p={[0, 1.05, bd * 0.22]} s={[bw * 0.92, 0.8, bd * 0.85]} c={look.hoodie} /> : null}
      {/* drawstrings */}
      {[-1, 1].map((k) => (
        <group key={k}>
          <Part shape="cyl" p={[k * 0.09, 1.5, bd / 2 - 0.02 + (fat - 1) * 0.06]} s={[0.035, 0.36, 0.035]} c={look.strings} line={0.012} />
          <Part shape="sphere" p={[k * 0.09, 1.31, bd / 2 - 0.02 + (fat - 1) * 0.06]} s={[0.06, 0.06, 0.06]} c={look.strings} line={0.012} />
        </group>
      ))}
      {/* arms */}
      {([
        [-shoulderX, armL, -armOut],
        [shoulderX, armR, armOut],
      ] as [number, number, number][]).map(([x, a, o], i) => (
        <group key={i} position={[x, 1.5, 0]} rotation={[-a, 0, o]}>
          <Part shape="capsule" p={[0, -0.32, 0]} s={[0.15 + (fat - 1) * 0.06, 0.62, 0.15 + (fat - 1) * 0.06]} c={look.limb} />
          <Part shape="sphere" p={[0, -0.66, 0]} s={[0.17, 0.19, 0.17]} c={look.skin} />
        </group>
      ))}
      {/* the head in its hood */}
      <group position={[0, headY, 0]} rotation={[0, 0, headTilt]}>
        <Part shape="sphere" p={[0, 0.03, -0.1]} s={[1.02, 1.0, 0.9]} c={look.hoodie} />
        <Part shape="sphere" p={[0, 0, 0.06]} s={[0.82 + (fat - 1) * 0.1, 0.84, 0.74]} c={look.skin} />
        {look.hair === 'curls'
          ? [-0.3, -0.15, 0, 0.15, 0.3].map((x, i) => <Part key={i} shape="sphere" p={[x, 0.38, 0.02]} s={[0.24, 0.2, 0.24]} c={look.hairC!} line={0.015} />)
          : null}
        {look.phones ? <Part shape="cyl" p={[0, -0.42, 0.04]} r={[Math.PI / 2, 0, 0]} s={[0.7, 0.08, 0.5]} c="#E2E2EA" line={0.015} /> : null}
        <Face eyes={eyes} mouth={mouth} ex={ex} blush={blush} />
        {sweat > 0 ? <Part shape="sphere" p={[0.36, 0.2 - sweat * 0.3, 0.3]} s={[0.07, 0.11, 0.07]} c="#9FD8FF" line={0.012} o={clamp(1.4 - sweat)} /> : null}
      </group>
    </group>
  );
};

/** The face: the demo's big dark eyes with a white glint, on the front of the head (z about 0.4). */
const Face: React.FC<{eyes: Eyes; mouth: Mouth; ex: number; blush?: number}> = ({eyes, mouth, ex, blush = 0}) => {
  const z = 0.41;
  const eye = (k: number) => {
    const x = k * 0.15 + ex;
    if (eyes === 'shut') return <Part key={k} shape="box" p={[x, 0.06, z]} s={[0.12, 0.025, 0.02]} c={P.face} line={0} />;
    if (eyes === 'dead')
      return (
        <group key={k}>
          <Part shape="box" p={[x, 0.06, z]} r={[0, 0, 0.8]} s={[0.14, 0.03, 0.02]} c={P.face} line={0} />
          <Part shape="box" p={[x, 0.06, z]} r={[0, 0, -0.8]} s={[0.14, 0.03, 0.02]} c={P.face} line={0} />
        </group>
      );
    const big = eyes === 'shock' ? 1.45 : 1;
    return (
      <group key={k}>
        <Part shape="sphere" p={[x, 0.06, z - 0.02]} s={[0.1 * big, 0.15 * big, 0.06]} c={P.face} line={0} />
        <Part shape="sphere" p={[x + 0.025, 0.1, z + 0.01]} s={[0.035, 0.035, 0.02]} c={eyes === 'glint' ? '#7FD4FF' : '#FFFFFF'} line={0} e={eyes === 'glint' ? 1.5 : 0.6} />
      </group>
    );
  };
  return (
    <group>
      {eye(-1)}
      {eye(1)}
      {blush > 0 ? [-1, 1].map((k) => <Part key={`b${k}`} shape="sphere" p={[k * 0.25 + ex, -0.07, z - 0.05]} s={[0.13, 0.07, 0.04]} c="#FF8FA3" line={0} o={blush} />) : null}
      {mouth === 'flat' ? <Part shape="box" p={[ex, -0.17, z - 0.02]} s={[0.14, 0.025, 0.02]} c={P.face} line={0} /> : null}
      {mouth === 'smile' ? (
        <mesh position={[ex, -0.12, z - 0.005]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.085, 0.022, 10, 24, Math.PI]} />
          <meshBasicMaterial color={P.face} />
        </mesh>
      ) : null}
      {mouth === 'open' ? <Part shape="sphere" p={[ex, -0.18, z - 0.03]} s={[0.16, 0.14, 0.04]} c="#3A1418" line={0} /> : null}
      {mouth === 'o' ? <Part shape="sphere" p={[ex, -0.18, z - 0.03]} s={[0.08, 0.1, 0.04]} c="#3A1418" line={0} /> : null}
      {mouth === 'wobble'
        ? [-0.06, 0, 0.06].map((x, i) => <Part key={i} shape="box" p={[ex + x, -0.17 + (i % 2 ? 0.015 : -0.01), z - 0.02]} r={[0, 0, i % 2 ? -0.5 : 0.5]} s={[0.07, 0.022, 0.02]} c={P.face} line={0} />)
        : null}
    </group>
  );
};

// ---------------------------------------------------------------- signs, sky, camera, light
/** A flat sign with text drawn on a canvas texture. */
export const TextSign: React.FC<{p: V3; w: number; h: number; lines: string[]; bg?: string; fg?: string; r?: V3; glow?: number}> = ({
  p,
  w,
  h,
  lines,
  bg = '#F6EFE3',
  fg = '#1D2033',
  r = [0, 0, 0],
  glow = 0,
}) => {
  const tex = useMemo(() => {
    const cw = 512;
    const ch = Math.round((cw * h) / w);
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d')!;
    g.fillStyle = bg;
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const size = Math.min(ch / (lines.length + 0.5), (cw * 1.55) / Math.max(...lines.map((l) => l.length)));
    g.font = `800 ${Math.floor(size)}px "IBM Plex Mono", monospace`;
    lines.forEach((l, i) => g.fillText(l, cw / 2, (ch * (i + 0.75)) / (lines.length + 0.5)));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [w, h, lines.join('|'), bg, fg]);
  return (
    <group position={p} rotation={r}>
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[w + 0.06, h + 0.06]} />
        <meshBasicMaterial color={P.ink} />
      </mesh>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={glow} roughness={0.9} />
      </mesh>
    </group>
  );
};

/** The demo's dusk: purple at the top, through plum, to orange at the horizon. Used as the scene background. */
export const DuskSky: React.FC<{red?: number; night?: boolean}> = ({red = 0, night = false}) => {
  const {scene} = useThree();
  useLayoutEffect(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 512;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 512);
    if (night) {
      grad.addColorStop(0, '#060A1C');
      grad.addColorStop(0.6, '#111A3E');
      grad.addColorStop(1, '#33305E');
    } else {
      grad.addColorStop(0, P.skyTop);
      grad.addColorStop(0.62, P.skyMid);
      grad.addColorStop(1, P.horizon);
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 512);
    if (red > 0) {
      g.fillStyle = `rgba(122,15,34,${0.75 * red})`;
      g.fillRect(0, 0, 4, 512);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
    return () => t.dispose();
  }, [red, night]);
  return null;
};

export const Fog: React.FC<{c: string; near: number; far: number}> = ({c, near, far}) => {
  const {scene} = useThree();
  useLayoutEffect(() => {
    scene.fog = new THREE.Fog(c, near, far);
    return () => {
      scene.fog = null;
    };
  }, [c, near, far]);
  return null;
};

/** Puts the camera at `pos`, aimed at `look`, every frame. */
export const Cam: React.FC<{pos: V3; look: V3; fov?: number}> = ({pos, look, fov = 40}) => {
  const {camera} = useThree();
  const apply = () => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...pos);
    cam.fov = fov;
    cam.near = 0.1;
    cam.far = 500;
    cam.lookAt(...look);
    cam.updateProjectionMatrix();
  };
  useLayoutEffect(apply);
  useFrame(apply);
  return null;
};

/** The demo's light: a low warm sun as the key (with shadows), cool purple fill from the sky. */
export const Light: React.FC<{key_?: V3; keyC?: string; keyI?: number; fill?: number; fillC?: string; ground?: string}> = ({
  key_ = [6, 6, 4],
  keyC = P.warm,
  keyI = 3.2,
  fill = 1.6,
  fillC = '#8A6FC0',
  ground = '#2A1E30',
}) => (
  <>
    <hemisphereLight args={[fillC, ground, fill]} />
    <directionalLight
      position={key_}
      intensity={keyI}
      color={keyC}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
      shadow-bias={-0.0006}
    />
  </>
);
