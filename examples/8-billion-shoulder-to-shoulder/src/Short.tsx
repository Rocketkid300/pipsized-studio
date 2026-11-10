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
const TITLE = ['What if all 8 billion people', 'on Earth stood shoulder to', 'shoulder in one place?'];

// The big number per scene, centred under the title: a huge figure and a mustard label, each popping in on its word.
type Stat = {big: string | ((f: number) => string); label: string; at: number; labelAt?: number};
const STATS: Record<number, Stat> = {
  2: {big: '2,000 KM²', label: '4 PEOPLE PER M²', at: wordAt('two', 1), labelAt: wordAt('kilometres', 1)},
  3: {big: '45 KM WIDE', label: 'SMALLER THAN TOKYO', at: wordAt('forty'), labelAt: wordAt('Smaller')},
  4: {big: '400,000,000+', label: 'TONNES = 70 PYRAMIDS', at: wordAt('four', 2), labelAt: wordAt('Seventy')},
  5: {big: '22 KM', label: 'TO THE EDGE', at: wordAt('edge'), labelAt: wordAt('horizon')},
  6: {big: '~1 HOUR', label: 'PER MEXICAN WAVE', at: wordAt('hour'), labelAt: wordAt('across', 1)},
  7: {big: '9 HOURS', label: 'OF "EXCUSE ME"', at: wordAt('nine'), labelAt: wordAt('excuse')},
  8: {big: '99.999%', label: 'OF THE LAND: EMPTY', at: wordAt('rest'), labelAt: wordAt('empty')},
};

const pop = (f: number, at: number) => interpolate(f, [at, at + 5, at + 9], [0, 1.12, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const StatBlock: React.FC<{stat: Stat; f: number}> = ({stat, f}) => {
  const p = pop(f, stat.at);
  if (p <= 0) return null;
  const big = typeof stat.big === 'function' ? stat.big(f) : stat.big;
  const size = Math.min(190, 1000 / (big.length * 0.5));
  const lp = pop(f, stat.labelAt ?? stat.at + 4);
  return (
    <div style={{position: 'absolute', top: 380, width: '100%', textAlign: 'center'}}>
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
