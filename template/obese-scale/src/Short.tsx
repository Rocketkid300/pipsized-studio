import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMont} from '@remotion/google-fonts/Montserrat';
import {CUTS, HITS, SCENES, wordAt} from './scenes';
import words from './words.json';

const {fontFamily: BIG} = loadAnton('normal', {weights: ['400'], subsets: ['latin']});
const {fontFamily: SANS} = loadInter('normal', {weights: ['800'], subsets: ['latin']});
const {fontFamily: CAP} = loadMont('normal', {weights: ['900'], subsets: ['latin']});
const FPS = 30;

// The title pinned at the top once the hook is over, like the reference's caption slot.
const TITLE = ['What if everyone got', 'obese overnight?'];

// The big number per scene, centred under the title: a huge figure and a mustard label, each popping in on its word.
type Stat = {big: string | ((f: number) => string); label: string; at: number; labelAt?: number};
const STATS: Record<number, Stat> = {
  2: {big: '8,000,000,000', label: '+30 KG EACH', at: wordAt('Eight'), labelAt: wordAt('Thirty')},
  3: {big: '246,000,000', label: 'TONNES OF NEW HUMAN', at: wordAt('two', 1), labelAt: wordAt('tonnes', 1)},
  4: {big: '2,300+', label: 'AIRCRAFT CARRIERS', at: wordAt('two', 2), labelAt: wordAt('aircraft')},
  5: {big: '+5.4 TONNES', label: 'STILL ON THE GROUND', at: wordAt('five'), labelAt: wordAt('ground')},
  6: {big: 'CAPACITY: 1', label: 'ELEVATORS', at: wordAt('one')},
  7: {big: 'CHAIRS LEFT: 0', label: 'WORLDWIDE', at: wordAt('give')},
  8: {big: (f) => earthDigits(f), label: "EARTH'S MASS", at: wordAt('zero', 1), labelAt: wordAt('Earth', 2)},
};

// "+0.000000000004%", built up as the narrator says each digit.
const earthDigits = (f: number) => {
  const W = words as {w: string; s: number}[];
  const start = W.findIndex((x) => x.w === 'zero');
  let out = '+';
  for (let i = start; i < W.length; i++) {
    if (W[i].s * FPS > f) break;
    if (W[i].w === 'zero') out += '0';
    else if (W[i].w === 'point') out += '.';
    else if (W[i].w === 'four') out += '4';
    else if (W[i].w === 'percent') out += '%';
    else break;
  }
  return out;
};

const pop = (f: number, at: number) => interpolate(f, [at, at + 5, at + 9], [0, 1.12, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const StatBlock: React.FC<{stat: Stat; f: number}> = ({stat, f}) => {
  const p = pop(f, stat.at);
  if (p <= 0) return null;
  const big = typeof stat.big === 'function' ? stat.big(f) : stat.big;
  const size = Math.min(190, 1000 / (big.length * 0.5));
  const lp = pop(f, stat.labelAt ?? stat.at + 4);
  return (
    <div style={{position: 'absolute', top: 330, width: '100%', textAlign: 'center'}}>
      <div style={{fontFamily: BIG, fontSize: size, lineHeight: 1, color: '#FFFFFF', transform: `scale(${p})`, textShadow: '0 8px 0 rgba(0,25,70,0.35), 0 0 30px rgba(0,25,70,0.35)', whiteSpace: 'nowrap'}}>{big}</div>
      {lp > 0 ? (
        <div style={{display: 'inline-block', marginTop: 14, fontFamily: BIG, fontSize: 64, letterSpacing: 3, color: '#121019', background: '#F2B33D', padding: '4px 26px', borderRadius: 14, transform: `scale(${lp}) rotate(-2deg)`}}>{stat.label}</div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------- word-by-word captions
// The narration in chunks of up to three words (a new chunk after any pause), the spoken word in mustard and
// popping. They sit in the middle band: clear of the meme line, the side strips and YouTube's bottom UI.
type W = {w: string; s: number; e: number};
const CHUNKS: W[][] = (() => {
  const out: W[][] = [];
  let cur: W[] = [];
  (words as W[]).forEach((x, i, all) => {
    const gap = i > 0 ? x.s - all[i - 1].e : 0;
    if (cur.length && (cur.length >= 3 || gap > 0.22)) {
      out.push(cur);
      cur = [];
    }
    cur.push(x);
  });
  if (cur.length) out.push(cur);
  return out;
})();

const Captions: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const i = CHUNKS.findIndex((c, k) => t >= c[0].s - 0.04 && t < (CHUNKS[k + 1]?.[0].s ?? c[c.length - 1].e + 0.6) - 0.04);
  if (i < 0) return null;
  const chunk = CHUNKS[i];
  const enter = interpolate(t, [chunk[0].s - 0.04, chunk[0].s + 0.08], [0.82, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', top: 1150, left: 90, right: 90, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '6px 34px', transform: `scale(${enter})`}}>
      {chunk.map((x, k) => {
        const on = t >= x.s - 0.03 && t < x.e + 0.05;
        const pop = on ? interpolate(t, [x.s - 0.03, x.s + 0.06], [1.0, 1.04], {extrapolateRight: 'clamp'}) : 1;
        return (
          <span
            key={k}
            style={{
              display: 'inline-block',
              fontFamily: CAP,
              fontWeight: 900,
              fontSize: 86,
              lineHeight: 1.05,
              textTransform: 'uppercase',
              color: on ? '#F2B33D' : '#FFFFFF',
              WebkitTextStroke: '14px #0B0A12',
              paintOrder: 'stroke fill',
              textShadow: '0 8px 0 rgba(11,10,18,0.9)',
              transform: `scale(${pop}) rotate(${on ? -2 : 0}deg)`,
            }}
          >
            {x.w}
          </span>
        );
      })}
    </div>
  );
};

const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const scene = CUTS.findIndex((c, i) => f >= c && f < CUTS[i + 1]);
  const stat = STATS[scene];
  const outline = [-3, 0, 3].flatMap((x) => [-3, 0, 3].map((y) => `${x}px ${y}px 0 #000`)).join(', ');
  return (
    <>
      {stat ? <StatBlock stat={stat} f={f} /> : null}
      <Captions f={f} />
      {scene >= 1 ? (
        <div style={{position: 'absolute', top: 150, width: '100%', textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 54, lineHeight: 1.12, color: '#FFFFFF', textShadow: outline, opacity: pop(f, CUTS[1])}}>
          {TITLE.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      ) : null}
    </>
  );
};

const Flash: React.FC = () => {
  const f = useCurrentFrame();
  const o = HITS.reduce((m, h) => Math.max(m, f === h ? 0.5 : f === h + 1 ? 0.18 : 0), 0);
  return o ? <AbsoluteFill style={{background: '#FFFFFF', opacity: o}} /> : null;
};

const SceneFrame: React.FC<{Scene: React.FC<{f: number}>}> = ({Scene}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} shadows gl={{antialias: true}}>
      <Scene f={f} />
    </ThreeCanvas>
  );
};

export const Short: React.FC = () => (
  <AbsoluteFill style={{background: '#050C1E'}}>
    {SCENES.map((Scene, i) => (
      <Sequence key={i} from={CUTS[i]} durationInFrames={CUTS[i + 1] - CUTS[i]} name={`S${i}`}>
        <SceneFrame Scene={Scene} />
      </Sequence>
    ))}
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,10,30,0.4) 100%)'}} />
    <Overlay />
    <Flash />
  </AbsoluteFill>
);

export const DURATION = CUTS[CUTS.length - 1];
