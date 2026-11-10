import katex from 'katex';
import 'katex/dist/katex.min.css';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

// Palette (manim-style): one colour per quantity, everywhere.
const BG = '#0E0E10';
const WHITE = '#FFFFFF';
const GREY = '#888888';
const A_COL = '#58C4DD'; // a: cyan
const B_COL = '#83C167'; // b: green
const C_COL = '#F7D96F'; // c: yellow

// Figure geometry: outer square of side a + b, centred in the middle band.
const A = 240;
const B = 400;
const S = A + B;
const OX = (1920 - S) / 2;
const OY = 220;

type Pt = [number, number];

// The four triangles in the c² arrangement, and the translation that moves
// each one into the a² + b² arrangement.
const TRIANGLES: {pts: Pt[]; move: Pt}[] = [
  {pts: [[0, 0], [A, 0], [0, B]], move: [0, A]},
  {pts: [[S, 0], [S, A], [A, 0]], move: [0, 0]},
  {pts: [[S, S], [B, S], [S, A]], move: [-B, 0]},
  {pts: [[0, S], [0, B], [B, S]], move: [A, -B]},
];

const smooth = Easing.bezier(0.45, 0, 0.55, 1);

const useT = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return frame / fps;
};

// 0 → 1 over [t0, t0 + d] seconds, eased.
const prog = (t: number, t0: number, d: number) =>
  interpolate(t, [t0, t0 + d], [0, 1], {
    easing: smooth,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const poly = (pts: Pt[], dx = 0, dy = 0) =>
  pts.map(([x, y]) => `${x + dx},${y + dy}`).join(' ');

const Tex: React.FC<{
  tex: string;
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
}> = ({tex, x, y, color, size, opacity}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: 'translate(-50%, -50%)',
      color,
      fontSize: size,
      opacity,
      whiteSpace: 'nowrap',
    }}
    dangerouslySetInnerHTML={{__html: katex.renderToString(tex)}}
  />
);

export const PythagorasProof: React.FC = () => {
  const t = useT();

  // Scene 1: title and the first triangle.
  const title = prog(t, 0.0, 0.8);
  const tri1Draw = prog(t, 0.4, 1.0);
  const tri1Labels = prog(t, 1.4, 0.6);
  // Scene 2: outer square, the other triangles, then c².
  const outer = prog(t, 2.5, 0.8);
  const sideLabels = prog(t, 3.0, 0.5);
  const cSquare = prog(t, 4.6, 0.7);
  // Scene 4: rearrangement.
  const fadeC = prog(t, 6.3, 0.4);
  const slide = prog(t, 6.5, 2.0);
  const abSquares = prog(t, 8.5, 0.8);
  // Scene 5–6: caption and equation, then a pulse.
  const caption = prog(t, 9.5, 0.6);
  const pulse = interpolate(t, [12.0, 12.3, 12.7], [1, 1.08, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const eqTerms: {tex: string; color: string}[] = [
    {tex: 'a^2', color: A_COL},
    {tex: '+', color: WHITE},
    {tex: 'b^2', color: B_COL},
    {tex: '=', color: WHITE},
    {tex: 'c^2', color: C_COL},
  ];

  const cPts: Pt[] = [[A, 0], [S, A], [B, S], [0, B]];

  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      {/* Top band: title */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          width: '100%',
          textAlign: 'center',
          color: WHITE,
          fontFamily: 'Cambria, "Latin Modern Roman", "Times New Roman", serif',
          fontSize: 64,
          opacity: title,
          transform: `translateY(${(1 - title) * 12}px)`,
        }}
      >
        The Pythagorean Theorem
      </div>

      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <g transform={`translate(${OX}, ${OY})`}>
          {/* Outer square, side a + b */}
          <rect
            x={0}
            y={0}
            width={S}
            height={S}
            fill="none"
            stroke={GREY}
            strokeWidth={3}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - outer}
          />

          {/* c² square in the middle of the first arrangement */}
          <polygon
            points={poly(cPts)}
            fill={C_COL}
            fillOpacity={0.28 * cSquare * (1 - fadeC)}
            stroke={C_COL}
            strokeWidth={4}
            strokeOpacity={cSquare * (1 - fadeC)}
          />

          {/* a² and b² squares in the second arrangement */}
          <rect
            x={0}
            y={0}
            width={A}
            height={A}
            fill={A_COL}
            fillOpacity={0.28 * abSquares}
            stroke={A_COL}
            strokeWidth={4}
            strokeOpacity={abSquares}
          />
          <rect
            x={A}
            y={A}
            width={B}
            height={B}
            fill={B_COL}
            fillOpacity={0.28 * abSquares}
            stroke={B_COL}
            strokeWidth={4}
            strokeOpacity={abSquares}
          />

          {/* The four triangles */}
          {TRIANGLES.map((tri, i) => {
            const draw = i === 0 ? tri1Draw : prog(t, 3.3 + (i - 1) * 0.4, 0.7);
            const dx = tri.move[0] * slide;
            const dy = tri.move[1] * slide;
            return (
              <polygon
                key={i}
                points={poly(tri.pts, dx, dy)}
                fill={WHITE}
                fillOpacity={0.12 * draw}
                stroke={WHITE}
                strokeWidth={4}
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - draw}
              />
            );
          })}
        </g>
      </svg>

      {/* Labels on the first triangle (before the rearrangement) */}
      <Tex tex="a" x={OX + A / 2} y={OY + 36} color={A_COL} size={46} opacity={tri1Labels * (1 - outer)} />
      <Tex tex="b" x={OX + 34} y={OY + B / 2} color={B_COL} size={46} opacity={tri1Labels * (1 - outer)} />
      <Tex tex="c" x={OX + A / 2 + 26} y={OY + B / 2 + 18} color={C_COL} size={46} opacity={tri1Labels * (1 - outer)} />

      {/* Side labels on the outer square: the same in both arrangements */}
      <Tex tex="a" x={OX + A / 2} y={OY - 32} color={A_COL} size={44} opacity={sideLabels} />
      <Tex tex="b" x={OX + A + B / 2} y={OY - 32} color={B_COL} size={44} opacity={sideLabels} />
      <Tex tex="a" x={OX + S + 34} y={OY + A / 2} color={A_COL} size={44} opacity={sideLabels} />
      <Tex tex="b" x={OX + S + 34} y={OY + A + B / 2} color={B_COL} size={44} opacity={sideLabels} />

      {/* Area labels */}
      <Tex tex="c^2" x={OX + S / 2} y={OY + S / 2} color={C_COL} size={72} opacity={cSquare * (1 - fadeC)} />
      <Tex tex="a^2" x={OX + A / 2} y={OY + A / 2} color={A_COL} size={64} opacity={abSquares} />
      <Tex tex="b^2" x={OX + A + B / 2} y={OY + A + B / 2} color={B_COL} size={72} opacity={abSquares} />

      {/* Bottom band: caption and equation */}
      <div
        style={{
          position: 'absolute',
          top: 884,
          width: '100%',
          textAlign: 'center',
          color: GREY,
          fontFamily: 'Cambria, "Latin Modern Roman", "Times New Roman", serif',
          fontSize: 34,
          fontStyle: 'italic',
          opacity: caption,
        }}
      >
        same four triangles, same big square
      </div>
      <div
        style={{
          position: 'absolute',
          top: 940,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: 26,
          fontSize: 72,
          transform: `scale(${pulse})`,
        }}
      >
        {eqTerms.map((term, i) => {
          const p = prog(t, 10.0 + i * 0.3, 0.6);
          return (
            <span
              key={i}
              style={{
                color: term.color,
                opacity: p,
                transform: `translateY(${(1 - p) * 16}px)`,
                display: 'inline-block',
              }}
              dangerouslySetInnerHTML={{__html: katex.renderToString(term.tex)}}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
