import {Composition} from 'remotion';
import {PythagorasProof} from './PythagorasProof';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="PythagorasProof"
    component={PythagorasProof}
    durationInFrames={450}
    fps={30}
    width={1920}
    height={1080}
  />
);
