import {Config} from '@remotion/cli/config';

// No GPU on this machine: render WebGL in software.
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(2);
