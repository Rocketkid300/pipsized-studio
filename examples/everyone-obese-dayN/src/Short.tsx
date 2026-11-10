import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {loadFont as loadTitle} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadMono} from '@remotion/google-fonts/IBMPlexMono';
import {CUTS, HITS, SCENES} from './scenes';

const {fontFamily: TITLE} = loadTitle('normal', {weights: ['600', '800'], subsets: ['latin']});
const {fontFamily: MONO} = loadMono('normal', {weights: ['600'], subsets: ['latin']});

const INK = '#121019';
const CREAM = '#F6EFE3';
const MUSTARD = '#F2B33D';

type Beat = {day?: string; stat?: string; pill?: string; lines: {at: number; text: string}[]; title?: boolean};

// One entry per scene: the captions over it. `at` is a frame inside the scene.
const BEATS: Beat[] = [
  {title: true, lines: [{at: 2, text: 'What if everyone became obese overnight?'}]},
  {day: 'Day 1', stat: 'CHAIRS LOST: ALL OF THEM', lines: [{at: 6, text: 'Every chair on Earth gives up.'}, {at: 42, text: 'At the same time.'}]},
  {day: 'Day 2', stat: 'MO: NEVER SEEN AGAIN', lines: [{at: 6, text: 'Elevators fit one person now.'}, {at: 44, text: 'Mo takes the stairs.'}]},
  {day: 'Day 5', stat: 'FLIGHTS DEPARTED: 0', lines: [{at: 6, text: 'Everyone buys two seats.'}, {at: 48, text: 'The plane does not take off.'}]},
  {day: 'Day 9', stat: '1 SWEATPANTS = 1 HOUSE', lines: [{at: 6, text: 'Sweatpants are the new currency.'}, {at: 46, text: 'Pip trades his house.'}]},
  {day: 'Day 14', stat: "EARTH'S MASS: +0.000000000004%", lines: [{at: 6, text: 'Earth is 240 million tonnes heavier.'}, {at: 62, text: 'Earth: "ok."'}]},
  {day: 'Day 30', stat: 'RICHEST MAN ALIVE: MO', lines: [{at: 6, text: 'Mo finally exits the stairwell.'}, {at: 50, text: 'He delivers food now. He’s a billionaire.'}]},
  {day: 'Day 31', stat: 'FLOORS LOST: ALSO ALL OF THEM', lines: [{at: 6, text: 'Scientists build an unbreakable chair.'}, {at: 66, text: 'The floor was not consulted.'}]},
];

const popIn = (f: number, at: number) =>
  interpolate(f, [at, at + 5, at + 9], [0, 1.08, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// The caption block in the top-left, inside YouTube's safe area (clear of the top bar and the right-hand buttons).
const Caption: React.FC<{beat: Beat}> = ({beat}) => {
  const f = useCurrentFrame();
  const shadow = `0 4px 0 ${INK}, 0 0 24px rgba(18,16,25,0.65)`;
  if (beat.title) {
    const s = popIn(f, 2);
    return (
      <div style={{position: 'absolute', top: 250, left: 70, right: 70, textAlign: 'center', fontFamily: TITLE, fontWeight: 800, fontSize: 96, lineHeight: 1.04, color: CREAM, textShadow: shadow, transform: `scale(${s})`, opacity: Math.min(1, s * 2)}}>
        {beat.lines[0].text.split(' ').map((w, i) => (
          <span key={i} style={{color: w.startsWith('obese') ? MUSTARD : CREAM}}>
            {w}{' '}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div style={{position: 'absolute', top: 210, left: 70, right: 170, color: CREAM}}>
      <div style={{fontFamily: TITLE, fontWeight: 800, fontSize: 120, lineHeight: 1, textShadow: shadow, transform: `scale(${popIn(f, 0)})`, transformOrigin: 'left center'}}>{beat.day}</div>
      <div style={{fontFamily: MONO, fontWeight: 600, fontSize: 38, letterSpacing: 2, marginTop: 14, color: MUSTARD, textShadow: shadow, opacity: popIn(f, 3)}}>{beat.stat}</div>
      <div style={{marginTop: 30, display: 'flex', flexDirection: 'column', gap: 14}}>
        {beat.lines.map((l, i) => {
          const s = popIn(f, l.at);
          return s > 0 ? (
            <div key={i} style={{alignSelf: 'flex-start', fontFamily: TITLE, fontWeight: 600, fontSize: 54, lineHeight: 1.15, background: i === beat.lines.length - 1 && i > 0 ? MUSTARD : 'rgba(18,16,25,0.78)', color: i === beat.lines.length - 1 && i > 0 ? INK : CREAM, padding: '10px 22px', borderRadius: 14, transform: `scale(${s})`, transformOrigin: 'left center'}}>
              {l.text}
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
};

// A one-frame white flash (then 35%) on every hit, the demo's impact grammar.
const Flash: React.FC = () => {
  const f = useCurrentFrame();
  const o = HITS.reduce((m, h) => Math.max(m, f === h ? 0.55 : f === h + 1 ? 0.2 : 0), 0);
  return o ? <AbsoluteFill style={{background: '#FFF3DC', opacity: o}} /> : null;
};

// A soft vignette and a fine grain, so the 3D sits in the demo's filmic finish.
const Grade: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(10,6,16,0.55) 100%)'}} />
      <AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9' seed='${Math.floor(f / 2) % 8}'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`}} />
    </>
  );
};

export const Short: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: INK}}>
      {SCENES.map((Scene, i) => (
        <Sequence key={i} from={CUTS[i]} durationInFrames={CUTS[i + 1] - CUTS[i]} name={`S${i}`}>
          <SceneFrame Scene={Scene} width={width} height={height} />
          <Caption beat={BEATS[i]} />
        </Sequence>
      ))}
      <Grade />
      <Flash />
    </AbsoluteFill>
  );
};

const SceneFrame: React.FC<{Scene: React.FC<{f: number}>; width: number; height: number}> = ({Scene, width, height}) => {
  const f = useCurrentFrame();
  return (
    <ThreeCanvas width={width} height={height} shadows gl={{antialias: true}}>
      <Scene f={f} />
    </ThreeCanvas>
  );
};
