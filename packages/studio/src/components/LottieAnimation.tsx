import React from 'react';
import Lottie from 'lottie-react';

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
    <div style={{ width, height, ...style }}>
      <Lottie animationData={animationData} loop={loop} autoplay={autoplay} />
    </div>
  );
};

export default LottieAnimation;
