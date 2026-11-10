import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Cam, P, Part, Toon} from './kit';

// The channel's profile picture: Pip, close and cute, waving, on the studio blue. YouTube crops it to a circle, so
// the face sits in the middle with room around it.
export const Avatar: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 42%, #5FB2FF 0%, #2D8BEA 55%, #1C63C2 100%)'}}>
    <ThreeCanvas width={1080} height={1080} gl={{antialias: true, alpha: true}}>
      <hemisphereLight args={['#FFFFFF', '#1B5FB0', 1.9]} />
      <directionalLight position={[3, 5, 6]} intensity={2.4} color="#FFFFFF" />
      <directionalLight position={[-4, 2, -3]} intensity={1.4} color={P.mustard} />
      <Cam pos={[0, 1.98, 2.55]} look={[0, 1.8, 0]} fov={42} />
      <Toon p={[0, 0, 0]} fat={1.25} eyes="open" mouth="smile" blush={1} headTilt={0.07} armR={2.6} armOut={0.5} look_={0} />
      {[[-0.95, 2.55, 0.3], [1.05, 2.35, 0.2], [-0.8, 1.2, 0.4]].map(([x, y, z], i) => (
        <Part key={i} shape="sphere" p={[x, y, z]} s={[0.09, 0.09, 0.09]} c="#FFFFFF" e={1.2} line={0} />
      ))}
    </ThreeCanvas>
  </AbsoluteFill>
);
