import {Composition} from 'remotion';
import {Short} from './Short';

export const RemotionRoot: React.FC = () => (
  <Composition id="Short" component={Short} durationInFrames={900} fps={30} width={1080} height={1920} />
);
