import React from 'react';
// lottie-react has no default export — `Lottie` is a named export only.
import { Lottie, type LottieInstance } from 'lottie-react';

interface Props {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}

const LottieAnimation: React.FC<Props> = ({ animationData, loop = true, autoplay = true, width = 200, height = 200, style }) => {
  return (
    // lottie-react v3 sizes via the rendered element, so the box gets the size.
    <Lottie src={animationData as LottieInstance} loop={loop} autoplay={autoplay} style={{ width, height, ...style }} />
  );
};

export default LottieAnimation;
