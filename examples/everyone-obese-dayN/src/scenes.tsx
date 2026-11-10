// The eight beats. Each scene draws from its own frame `f` (0 at its first frame), so it renders the same every time.
import React from 'react';
import {Block, Cam, CAST, CROWD, DuskSky, Fog, Light, P, Part, TextSign, Toon, V3, clamp, ease, easeOut, kick, lerp, prog, rnd, shake, springIn} from './kit';

type SceneProps = {f: number};

// ---------------------------------------------------------------- shared sets
/** An interior corner: floor, back wall with a dusk window, a left wall, a skirting line. */
const Room: React.FC<{wall?: string; floor?: string; side?: string; window_?: boolean; w?: number; d?: number}> = ({
  wall = '#4A3A5C',
  floor = '#6B4A3A',
  side = '#3C2F4C',
  window_ = true,
  w = 12,
  d = 10,
}) => (
  <group>
    <Block p={[0, -0.05, 0]} s={[w, 0.1, d]} c={floor} line={0} />
    {Array.from({length: 10}).map((_, i) => (
      <Block key={i} p={[-w / 2 + (i + 0.5) * (w / 10), 0.005, 0]} s={[0.02, 0.01, d]} c="#4E3428" line={0} />
    ))}
    <Block p={[0, 3, -d / 2]} s={[w, 6, 0.2]} c={wall} line={0} />
    <Block p={[-w / 2, 3, 0]} s={[0.2, 6, d]} c={side} line={0} />
    <Block p={[0, 0.12, -d / 2 + 0.12]} s={[w, 0.24, 0.06]} c="#2A2036" line={0} />
    {window_ ? (
      <group position={[1.6, 2.6, -d / 2 + 0.12]}>
        <Block p={[0, 0, 0]} s={[2.4, 2.0, 0.05]} c="#F2985A" e={1.1} line={0} />
        <Block p={[0, 0.5, 0.02]} s={[2.4, 1.0, 0.04]} c="#8A4A7A" e={0.8} line={0} />
        <Part shape="sphere" p={[0.4, -0.35, 0.05]} s={[0.6, 0.6, 0.02]} c={P.sun} e={1.6} line={0} />
        <Block p={[0, 0, 0.06]} s={[0.08, 2.0, 0.06]} c="#2A2036" line={0} />
        <Block p={[0, 0, 0.06]} s={[2.4, 0.08, 0.06]} c="#2A2036" line={0} />
        <Block p={[0, 1.04, 0.06]} s={[2.6, 0.12, 0.12]} c="#2A2036" line={0} />
        <Block p={[0, -1.04, 0.1]} s={[2.6, 0.12, 0.25]} c="#2A2036" line={0} />
        <pointLight position={[0, 0, 1.2]} color={P.warm} intensity={6} distance={8} decay={1.6} />
      </group>
    ) : null}
  </group>
);

/** A wooden chair, seat top at y 0.9. `burst` 0..1 throws its pieces outward and spins them. */
const Chair: React.FC<{p: V3; burst?: number; c?: string; ry?: number; steel?: boolean}> = ({p, burst = 0, c = '#8A5A3A', ry = 0, steel = false}) => {
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
        return <Block key={i} p={pos} s={q.s} c={steel ? '#9AA3B5' : c} r={[burst * (rnd(i + 5) - 0.5) * 9, burst * rnd(i + 7) * 6, burst * (rnd(i + 1) - 0.5) * 9]} line={0.025} />;
      })}
    </group>
  );
};

/** Splinters and dust puffs bursting from a point. */
const Burst: React.FC<{p: V3; f: number; f0: number; n?: number; c?: string}> = ({p, f, f0, n = 14, c = '#C9A27A'}) => {
  if (f < f0) return null;
  const t = (f - f0) / 30;
  if (t > 1) return null;
  return (
    <group position={p}>
      {Array.from({length: n}).map((_, i) => {
        const a = rnd(i) * Math.PI * 2;
        const v = 2 + rnd(i + 2) * 3;
        return <Part key={i} shape="sphere" p={[Math.cos(a) * v * t, rnd(i + 4) * 2 * t - 2 * t * t, Math.sin(a) * v * t * 0.6]} s={[0.25 * (1 - t), 0.25 * (1 - t), 0.25 * (1 - t)]} c={c} line={0.01} />;
      })}
    </group>
  );
};

// ---------------------------------------------------------------- S0: the title: he wakes up and inflates
export const S0: React.FC<SceneProps> = ({f}) => {
  const grow = springIn(f, 38, 16);
  const fat = lerp(1, 1.75, grow);
  const sink = 0.12 * clamp(grow);
  const k = kick(f, 38, 12);
  const sh = shake(f, 38, 0.12, 12);
  return (
    <>
      <DuskSky />
      <Light key_={[5, 6, 3]} keyI={2.6} fill={1.3} />
      <Cam pos={[0.8 + sh[0], 3.6 + sh[1], lerp(8.2, 7.2, prog(f, 0, 90))]} look={[0, 2.4, -1]} fov={40 - k * 8} />
      <Room />
      {/* the bed */}
      <Block p={[0, 0.3, -1]} s={[2.4, 0.6, 3.6]} c="#3A2A44" />
      <Block p={[0, 0.7 - sink, -1]} s={[2.2, 0.3 - sink, 3.4]} c={P.skin} />
      <Block p={[0, 1.4, -2.75]} s={[2.4, 1.6, 0.18]} c="#3A2A44" />
      <Part shape="sphere" p={[0, 1.0 - sink, -2.3]} s={[1.3, 0.35, 0.6]} c="#E9E2F0" line={0.02} />
      {/* Pip sitting up in bed, the duvet over his legs */}
      <Toon p={[0, 0.25 - sink, -1.8]} fat={fat} sit={1} eyes={f < 18 ? 'shut' : f < 38 ? 'open' : 'shock'} mouth={f < 38 ? 'flat' : 'open'} armOut={0.2 + grow * 0.4} squash={-0.08 * kick(f, 38, 6)} />
      <Block p={[0, 0.95 - sink, -0.4]} s={[2.3, 0.3 + grow * 0.25, 2.2]} c={P.shoe} />
      {/* nightstand and lamp */}
      <Block p={[-2, 0.45, -2.4]} s={[0.8, 0.9, 0.8]} c="#5A3E30" />
      <Part shape="cyl" p={[-2, 1.2, -2.4]} s={[0.4, 0.5, 0.4]} c={P.mustard} e={0.8} line={0.02} />
      <pointLight position={[-2, 1.6, -2]} color={P.warm} intensity={4} distance={6} />
      <Burst p={[0, 1.6, -1.6]} f={f} f0={38} c={P.skin} />
    </>
  );
};

// ---------------------------------------------------------------- S1: Day 1: the chair explodes
export const S1: React.FC<SceneProps> = ({f}) => {
  const sitP = prog(f, 14, 14);
  const boom = 40;
  const burst = clamp((f - boom) / 26);
  const drop = f > boom ? Math.min(1, (f - boom) / 6) : 0;
  const k = kick(f, boom, 14);
  const sh = shake(f, boom, 0.18, 12);
  return (
    <>
      <DuskSky />
      <Light key_={[5, 6, 4]} />
      <Cam pos={[3.2 + sh[0], 2.6 + sh[1], 7]} look={[0, 2.0, 0]} fov={42 - k * 10} />
      <Room />
      <Chair p={[0, 0, 0]} burst={burst} ry={0.4} />
      <Toon
        p={[0, lerp(0, 0.55, sitP) - drop * 0.85, lerp(0.6, 0.1, sitP)]}
        ry={0.4}
        fat={1.8}
        sit={sitP}
        eyes={f < boom ? 'open' : f < boom + 30 ? 'dead' : 'shock'}
        mouth={f < boom ? 'smile' : 'open'}
        armOut={0.3 + drop * 0.8}
        squash={0.15 * kick(f, boom + 6, 8)}
      />
      <Burst p={[0, 0.8, 0.2]} f={f} f0={boom} n={18} />
      <Part shape="cyl" p={[3.4, 0.1, -2]} s={[0.6, 0.2, 0.6]} c="#7A9A5A" line={0.02} />
      <Part shape="sphere" p={[3.4, 0.7, -2]} s={[0.9, 1.1, 0.9]} c="#4A7A4A" line={0.02} />
    </>
  );
};

// ---------------------------------------------------------------- S2: Day 2: the elevator bonks him, Mo takes the stairs
export const S2: React.FC<SceneProps> = ({f}) => {
  // the doors slide shut, hit his belly, bounce back open: three times
  const cyc = (f % 34) / 34;
  const shut = Math.sin(Math.min(cyc, 0.5) * Math.PI) * (cyc < 0.5 ? 1 : 0);
  const gap = lerp(1.25, 0.78, shut);
  const bonk = cyc > 0.22 && cyc < 0.3;
  const moTurn = prog(f, 40, 10);
  const moWalk = clamp((f - 50) / 50);
  return (
    <>
      <DuskSky />
      <Light key_={[3, 7, 6]} />
      <Cam pos={[-1.2, 3.0, 12]} look={[-1.2, 3.0, 0]} fov={46} />
      {/* lobby wall and floor */}
      <Block p={[0, -0.05, 0]} s={[14, 0.1, 10]} c="#5A4A62" line={0} />
      <Block p={[0, 3, -1]} s={[14, 6, 0.2]} c="#6E5A7A" line={0} />
      {/* the elevator: a lit cabin, its frame, its doors */}
      <Block p={[0.3, 1.6, -1.6]} s={[2.4, 3.2, 1.2]} c="#E8D8B8" e={0.35} line={0} />
      <pointLight position={[0.3, 2.8, -1.2]} color="#FFE7B3" intensity={4} distance={5} />
      <Block p={[0.3, 3.35, -0.85]} s={[2.9, 0.3, 0.3]} c="#9AA3B5" />
      <Block p={[-1.05, 1.6, -0.85]} s={[0.2, 3.2, 0.3]} c="#9AA3B5" />
      <Block p={[1.65, 1.6, -0.85]} s={[0.2, 3.2, 0.3]} c="#9AA3B5" />
      <Block p={[0.3 - gap / 2 - 0.3, 1.6, -0.82]} s={[0.6, 3.0, 0.08]} c="#B8C0CE" />
      <Block p={[0.3 + gap / 2 + 0.3, 1.6, -0.82]} s={[0.6, 3.0, 0.08]} c="#B8C0CE" />
      <Toon p={[0.3, 0, -0.95]} fat={1.9} eyes={bonk ? 'shut' : 'open'} mouth={bonk ? 'wobble' : 'flat'} squash={bonk ? 0.06 : 0} />
      <TextSign p={[0.3, 3.85, -0.88]} w={2.2} h={0.5} lines={['MAX: 1 PERSON']} bg="#A8323E" fg="#F6EFE3" glow={0.5} />
      {/* the stairs door on the left */}
      <Block p={[-3.3, 1.4, -0.88]} s={[1.4, 2.8, 0.1]} c="#3A3046" />
      <TextSign p={[-3.3, 3.1, -0.85]} w={1.2} h={0.35} lines={['STAIRS']} bg="#2FB7A6" fg="#121019" glow={0.4} />
      {/* Mo, watching, then away into the stairwell */}
      <Toon
        look={CAST.mo}
        p={[lerp(-2.0, -3.3, moWalk), 0, lerp(0.6, -0.6, moWalk)]}
        ry={lerp(0.3, -2.2, moTurn)}
        fat={1.7}
        legL={Math.sin(f * 0.6) * 0.5 * (moWalk > 0 && moWalk < 1 ? 1 : 0)}
        legR={-Math.sin(f * 0.6) * 0.5 * (moWalk > 0 && moWalk < 1 ? 1 : 0)}
        eyes="side"
        look_={-0.8}
        mouth="flat"
      />
    </>
  );
};

// ---------------------------------------------------------------- S3: Day 5: two seats each, the plane goes nowhere
export const S3: React.FC<SceneProps> = ({f}) => {
  const z = lerp(4.5, 2.8, prog(f, 0, 105));
  return (
    <>
      <DuskSky />
      <Fog c="#2A1E3A" near={6} far={22} />
      <Light key_={[4, 6, 8]} />
      <ambientLight intensity={0.6} />
      {[-2, -6, -10].map((z) => <pointLight key={z} position={[0, 2.4, z]} color="#FFE7B3" intensity={3} distance={6} />)}
      <Cam pos={[0, 2.1, z]} look={[0, 1.3, -6]} fov={52} />
      <Block p={[0, -0.05, -6]} s={[5, 0.1, 22]} c="#3A3550" line={0} />
      <Block p={[0, 0.0, -6]} s={[0.9, 0.02, 22]} c="#A8323E" line={0} />
      <Block p={[0, 3.3, -6]} s={[5, 0.2, 22]} c="#6E6478" line={0} />
      {[-1, 1].map((k) => (
        <group key={k}>
          <Block p={[k * 2.5, 1.6, -6]} s={[0.2, 3.4, 22]} c="#D8CFC2" line={0} />
          <Block p={[k * 1.75, 2.85, -6]} s={[1.3, 0.45, 22]} c="#CFC5B6" />
          {Array.from({length: 7}).map((_, i) => (
            <Block key={i} p={[k * 2.39, 1.9, -i * 2.4]} s={[0.04, 0.6, 0.45]} c={P.horizon} e={1.1} line={0} />
          ))}
        </group>
      ))}
      {Array.from({length: 6}).map((_, row) =>
        [-1, 1].map((k) => {
          const zr = -row * 2.4 + 0.6;
          const who = CROWD[(row * 2 + (k > 0 ? 1 : 0)) % CROWD.length];
          return (
            <group key={`${row}${k}`}>
              {[0, 1].map((s) => (
                <group key={s}>
                  <Block p={[k * (1.05 + s * 0.6), 0.55, zr]} s={[0.56, 0.2, 0.6]} c="#2E4A7A" />
                  <Block p={[k * (1.05 + s * 0.6), 1.1, zr - 0.32]} s={[0.56, 1.1, 0.14]} c="#2E4A7A" />
                </group>
              ))}
              <Toon look={row === 0 && k < 0 ? CAST.pip : who} p={[k * 1.35, 0.1, zr + 0.05]} fat={2.0} sit={1} eyes={row === 0 && k < 0 ? 'side' : 'open'} look_={row === 0 && k < 0 ? 0.8 : 0} mouth="flat" />
            </group>
          );
        }),
      )}
    </>
  );
};

// ---------------------------------------------------------------- S4: Day 9: the sweatpants, and a house for them
export const S4: React.FC<SceneProps> = ({f}) => {
  const offer = prog(f, 20, 16);
  const orbit = lerp(-0.25, 0.15, prog(f, 0, 105));
  const cam: V3 = [Math.sin(orbit) * 8, 2.6, Math.cos(orbit) * 8];
  return (
    <>
      <DuskSky />
      <Fog c="#1A1426" near={7} far={20} />
      <Light key_={[-4, 7, 3]} keyI={1.6} fill={1.0} />
      <Cam pos={cam} look={[0, 2.2, 0]} fov={44} />
      <Block p={[0, -0.05, 0]} s={[16, 0.1, 16]} c="#2A2236" line={0} />
      {/* the pedestal under a spotlight */}
      <Part shape="cyl" p={[0.9, 0.55, -0.6]} s={[1.3, 1.1, 1.3]} c="#E6DED2" line={0.025} />
      <spotLight position={[0.9, 6, 0.6]} angle={0.35} penumbra={0.5} intensity={60} color="#FFE7B3" castShadow target-position={[0.9, 1, -0.6]} />
      {/* the sweatpants, floating and turning */}
      <group position={[0.9, 1.75 + Math.sin(f / 8) * 0.06, -0.6]} rotation={[0, f * 0.03, 0]} scale={1.3}>
        <Block p={[0, 0.45, 0]} s={[0.9, 0.2, 0.4]} c="#C9C4D8" />
        <Block p={[-0.22, -0.05, 0]} s={[0.36, 0.9, 0.36]} c="#C9C4D8" />
        <Block p={[0.22, -0.05, 0]} s={[0.36, 0.9, 0.36]} c="#C9C4D8" />
        <Part shape="cyl" p={[0.1, 0.45, 0.21]} r={[0, 0, 0.3]} s={[0.03, 0.3, 0.03]} c={P.mustard} line={0.01} />
      </group>
      <TextSign p={[0.9, 0.7, 0.07]} w={1.1} h={0.42} lines={['1 PAIR', '= 1 HOUSE']} bg="#F6EFE3" fg="#A8323E" />
      {/* Pip kneeling, holding out a house */}
      <Toon p={[-0.8, -0.35, 0.8]} ry={0.7} fat={1.9} sit={1} armL={offer * 1.4} armR={offer * 1.4} armOut={0.05} eyes="glint" mouth="o" />
      <group position={[-0.2 + offer * 0.25, 1.15, 1.2]} rotation={[0, 0.7, 0]} scale={0.8 * offer}>
        <Block p={[0, 0, 0]} s={[0.5, 0.4, 0.45]} c="#F6EFE3" />
        <Block p={[0, 0.3, 0]} s={[0.56, 0.22, 0.5]} c="#A8323E" r={[0, 0, 0]} />
        <Block p={[0.08, -0.06, 0.23]} s={[0.12, 0.22, 0.02]} c="#5A3E30" line={0} />
      </group>
      {/* the crowd pressed up behind */}
      {Array.from({length: 7}).map((_, i) => (
        <Toon key={i} look={CROWD[i % CROWD.length]} p={[-4 + i * 1.3, 0, -3.6 - (i % 2) * 0.8]} ry={0.1 * (rnd(i) - 0.5)} fat={1.8} eyes="glint" mouth={i % 2 ? 'open' : 'o'} armL={0.6 + rnd(i) * 0.6} armR={0.4} />
      ))}
    </>
  );
};

// ---------------------------------------------------------------- S5: Day 14: Earth, unbothered
export const S5: React.FC<SceneProps> = ({f}) => {
  const say = springIn(f, 62, 12);
  return (
    <>
      <DuskSky night />
      <ambientLight intensity={0.25} />
      <directionalLight position={[6, 3, 5]} intensity={2.6} color="#FFE7B3" />
      <Cam pos={[0, 0.3, lerp(10, 8.6, prog(f, 0, 110))]} look={[0, 0.4, 0]} fov={40} />
      {/* stars */}
      {Array.from({length: 80}).map((_, i) => (
        <Part key={i} shape="sphere" p={[(rnd(i) - 0.5) * 40, (rnd(i + 50) - 0.5) * 50, -20 - rnd(i + 99) * 10]} s={[0.08, 0.08, 0.08]} c="#FFFFFF" e={2} line={0} />
      ))}
      <group rotation={[0.2, f * 0.012, 0]} position={[0, 0, 0]}>
        <Part shape="sphere" s={[5, 5, 5]} c="#2F6FB0" line={0.06} />
        {Array.from({length: 9}).map((_, i) => {
          const a = rnd(i) * Math.PI * 2;
          const b = (rnd(i + 20) - 0.5) * 2.2;
          const r = 2.42;
          return <Part key={i} shape="sphere" p={[Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r]} s={[1.3 + rnd(i + 3), 0.4, 1.0 + rnd(i + 4)]} r={[b, -a, 0]} c="#5E9A4E" line={0.02} />;
        })}
      </group>
      {/* its face, always toward us: deadpan */}
      <group position={[0, 0.2, 2.5]}>
        {[-1, 1].map((k) => (
          <group key={k}>
            <Part shape="sphere" p={[k * 0.55, 0.35, 0]} s={[0.32, 0.46, 0.1]} c={P.face} line={0} />
            <Part shape="sphere" p={[k * 0.55 + 0.08, 0.47, 0.05]} s={[0.1, 0.1, 0.04]} c="#FFFFFF" e={0.6} line={0} />
            <Part shape="box" p={[k * 0.55, 0.62, 0]} s={[0.4, 0.07, 0.05]} c={P.face} line={0} />
          </group>
        ))}
        <Part shape="box" p={[0, -0.45, 0]} s={[0.6, 0.07, 0.05]} c={P.face} line={0} />
      </group>
      {say > 0 ? <TextSign p={[2.6, 2.6, 2.6]} w={1.4 * say} h={0.8 * say} lines={['ok.']} bg="#F6EFE3" fg="#121019" /> : null}
    </>
  );
};

// ---------------------------------------------------------------- S6: Day 30: Mo, thin, a billionaire delivery rider
export const S6: React.FC<SceneProps> = ({f}) => {
  const orbit = lerp(0.5, -0.3, prog(f, 0, 125));
  const cam: V3 = [Math.sin(orbit) * 8.5, 1.0, Math.cos(orbit) * 8.5];
  const ride = f * 0.02;
  return (
    <>
      <DuskSky />
      <Fog c="#6E3A6E" near={10} far={40} />
      <Light key_={[-6, 4, 2]} keyI={2.8} keyC="#FFC07A" fill={0.8} />
      <Cam pos={cam} look={[0, 2.6, 0]} fov={46} />
      <Block p={[0, -0.05, 0]} s={[40, 0.1, 12]} c="#2E2838" line={0} />
      {Array.from({length: 8}).map((_, i) => (
        <Block key={i} p={[((i * 4 - ride * 20) % 32) - 16, 0.01, 1.5]} s={[1.6, 0.02, 0.15]} c="#F2B33D" line={0} />
      ))}
      {/* the skyline behind, lit windows */}
      {Array.from({length: 12}).map((_, i) => {
        const h = 4 + rnd(i) * 9;
        return (
          <group key={i}>
            <Block p={[-18 + i * 3.2, h / 2, -9 - rnd(i + 3) * 4]} s={[2.6, h, 2.6]} c="#2A1B45" line={0} />
            {Array.from({length: 6}).map((__, j) =>
              rnd(i * 10 + j) > 0.5 ? <Block key={j} p={[-18 + i * 3.2 + (j % 2 ? 0.5 : -0.5), 1 + j * (h / 7), -7.65 - rnd(i + 3) * 4]} s={[0.4, 0.5, 0.05]} c={P.warm} e={1.4} line={0} /> : null,
            )}
          </group>
        );
      })}
      {/* the scooter */}
      <group position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {[-0.9, 0.9].map((z) => (
          <Part key={z} shape="cyl" p={[0, 0.35, z]} r={[0, 0, Math.PI / 2]} s={[0.7, 0.2, 0.7]} c="#1A1820" line={0.02} />
        ))}
        <Block p={[0, 0.6, 0]} s={[0.5, 0.3, 1.9]} c="#E2672E" />
        <Block p={[0, 1.1, 0.95]} s={[0.12, 1.0, 0.12]} c="#9AA3B5" />
        <Block p={[0, 1.6, 0.95]} s={[0.9, 0.08, 0.08]} c="#1A1820" />
        {/* the delivery box and the cash, stacked high */}
        <Block p={[0, 1.15, -0.7]} s={[0.9, 0.8, 0.8]} c={P.mustard} />
        {Array.from({length: 6}).map((_, i) => (
          <Block key={i} p={[(rnd(i) - 0.5) * 0.3, 1.7 + i * 0.32, -0.95 + (rnd(i + 2) - 0.5) * 0.3]} s={[0.85, 0.28, 0.6]} c="#5E9A4E" r={[0, rnd(i + 5) * 0.6, 0]} />
        ))}
      </group>
      <Toon look={CAST.mo} p={[0, 0.45, 0]} ry={Math.PI / 2} fat={0.85} sit={0.8} armL={1.2} armR={1.2} eyes="glint" mouth="smile" />
      {Array.from({length: 10}).map((_, i) => {
        const t = ((f + i * 9) % 60) / 60;
        return <Part key={i} shape="box" p={[-1 - t * 4, 2 + rnd(i) * 3 - t, (rnd(i + 1) - 0.5) * 3]} r={[t * 6, t * 4, 0]} s={[0.5, 0.02, 0.25]} c="#7BB86A" line={0.01} />;
      })}
      <pointLight position={[1.5, 3, 2]} color="#FFD27A" intensity={8} distance={8} />
    </>
  );
};

// ---------------------------------------------------------------- S7: Day 31: the chair holds. The floor doesn't.
export const S7: React.FC<SceneProps> = ({f}) => {
  const sitP = prog(f, 8, 14);
  const crack = 64;
  const fall = f > crack ? Math.pow((f - crack) / 30, 2) * 9 : 0;
  const k = kick(f, crack, 14);
  const sh = shake(f, crack, 0.2, 14);
  const look: V3 = [0, lerp(1.1, -2.5, clamp((f - crack) / 40)), 0];
  return (
    <>
      <DuskSky />
      <Light key_={[5, 6, 4]} />
      <Cam pos={[3.2 + sh[0], 3.0 + sh[1] + clamp((f - crack) / 40) * 1.5, 7]} look={[look[0], look[1] + 0.9, look[2]]} fov={42 - k * 10} />
      <group>
        {/* the floor, with a square that gives way under the chair */}
        <Block p={[-3.5, -0.05, 0]} s={[5, 0.1, 10]} c="#6B4A3A" line={0} />
        <Block p={[3.5, -0.05, 0]} s={[5, 0.1, 10]} c="#6B4A3A" line={0} />
        <Block p={[0, -0.05, -3.4]} s={[2, 0.1, 3.2]} c="#6B4A3A" line={0} />
        <Block p={[0, -0.05, 3.4]} s={[2, 0.1, 3.2]} c="#6B4A3A" line={0} />
        <Block p={[0, -6, 0]} s={[2, 0.1, 3.6]} c="#0A0810" line={0} />
        <Block p={[0, 3, -5]} s={[12, 6, 0.2]} c="#4A3A5C" line={0} />
        <Block p={[-6, 3, 0]} s={[0.2, 6, 10]} c="#3C2F4C" line={0} />
        <group position={[0, -fall, 0]} rotation={[fall * 0.05, 0, fall * 0.03]}>
          <Block p={[0, -0.05, 0]} s={[2, 0.1, 3.6]} c="#6B4A3A" line={0.02} />
          <Chair p={[0, 0, 0]} ry={0.4} steel />
          <TextSign p={[0.18, 1.45, -0.32]} r={[0, 0.4, 0]} w={0.8} h={0.22} lines={['UNBREAKABLE']} bg="#121019" fg="#2FB7A6" glow={0.8} />
          <Toon
            p={[0, lerp(0, 0.55, sitP), lerp(0.6, 0.1, sitP)]}
            ry={0.4}
            fat={1.8}
            sit={sitP}
            eyes={f < 30 ? 'open' : f < crack ? 'shut' : 'shock'}
            mouth={f < crack ? 'smile' : 'open'}
            armOut={f < crack ? 0.2 : 1.2}
          />
        </group>
      </group>
      <Burst p={[0, 0.1, 0]} f={f} f0={crack} n={20} c="#8A6A5A" />
    </>
  );
};

export const SCENES = [S0, S1, S2, S3, S4, S5, S6, S7];
// Where each scene starts and how long it runs, in frames.
export const CUTS = [0, 90, 205, 315, 420, 525, 635, 760, 900];
// The hits (impacts) in global frames: camera kicks, flashes and impact sounds land here.
export const HITS = [38, 90 + 40, 205 + 8, 205 + 42, 205 + 76, 760 + 64];
export {ease, easeOut};
