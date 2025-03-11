declare module 'react-native-waveform' {
  type ViewProps = import('react-native').ViewProps;
  
  interface WaveformProps extends ViewProps {
    waveColor?: string;
    barWidth?: number;
    barSpace?: number;
  }
  
  export const Waveform: React.FC<WaveformProps>;
} 