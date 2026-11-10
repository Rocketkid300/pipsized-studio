import {Composition} from 'remotion';
import {DURATION, Short} from './Short';
import {Avatar} from './Avatar';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Short" component={Short} durationInFrames={DURATION} fps={30} width={1080} height={1920} />
    <Composition id="Avatar" component={Avatar} durationInFrames={1} fps={30} width={1080} height={1080} />
  </>
);
