import { useWindowDimensions } from 'react-native';

const BASE_WIDTH = 375;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const scale = (size: number) => Math.round((width / BASE_WIDTH) * size);
  const isSmallDevice = width < 375;
  const isTablet = width >= 768;

  return { width, height, scale, isSmallDevice, isTablet };
}
