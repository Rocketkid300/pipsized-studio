// The scale-comparison beats on a bright blue grid floor. Each scene draws from its own frame `f`; cuts land on the
// narrator's words (see CUTS), so a re-recorded voice only needs new numbers here.
import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Block, Cam, CAST, CROWD, P, Part, TextSign, Toon, V3, clamp, kick, lerp, prog, rnd, shake, springIn} from './kit';
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

// ---------------------------------------------------------------- props
const Bus: React.FC<{p: V3; ry?: number; s?: number}> = ({p, ry = 0, s = 1}) => (
  <group position={p} rotation={[0, ry, 0]} scale={s}>
    <Block p={[0, 1.7, 0]} s={[2.5, 2.6, 12]} c="#F2B21E" />
    <Block p={[0, 0.5, 0]} s={[2.55, 0.25, 12.05]} c="#1A1820" line={0} />
    {Array.from({length: 8}).map((_, i) => (
      <Block key={i} p={[1.27, 2.3, -4.6 + i * 1.25]} s={[0.04, 0.9, 1.0]} c="#BFE3FF" e={0.15} line={0} />
    ))}
    <Block p={[0, 2.3, 6.02]} s={[2.2, 1.0, 0.04]} c="#BFE3FF" line={0} />
    {[-4, 4].map((z) =>
      [-1, 1].map((k) => <Part key={`${z}${k}`} shape="cyl" p={[k * 1.2, 0.5, z]} r={[0, 0, Math.PI / 2]} s={[1.0, 0.4, 1.0]} c="#1A1820" line={0.02} />),
    )}
  </group>
);

const Carrier: React.FC<{p: V3; s?: number}> = ({p, s = 1}) => (
  <group position={p} scale={s}>
    <Block p={[0, 0.4, 0]} s={[1.6, 0.8, 7]} c="#6E7682" line={0.015} />
    <Block p={[0.15, 0.82, 0]} s={[2.0, 0.06, 7.2]} c="#4A505A" line={0.015} />
    <Block p={[0.7, 1.25, 0.8]} s={[0.35, 0.8, 0.9]} c="#8A919C" line={0.015} />
    <Block p={[0.1, 0.86, 1.6]} s={[0.05, 0.01, 3.4]} c="#F6EFE3" line={0} />
  </group>
);

const Airliner: React.FC<{sink: number; f: number; pop: number}> = ({sink, f, pop}) => (
  <group position={[0, 2.6 - sink * 1.7, 0]} rotation={[0, -Math.PI / 2, sink * 0.04]}>
    {/* fuselage, nose, tail */}
    <Part shape="capsule" r={[Math.PI / 2, 0, 0]} s={[3.6, 34, 3.8]} c="#F2F4F8" line={0.06} />
    <Block p={[0, 3.6, -14.5]} s={[0.4, 5, 3.2]} r={[-0.35, 0, 0]} c="#2D8BEA" />
    <Block p={[0, 0.2, 1]} s={[30, 0.35, 4.2]} c="#DCE2EA" />
    <Block p={[0, 0.9, -14.5]} s={[10, 0.25, 2.2]} c="#DCE2EA" />
    {[-1, 1].map((k) => (
      <Part key={k} shape="cyl" p={[k * 6, -0.9, 2.2]} r={[Math.PI / 2, 0, 0]} s={[1.8, 3.4, 1.8]} c="#B8C0CC" line={0.04} />
    ))}
    {/* a stripe of windows with faces in them, facing the camera side (+x after the turn) */}
    {Array.from({length: 14}).map((_, i) => (
      <group key={i}>
        <Part shape="sphere" p={[1.82, 0.7, -11 + i * 1.6]} s={[0.05, 0.55, 0.45]} c="#1D3A5A" line={0} />
        {i % 2 === 0 ? <Part shape="sphere" p={[1.86, 0.62 + Math.sin(f / 5 + i) * 0.03, -11 + i * 1.6]} s={[0.04, 0.32, 0.32]} c={P.skin} line={0} /> : null}
      </group>
    ))}
    {/* landing gear: tyres squash flat as it sinks */}
    {[-9, 2, 4].map((z, i) => (
      <Part key={i} shape="cyl" p={[i === 0 ? 0 : (i === 1 ? -1.6 : 1.6), -2.0 + sink * 0.6, z]} r={[0, 0, Math.PI / 2]} s={[1.2, 0.6, 1.2 * (1 - pop * 0.7)]} c="#1A1820" line={0.03} />
    ))}
  </group>
);

/** A wooden chair, seat top at y 0.9. `burst` 0..1 throws its pieces outward and spins them. */
const Chair: React.FC<{p: V3; burst?: number; ry?: number}> = ({p, burst = 0, ry = 0}) => {
  const parts: {pos: V3; s: V3}[] = [
    {pos: [0, 0.86, 0], s: [0.9, 0.1, 0.9]},
    {pos: [0, 1.45, -0.42], s: [0.9, 1.1, 0.08]},
    {pos: [-0.38, 0.42, -0.38], s: [0.09, 0.84, 0.09]},
    {pos: [0.38, 0.42, -0.38], s: [0.09, 0.84, 0.09]},
    {pos: [-0.38, 0.42, 0.38], s: [0.09, 0.84, 0.09]},
    {pos: [0.38, 0.42, 0.38], s: [0.09, 0.84, 0.09]},
  ];
  return (
    <group position={p} rotation={[0, ry, 0]}>
      {parts.map((q, i) => {
        const t = burst * 1.2;
        const dir: V3 = [(rnd(i) - 0.5) * 7, 3 + rnd(i + 9) * 3, (rnd(i + 3) - 0.3) * 6];
        const pos: V3 = [q.pos[0] + dir[0] * t, Math.max(0.05, q.pos[1] + dir[1] * t - 9 * t * t), q.pos[2] + dir[2] * t];
        return <Block key={i} p={pos} s={q.s} c="#8A5A3A" r={[burst * (rnd(i + 5) - 0.5) * 9, burst * rnd(i + 7) * 6, burst * (rnd(i + 1) - 0.5) * 9]} line={0.025} />;
      })}
    </group>
  );
};

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

// ---------------------------------------------------------------- the scenes (frames are local to each scene)
export const CUTS = [0, wordAt('What') - 2, wordAt('Eight') - 2, wordAt("That's") - 2, wordAt('More') - 2, wordAt('A', 2) - 2, wordAt('Elevators') - 2, wordAt('Chairs') - 2, wordAt('And', 2) - 2, wordAt('You') - 2, wordAt('do') + 30];


// SH: the hook (a flash-forward): a very big Pip lowers onto a chair that is clearly not going to make it.
export const SH: React.FC<SceneProps> = ({f}) => {
  const law = wordAt('lawsuit');
  const sitP = prog(f, 0, 30);
  const strain = clamp((f - 10) / 25);
  const tremble = Math.sin(f * 2.1) * 0.03 * strain;
  const sh = shake(f, law, 0.08, 10);
  return (
    <>
      <Studio cell={1} />
      <Cam pos={[2.6 + sh[0], 1.7 + sh[1], lerp(5.6, 4.6, prog(f, 0, CUTS[1]))]} look={[0, 1.5, 0]} fov={44 - kick(f, law, 10) * 6} />
      <group rotation={[0, 0, tremble]} scale={[1 + strain * 0.08, 1 - strain * 0.1, 1 + strain * 0.08]}>
        <Chair p={[0, 0, 0]} ry={0.4} />
      </group>
      <Toon p={[0, lerp(0.9, 0.5, sitP), lerp(0.6, 0.1, sitP)]} ry={0.4} fat={2.1} sit={sitP} eyes={f < law ? 'side' : 'shock'} look_={0.7} mouth={f < law ? 'flat' : 'o'} sweat={clamp((f % 20) / 20) * strain} />
      {[0, 1, 2].map((i) => {
        const p = ((f + i * 9) % 26) / 26;
        return strain > 0.2 ? <Part key={i} shape="sphere" p={[-0.5 + i * 0.5, 0.7 - p * 0.6, 0.5]} s={[0.07, 0.1, 0.07]} c="#9FD8FF" line={0.01} o={1 - p} /> : null;
      })}
    </>
  );
};

// S0: the title. Pip stands on the grid; on "obese" he inflates.
export const S0: React.FC<SceneProps> = ({f}) => {
  const hit = wordAt('obese') + 2 - CUTS[1];
  const grow = springIn(f, hit, 16);
  const orbit = lerp(0.5, 0.2, prog(f, 0, CUTS[2] - CUTS[1]));
  const sh = shake(f, hit, 0.1, 12);
  return (
    <>
      <Studio cell={1} />
      <Cam pos={[Math.sin(orbit) * 7 + sh[0], 1.6 + sh[1], Math.cos(orbit) * 7]} look={[0, 1.9, 0]} fov={44 - kick(f, hit, 12) * 8} />
      <Toon p={[0, 0, 0]} ry={0.25} fat={lerp(1, 1.8, grow)} eyes={f < hit ? 'open' : 'shock'} mouth={f < hit ? 'flat' : 'o'} armOut={0.12 + grow * 0.5} squash={-0.06 * kick(f, hit, 6)} />
      <Burst p={[0, 1.4, 0]} f={f} f0={hit} />
    </>
  );
};

// S1: eight billion people, thirty kilos each: a crowd of Pips inflates in a wave from the front.
export const S1: React.FC<SceneProps> = ({f}) => {
  const wave = wordAt('Thirty') - CUTS[2];
  const rise = prog(f, 0, CUTS[3] - CUTS[2]);
  return (
    <>
      <Studio cell={1} fogFar={60} />
      <Cam pos={[0, lerp(7, 11, rise), lerp(9, 11, rise)]} look={[0, 0, -6]} fov={48} />
      {Array.from({length: 6}).map((_, r) =>
        Array.from({length: 5}).map((__, c) => {
          const i = r * 5 + c;
          const g = springIn(f, wave + r * 3 + c, 14);
          return <Toon key={i} look={i === 12 ? CAST.pip : CROWD[i % CROWD.length]} p={[(c - 2) * 2.2 + (r % 2) * 0.6, 0, -r * 2.6]} ry={(rnd(i) - 0.5) * 0.6} fat={lerp(1, 1.85, g)} eyes={g > 0.5 ? 'shock' : 'open'} mouth={g > 0.5 ? 'o' : 'flat'} armOut={0.12 + g * 0.5} />;
        }),
      )}
    </>
  );
};

// S2: almost 250 million tonnes of brand new human: a giant Pip towers over a school bus.
export const S2: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[4] - CUTS[3];
  const tilt = prog(f, 0, len);
  return (
    <>
      <Studio cell={4} fogFar={260} />
      <Cam pos={[34, 4, 70]} look={[0, lerp(10, 26, tilt), -6]} fov={50} />
      <Toon p={[-2, 0, -14]} ry={0.25} s={22} fat={1.9} eyes="side" look_={0.6} mouth="flat" />
      <Bus p={[9, 0, 4]} ry={-0.5} s={1.4} />
      <Toon p={[14, 0, 9]} ry={-0.6} s={1.4} fat={1} eyes="shock" mouth="o" armL={0.6} armR={0.6} />
    </>
  );
};

// S3: more than 2,300 aircraft carriers: rows of them to the horizon, the camera rising over them.
export const S3: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[5] - CUTS[4];
  const up = prog(f, 0, len);
  return (
    <>
      <Studio cell={4} fogFar={140} />
      <Cam pos={[0, lerp(10, 26, up), lerp(14, 20, up)]} look={[0, 0, -20]} fov={50} />
      {Array.from({length: 9}).map((_, r) =>
        Array.from({length: 7}).map((__, c) => <Carrier key={`${r}-${c}`} p={[(c - 3) * 3.4, 0, -r * 9.5]} s={1.15} />),
      )}
    </>
  );
};

// S4: a full airliner, five tonnes heavier: it sags onto the grid and the tyres burst.
export const S4: React.FC<SceneProps> = ({f}) => {
  const heavy = wordAt('heavier') - CUTS[5];
  const ground = wordAt('ground') - CUTS[5];
  const sink = springIn(f, heavy, 18) * 0.6 + prog(f, ground - 6, 8) * 0.4;
  const pop = clamp((f - (ground - 4)) / 4);
  const sh = shake(f, ground - 4, 0.25, 12);
  return (
    <>
      <Studio cell={4} fogFar={200} />
      <Cam pos={[8 + sh[0], 6 + sh[1], 50]} look={[0, 6, 0]} fov={50 - kick(f, ground - 4, 12) * 6} />
      <Airliner sink={sink} f={f} pop={pop} />
      <Burst p={[0, 0.4, 0]} f={f} f0={ground - 4} n={18} size={2.4} />
    </>
  );
};

// S5: elevators fit one person: the doors bonk him, again.
export const S5: React.FC<SceneProps> = ({f}) => {
  const cyc = (f % 22) / 22;
  const shut = Math.sin(Math.min(cyc, 0.5) * Math.PI) * (cyc < 0.5 ? 1 : 0);
  const gap = lerp(2.0, 1.4, shut);
  const bonk = cyc > 0.2 && cyc < 0.32;
  return (
    <>
      <Studio cell={1} />
      <Cam pos={[1.6, 2.4, 8]} look={[0, 2.2, 0]} fov={44} />
      <Block p={[0, 1.7, -0.9]} s={[2.6, 3.4, 1.6]} c="#E8D8B8" e={0.25} />
      <Block p={[0, 3.55, -0.05]} s={[3.1, 0.3, 0.3]} c="#9AA3B5" />
      <Block p={[-1.45, 1.7, -0.05]} s={[0.2, 3.4, 0.3]} c="#9AA3B5" />
      <Block p={[1.45, 1.7, -0.05]} s={[0.2, 3.4, 0.3]} c="#9AA3B5" />
      <Block p={[-gap / 2 - 0.35, 1.7, 0.05]} s={[0.7, 3.2, 0.08]} c="#B8C0CE" />
      <Block p={[gap / 2 + 0.35, 1.7, 0.05]} s={[0.7, 3.2, 0.08]} c="#B8C0CE" />
      <Toon p={[0, 0, -0.2]} fat={2.2} eyes={bonk ? 'shut' : 'open'} mouth={bonk ? 'wobble' : 'flat'} squash={bonk ? 0.06 : 0} />
    </>
  );
};

// S6: chairs just give up.
export const S6: React.FC<SceneProps> = ({f}) => {
  const boom = wordAt('give') - CUTS[7];
  const sitP = prog(f, 0, 8);
  const burst = clamp((f - boom) / 24);
  const drop = f > boom ? Math.min(1, (f - boom) / 5) : 0;
  const sh = shake(f, boom, 0.18, 12);
  return (
    <>
      <Studio cell={1} />
      <Cam pos={[3 + sh[0], 2.4 + sh[1], 6.5]} look={[0, 1.6, 0]} fov={44 - kick(f, boom, 12) * 10} />
      <Chair p={[0, 0, 0]} burst={burst} ry={0.4} />
      <Toon p={[0, 0.55 - drop * 0.85, 0.1]} ry={0.4} fat={1.9} sit={sitP} eyes={f < boom ? 'open' : 'dead'} mouth={f < boom ? 'flat' : 'open'} armOut={0.3 + drop * 0.8} />
      <Burst p={[0, 0.8, 0.2]} f={f} f0={boom} n={16} c="#C9A27A" />
    </>
  );
};

// S7: and the Earth gets heavier by 0.000000000004 percent. It doesn't notice. The studio sinks toward deep navy.
export const S7: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[9] - CUTS[8];
  const dark = prog(f, 0, len);
  const notice = wordAt('notice') - CUTS[8];
  return (
    <>
      <Studio dark={0.35 + dark * 0.55} cell={4} fogFar={200} />
      <Cam pos={[0, 3.5, lerp(27, 23, prog(f, 0, len))]} look={[0, 6.4, 0]} fov={44} />
      <group position={[0, 5.4, 0]} rotation={[0.2, f * 0.01, 0]}>
        <Part shape="sphere" s={[9, 9, 9]} c="#2F6FB0" line={0.08} />
        {Array.from({length: 10}).map((_, i) => {
          const a = rnd(i) * Math.PI * 2;
          const b = (rnd(i + 20) - 0.5) * 2.2;
          const r = 4.35;
          return <Part key={i} shape="sphere" p={[Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r]} s={[2.4 + rnd(i + 3) * 1.4, 0.6, 1.8 + rnd(i + 4) * 1.4]} r={[b, -a, 0]} c="#5E9A4E" line={0.03} />;
        })}
      </group>
      {/* its face, toward us: deadpan, one slow blink on "notice" */}
      <group position={[0, 5.6, 4.55]}>
        {[-1, 1].map((k) => (
          <group key={k}>
            <Part shape="sphere" p={[k * 1.0, 0.6, 0]} s={[0.55, f > notice && f < notice + 5 ? 0.06 : 0.8, 0.15]} c={P.face} line={0} />
            <Part shape="sphere" p={[k * 1.0 + 0.14, 0.82, 0.08]} s={[0.16, 0.16, 0.05]} c="#FFFFFF" e={0.6} line={0} />
            <Part shape="box" p={[k * 1.0, 1.15, 0]} s={[0.7, 0.12, 0.06]} c={P.face} line={0} />
          </group>
        ))}
        <Part shape="box" p={[0, -0.8, 0]} s={[1.1, 0.12, 0.06]} c={P.face} line={0} />
      </group>
      <Toon p={[0, 0, 5.5]} s={0.9} fat={1.8} ry={Math.PI} eyes="open" mouth="flat" />
    </>
  );
};

// S8: "You do." Pip turns to camera, deadpan, then sinks into the dark like the end of a dive.
export const S8: React.FC<SceneProps> = ({f}) => {
  const len = CUTS[10] - CUTS[9];
  const sink = prog(f, 14, len - 14);
  return (
    <>
      <Studio dark={0.9 + sink * 0.1} cell={1} fogFar={lerp(30, 6, sink)} />
      <Cam pos={[0, 2.1, lerp(3.4, 4.2, sink)]} look={[0, 2.0 - sink * 0.6, 0]} fov={40} />
      <pointLight position={[0.8, 3, 2.5]} intensity={lerp(10, 0, sink)} color="#9FC8FF" distance={8} />
      <Toon p={[0, -sink * 1.2, 0]} fat={1.8} eyes={f > 18 && f < 22 ? 'shut' : 'open'} mouth="flat" />
    </>
  );
};

export const SCENES = [SH, S0, S1, S2, S3, S4, S5, S6, S7, S8];
// Impacts, in global frames: flashes land here (the sound script reads its own list).
export const HITS = [wordAt('lawsuit'), wordAt('obese') + 2, wordAt('ground') - 4, wordAt('give') + 0];
