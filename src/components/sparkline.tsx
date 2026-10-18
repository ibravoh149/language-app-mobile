import Svg, { Polyline } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/** The prototype's `Spark`: a small trend line of recent values. */
export function Sparkline({ data, width = 62, height = 22 }: { data: number[]; width?: number; height?: number }) {
  const theme = useTheme();
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - 2 - (v / max) * (height - 4)}`)
    .join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={theme.accentBright} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
