// The scale-comparison beats on a bright blue grid floor. Each scene draws from its own frame `f`; cuts land on the
// narrator's words (see CUTS), so a re-recorded voice only needs new numbers here.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Block, Cam, CROWD, P, Part, TextSign, Toon, V3, clamp, kick, lerp, prog, rnd, shake, springIn} from './kit';
import words from './words.json';

type SceneProps = {f: number};
const FPS = 30;
const BLUE = '#2D8BEA';

/** The global frame where the n-th occurrence of `w` is spoken. */
export const wordAt = (w: string, n = 1) => {
  let k = 0;
  for (const x of words as {w: string; s: number}[]) if (x.w.toLowerCase() === w.toLowerCase() && ++k === n) return Math.round(x.s * FPS);
  throw new Error(`word ${w}#${n} not in the voice`);
};

// ---------------------------------------------------------------- the studio: a blue void with a grid floor
const gridTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3196F2';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 512);
    g.moveTo(0, i);
    g.lineTo(512, i);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 4;
  g.strokeRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** The blue studio. `dark` 0..1 sinks it toward the deep-water navy of the ending; `cell` is a grid square in metres. */
const Studio: React.FC<{dark?: number; cell?: number; fogFar?: number}> = ({dark = 0, cell = 2, fogFar = 90}) => {
  const {scene} = useThree();
  const col = useMemo(() => new THREE.Color(BLUE).lerp(new THREE.Color('#050C1E'), dark), [dark]);
  useLayoutEffect(() => {
    scene.background = col;
    scene.fog = new THREE.Fog(col, fogFar * 0.25, fogFar);
    return () => {
      scene.fog = null;
    };
  }, [col, fogFar]);
  const tex = useMemo(gridTexture, []);
  const size = 1200;
  tex.repeat.set(size / (cell * 4), size / (cell * 4));
  return (
    <>
      <hemisphereLight args={['#FFFFFF', '#1B5FB0', 1.6 * (1 - dark * 0.7)]} />
      <directionalLight
        position={[8, 14, 10]}
        intensity={2.6 * (1 - dark * 0.6)}
        color="#FFFFFF"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={200}
        shadow-bias={-0.0006}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={tex} color={new THREE.Color('#FFFFFF').lerp(new THREE.Color('#0A1830'), dark)} roughness={0.95} />
      </mesh>
    </>
  );
};

// ---------------------------------------------------------------- the crowd: thousands of simple Pips, instanced
// Each person is a hoodie body, a hood, a face and two eyes, all facing +z (or `ry`). `place` returns, per person,
// a nudge [dx, dy, dz] and a scale (0 hides them), so scenes can pop them in, push them aside or lift a wave.
let ramp: THREE.DataTexture | null = null;
const toonRamp = () => {
  if (!ramp) {
    ramp = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
  }
  return ramp;
};
type Place = (x: number, z: number, i: number) => [number, number, number, number];
const PARTS: {p: V3; s: V3; c: 'hoodie' | 'skin' | 'eye'; dx?: number}[] = [
  {p: [0, 1.2, 0], s: [0.62, 1.0, 0.5], c: 'hoodie'},
  {p: [0, 1.95, -0.1], s: [1.02, 1.0, 0.9], c: 'hoodie'},
  {p: [0, 1.92, 0.06], s: [0.82, 0.84, 0.74], c: 'skin'},
  {p: [-0.15, 1.98, 0.43], s: [0.1, 0.15, 0.06], c: 'eye'},
  {p: [0.15, 1.98, 0.43], s: [0.1, 0.15, 0.06], c: 'eye'},
];
const CrowdSea: React.FC<{cols: number; rows: number; gap?: number; at?: V3; place?: Place; ry?: number; skip?: (x: number, z: number) => boolean}> = ({
  cols,
  rows,
  gap = 0.8,
  at = [0, 0, 0],
  place,
  ry = 0,
  skip,
}) => {
  const people = useMemo(() => {
    const out: {x: number; z: number; i: number}[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = (c - (cols - 1) / 2) * gap + (rnd(i) - 0.5) * gap * 0.3;
        const z = (r - (rows - 1) / 2) * gap + (rnd(i + 7) - 0.5) * gap * 0.3;
        if (!skip || !skip(x + at[0], z + at[2])) out.push({x, z, i});
      }
    return out;
  }, [cols, rows, gap, at[0], at[2]]);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const n = people.length;
  useLayoutEffect(() => {
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    PARTS.forEach((part, k) => {
      const m = refs.current[k];
      if (!m) return;
      people.forEach((q, j) => {
        const [dx, dy, dz, sc] = place ? place(q.x + at[0], q.z + at[2], q.i) : [0, 0, 0, 1];
        const turn = ry + (rnd(q.i + 3) - 0.5) * 0.7;
        d.position.set(q.x + dx, dy, q.z + dz);
        d.rotation.set(0, turn, 0);
        d.scale.setScalar(Math.max(0.0001, sc));
        d.updateMatrix();
        const local = new THREE.Matrix4().compose(new THREE.Vector3(...part.p), new THREE.Quaternion(), new THREE.Vector3(...part.s));
        m.setMatrixAt(j, d.matrix.clone().multiply(local));
        const look = CROWD[q.i % CROWD.length];
        col.set(part.c === 'eye' ? P.face : part.c === 'skin' ? look.skin : look.hoodie);
        m.setColorAt(j, col);
      });
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  });
  return (
    <group position={at}>
      {PARTS.map((part, k) => (
        <instancedMesh key={k} ref={(m) => (refs.current[k] = m)} args={[undefined, undefined, n]} castShadow={k < 2} receiveShadow>
          <sphereGeometry args={[0.5, k > 2 ? 8 : 16, k > 2 ? 6 : 12]} />
          <meshToonMaterial color="#FFFFFF" gradientMap={toonRamp()} />
        </instancedMesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- props
const Pyramid: React.FC<{p: V3; s?: number}> = ({p, s = 1}) => (
  <group position={p} scale={s} rotation={[0, Math.PI / 4, 0]}>
    <mesh position={[0, 0.73, 0]} castShadow receiveShadow>
      <coneGeometry args={[1.63, 1.46, 4]} />
      <meshToonMaterial color="#E7C27A" gradientMap={toonRamp()} />
    </mesh>
    <mesh position={[0, 0.73, 0]} scale={1.03}>
      <coneGeometry args={[1.63, 1.46, 4]} />
      <meshBasicMaterial color={P.ink} side={THREE.BackSide} />
    </mesh>
  </group>
);

/** An oven, 1.8 tall: white box, a door window that glows orange with `heat`. */
const Oven: React.FC<{p: V3; heat: number; ry?: number}> = ({p, heat, ry = 0}) => (
  <group position={p} rotation={[0, ry, 0]}>
    <Block p={[0, 0.9, 0]} s={[1.5, 1.8, 1.3]} c="#E9ECF2" />
    <Block p={[0, 0.78, 0.66]} s={[1.1, 0.75, 0.04]} c="#FF8A2A" e={0.4 + heat * 1.6} line={0.03} />
    <Block p={[0, 1.3, 0.69]} s={[1.0, 0.07, 0.07]} c="#9AA3B5" />
    {[-0.5, -0.17, 0.17, 0.5].map((x, i) => (
      <Part key={i} shape="cyl" p={[x, 1.62, 0.67]} r={[Math.PI / 2, 0, 0]} s={[0.16, 0.06, 0.16]} c="#2E2B3D" line={0.015} />
    ))}
    <pointLight position={[0, 0.8, 1.4]} intensity={heat * 6} color="#FF8A2A" distance={5} />
  </group>
);

const Burst: React.FC<{p: V3; f: number; f0: number; n?: number; c?: string; size?: number}> = ({p, f, f0, n = 14, c = '#FFFFFF', size = 1}) => {
  if (f < f0) return null;
  const t = (f - f0) / 26;
  if (t > 1) return null;
  return (
    <group position={p} scale={size}>
      {Array.from({length: n}).map((_, i) => {
        const a = rnd(i) * Math.PI * 2;
        const v = 2 + rnd(i + 2) * 3;
        const r = 0.3 * (1 - t);
        return <Part key={i} shape="sphere" p={[Math.cos(a) * v * t, rnd(i + 4) * 2 * t, Math.sin(a) * v * t * 0.6]} s={[r, r, r]} c={c} line={0.01} />;
      })}
    </group>
  );
};

/** A flat ring of mustard tape on the floor: a square outline of side `w`. */
const Tape: React.FC<{p: V3; w: number; d?: number; t?: number; c?: string}> = ({p, w, d = w, t = 0.08, c = P.mustard}) => (
  <group position={p}>
    {[
      [0, -d / 2, w + t, t],
      [0, d / 2, w + t, t],
      [-w / 2, 0, t, d + t],
      [w / 2, 0, t, d + t],
    ].map(([x, z, sx, sz], i) => (
      <Block key={i} p={[x, 0.02, z]} s={[sx, 0.04, sz]} c={c} e={0.3} line={0} />
    ))}
  </group>
);

// ---------------------------------------------------------------- the scenes (frames are local to each scene)
export const CUTS = [
  0,
  wordAt('What') - 2,
  wordAt('Four') - 2,
  wordAt('A', 1) - 2,
  wordAt('We') - 2,
  wordAt('Stand') - 2,
  wordAt('A', 2) - 2,
  wordAt('Walking') - 2,
  wordAt('rest') - 8,
  wordAt('Everyone', 2) - 2,
  wordAt('on', 3) + 50,
];

// SH: the hook (a flash-forward): Pip wedged in the crowd, deadpan, until someone steps on his foot.
export const SH: React.FC<SceneProps> = ({f}) => {
  const foot = wordAt('foot') + 2;
  const ow = f >= foot;
  const sh = shake(f, foot, 0.06, 10);
  const jostle: Place = (x, z, i) => [Math.sin(f / 7 + i) * 0.04, 0, 0, 1];
  return (
    <>
      <Studio cell={1} fogFar={22} />
      <Cam pos={[0.5 + sh[0], 2.7 + sh[1], lerp(5.6, 5.0, prog(f, 0, CUTS[1]))]} look={[0, 1.55, 0]} fov={46 - kick(f, foot, 10) * 6} />
      <CrowdSea cols={16} rows={14} gap={0.85} at={[0, 0, -6]} place={jostle} />
      <CrowdSea cols={5} rows={1} gap={0.9} at={[0, 0, -0.75]} place={jostle} skip={(x) => Math.abs(x) < 0.5} />
      <Toon p={[0, ow ? 0.08 : 0, 0]} fat={1} eyes={ow ? 'shut' : 'side'} look_={ow ? 0 : -0.8} mouth={ow ? 'wobble' : 'flat'} squash={0.05 * kick(f, foot, 6)} armOut={0.06} armL={ow ? 0.5 : 0} armR={ow ? 0.5 : 0} />
      <Burst p={[0, 0.2, 0.4]} f={f} f0={foot} n={10} size={0.4} />
    </>
  );
};

// S0: the title. Pip alone on the grid; from "eight billion" the crowd pops in around him, ring by ring.
export const S0: React.FC<SceneProps> = ({f}) => {
  const start = wordAt('eight') - CUTS[1];
  const len = CUTS[2] - CUTS[1];
  const rise = prog(f, start, len - start);
  const place: Place = (x, z) => {
    const d = Math.hypot(x, z);
    return [0, 0, 0, springIn(f, start + d * 2.4, 10)];
  };
  return (
    <>
      <Studio cell={1} fogFar={lerp(40, 70, rise)} />
      <Cam pos={[0, lerp(2.4, 9, rise), lerp(6, 9, rise)]} look={[0, lerp(1.6, 0, rise), lerp(0, -3, rise)]} fov={46} />
      <CrowdSea cols={36} rows={36} gap={0.85} place={place} skip={(x, z) => Math.hypot(x, z) < 0.6} />
      <Toon p={[0, 0, 0]} eyes={f < start ? 'open' : 'side'} look_={f < start ? 0 : Math.sin(f / 9) * 0.8} mouth="flat" armOut={0.06} />
    </>
  );
};

// S1: four per square metre: a taped square, four Pips squeezed in; then the camera climbs over thousands of squares.
export const S1: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[3] - CUTS[2];
  const two = wordAt('two', 1) - CUTS[2];
  const up = prog(f, two - 10, len - two + 10);
  const pips: V3[] = [
    [-0.42, 0, -0.42],
    [0.42, 0, -0.42],
    [-0.42, 0, 0.42],
    [0.42, 0, 0.42],
  ];
  return (
    <>
      <Studio cell={1} fogFar={lerp(30, 90, up)} />
      <Cam pos={[0, lerp(5.2, 30, up), lerp(5.2, 18, up)]} look={[0, lerp(0.9, 0, up), lerp(0, -6, up)]} fov={46} />
      {pips.map((p, i) => (
        <Toon key={i} look={i === 2 ? undefined : CROWD[i]} p={p} s={springIn(f, 4 + i * 5, 10) * 0.8} eyes="open" look_={i % 2 ? -0.5 : 0.5} mouth="flat" armOut={0.02} />
      ))}
      <Tape p={[0, 0, 0]} w={1.7} />
      <CrowdSea cols={40} rows={40} gap={0.85} at={[0, 0, -2]} skip={(x, z) => Math.abs(x) < 1.2 && Math.abs(z) < 1.2} place={(x, z) => [0, 0, 0, springIn(f, two - 6 + Math.hypot(x, z) * 0.6, 8)]} />
      {Array.from({length: 9}).map((_, i) => (
        <Tape key={i} p={[((i % 3) - 1) * 6.8, 0, (Math.floor(i / 3) - 1) * 6.8 - 2]} w={6.8} t={0.12} c="#FFFFFF" />
      ))}
    </>
  );
};

// S2: a square 45 km wide, next to Tokyo (2,194 km²): seen from high above, the crowd is the smaller of the two.
export const S2: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[4] - CUTS[3];
  const tokyo = wordAt('Smaller') - CUTS[3];
  const t = springIn(f, tokyo - 4, 14);
  const drift = prog(f, 0, len);
  return (
    <>
      <Studio cell={8} fogFar={260} />
      <Cam pos={[0, lerp(74, 68, drift), lerp(48, 44, drift)]} look={[0, 0, -16]} fov={50} />
      {/* the crowd: 20 x 20 units of heads */}
      <CrowdSea cols={30} rows={30} gap={0.68} at={[0, 0, 6]} />
      <Tape p={[0, 0, 6]} w={21} t={0.5} />
      <TextSign p={[0, 4, 17.5]} w={12} h={3} lines={['EVERYONE']} bg={P.mustard} r={[-0.6, 0, 0]} />
      {/* Tokyo: a wide city blob of about 1.1x the area, popping up behind */}
      <group position={[0, 0, -20]} scale={[t, Math.max(0.001, t), t]}>
        <mesh scale={[34, 0.3, 16.4]} position={[0, 0.15, 0]} receiveShadow>
          <cylinderGeometry args={[0.5, 0.5, 1, 40]} />
          <meshToonMaterial color="#8FBF8A" gradientMap={toonRamp()} />
        </mesh>
        {Array.from({length: 46}).map((_, i) => {
          const a = rnd(i) * Math.PI * 2;
          const r = Math.sqrt(rnd(i + 11)) * 0.44;
          const h = 0.6 + rnd(i + 5) * 2.8;
          return <Block key={i} p={[Math.cos(a) * r * 34, 0.3 + h / 2, Math.sin(a) * r * 16.4]} s={[1.1, h, 1.1]} c={i % 3 ? '#E9ECF2' : '#B8C0CE'} />;
        })}
        <TextSign p={[0, 5.5, 4]} w={12} h={3} lines={['TOKYO']} bg="#F6EFE3" r={[-0.6, 0, 0]} />
      </group>
    </>
  );
};

// S3: over 400 million tonnes, seventy Great Pyramids: they thump down in rows, Pip at the front for scale.
export const S3: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[5] - CUTS[4];
  const land = wordAt('Seventy') - CUTS[4];
  const up = prog(f, 0, len);
  const sh = shake(f, land + 4, 0.25, 12);
  return (
    <>
      <Studio cell={4} fogFar={170} />
      <Cam pos={[sh[0], lerp(13, 19, up) + sh[1], 36]} look={[0, 0, -20]} fov={50} />
      {Array.from({length: 70}).map((_, i) => {
        const r = Math.floor(i / 7);
        const c = i % 7;
        const drop = clamp((f - (land - 10 + r * 1.2 + c * 0.3)) / 6);
        return <Pyramid key={i} p={[(c - 3) * 6.2, (1 - drop) * 30, -r * 6.2 - 2]} s={3.6} />;
      })}
      <Toon p={[0, 0, 16]} s={2} eyes={f < land ? 'open' : 'shock'} mouth={f < land ? 'flat' : 'o'} armOut={0.12} />
      <Burst p={[0, 0.5, 4]} f={f} f0={land + 4} n={18} size={3} c="#E7C27A" />
    </>
  );
};

// S4: stand in the middle and the edge is past the horizon: eye level in the sea of heads, people forever.
export const S4: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[6] - CUTS[5];
  const turn = Math.sin(f / 14) * 0.9;
  return (
    <>
      <Studio cell={1} fogFar={34} />
      <Cam pos={[lerp(-0.4, 0.4, prog(f, 0, len)), 3.3, 5.6]} look={[0, 1.2, -6]} fov={50} />
      <CrowdSea cols={28} rows={26} gap={0.85} at={[0, 0, -10.4]} skip={(x, z) => Math.hypot(x, z) < 0.6} />
      <CrowdSea cols={9} rows={2} gap={0.85} at={[0, 0, 0.6]} skip={(x) => Math.abs(x) < 0.7} />
      <Toon p={[0, 0, 0]} ry={turn * 0.35} eyes="side" look_={turn} mouth="flat" armOut={0.06} />
    </>
  );
};

// S5: a Mexican wave takes an hour: a wave of jumping crowd rolls toward us; Pip throws his arms up late.
export const S5: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[7] - CUTS[6];
  const front = lerp(-34, 8, f / len);
  const lift = (z: number) => Math.exp(-Math.pow((z - front) / 2.2, 2));
  const late = clamp((f - (len * 0.78)) / 6);
  return (
    <>
      <Studio cell={1} fogFar={70} />
      <Cam pos={[3, 6.5, 13]} look={[0.8, 0.6, -6]} fov={48} />
      <CrowdSea cols={22} rows={30} gap={0.95} at={[0, 0, -9]} skip={(x, z) => Math.hypot(x - 1.5, z - 5.5) < 0.6} place={(x, z) => [0, lift(z) * 0.9, 0, 1 + lift(z) * 0.08]} />
      <Toon p={[1.5, late * 0.4, 5.5]} ry={0.3} eyes={late > 0 ? 'shut' : 'open'} mouth={late > 0 ? 'open' : 'flat'} armL={late * 2.8} armR={late * 2.8} armOut={0.12 + late * 0.3} />
    </>
  );
};

// S6: walking across takes nine hours of "excuse me": Pip edges sideways through the crowd, people lean away.
export const S6: React.FC<SceneProps> = ({f}) => {
  const x = lerp(-1.2, 1.2, f / (CUTS[8] - CUTS[7]));
  const step = Math.sin(f / 3);
  return (
    <>
      <Studio cell={1} fogFar={30} />
      <Cam pos={[x * 0.6, 3.6, 5.4]} look={[x * 0.8, 1.5, 0]} fov={48} />
      <CrowdSea
        cols={30}
        rows={24}
        gap={0.85}
        at={[0, 0, -11]}
        skip={(px, pz) => Math.abs(pz) < 0.5}
        place={(px, pz) => {
          const d = px - x;
          const push = Math.abs(pz) < 1.4 ? Math.exp(-d * d * 2) * 0.35 : 0;
          return [0, 0, Math.sign(pz) * push, 1];
        }}
      />
      <Toon p={[x, Math.abs(step) * 0.04, 0]} ry={0.25} eyes="shut" mouth="o" armL={0.9} armR={0.9} armOut={-0.3} legL={step * 0.35} legR={-step * 0.35} squash={0.04} />
    </>
  );
};

// S7: the rest of the planet is empty: the globe, one tiny speck of everybody, the studio sinking toward navy.
export const S7: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[9] - CUTS[8];
  const dark = prog(f, 0, len);
  const pin = springIn(f, 6, 14);
  return (
    <>
      <Studio dark={0.3 + dark * 0.5} cell={4} fogFar={200} />
      <Cam pos={[0, 3.5, lerp(28, 25, dark)]} look={[0, 8.6, 0]} fov={44} />
      <group position={[0, 5.4, 0]} rotation={[0.25, 0.4 + f * 0.004, 0]}>
        <Part shape="sphere" s={[9, 9, 9]} c="#2F6FB0" line={0.08} />
        {Array.from({length: 10}).map((_, i) => {
          const a = rnd(i) * Math.PI * 2;
          const b = (rnd(i + 20) - 0.5) * 2.2;
          const r = 4.35;
          return <Part key={i} shape="sphere" p={[Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r]} s={[2.4 + rnd(i + 3) * 1.4, 0.6, 1.8 + rnd(i + 4) * 1.4]} r={[b, -a, 0]} c="#5E9A4E" line={0.03} />;
        })}
      </group>
      {/* everybody: one speck on the front of the globe, with a pin */}
      <group position={[0.9, 6.6, 4.35]}>
        <Part shape="sphere" s={[0.12, 0.12, 0.05]} c={P.face} line={0} />
        <group scale={pin} position={[0, 0.1, 0.1]}>
          <Part shape="cyl" p={[0, 0.6, 0]} s={[0.06, 1.2, 0.06]} c="#F6EFE3" line={0.02} />
          <Part shape="sphere" p={[0, 1.3, 0]} s={[0.45, 0.45, 0.45]} c={P.mustard} line={0.03} e={0.3} />
        </group>
      </group>
    </>
  );
};

// S8: "Everyone left the oven on." Pip alone in the dark next to a glowing oven; he turns to it, then sinks into the dark.
export const S8: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[10] - CUTS[9];
  const oven = wordAt('oven') - CUTS[9];
  const turn = prog(f, oven, 6);
  const sink = prog(f, oven + 26, len - oven - 26);
  return (
    <>
      <Studio dark={0.9 + sink * 0.1} cell={1} fogFar={lerp(30, 6, sink)} />
      <Cam pos={[0.5, 2.4, lerp(8, 8.8, sink)]} look={[0.5, 1.9 - sink * 0.6, 0]} fov={42} />
      <pointLight position={[0.8, 3, 2.5]} intensity={lerp(8, 0, sink)} color="#9FC8FF" distance={8} />
      <Oven p={[1.6, -sink * 1.2, -0.2]} heat={(0.6 + Math.sin(f / 4) * 0.15) * (1 - sink)} ry={-0.3} />
      <Toon p={[-0.4, -sink * 1.2, 0.3]} ry={turn * 0.9} eyes={f < oven ? 'open' : 'shock'} look_={turn * 0.8} mouth={f < oven ? 'flat' : 'o'} />
    </>
  );
};

export const SCENES = [SH, S0, S1, S2, S3, S4, S5, S6, S7, S8];
// Impacts, in global frames: flashes land here (the sound script reads its own list).
export const HITS = [wordAt('foot') + 2, wordAt('Seventy') + 4];
