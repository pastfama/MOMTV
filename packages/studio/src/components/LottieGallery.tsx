import React, { useEffect, useState } from 'react';
import LottieAnimation from './LottieAnimation';

const animations = [
  {
    name: 'Waving Hand',
    url: 'https://assets9.lottiefiles.com/packages/lf20_q5pk6p1k.json',
  },
  {
    name: 'Robot Assistant',
    url: 'https://assets3.lottiefiles.com/packages/lf20_85cgay55.json',
  },
  {
    name: 'Glowing Halo',
    url: 'https://assets8.lottiefiles.com/packages/lf20_dek4bpjg.json',
  },
  {
    name: 'Chat Bubbles',
    url: 'https://assets9.lottiefiles.com/packages/lf20_sei2mqar.json',
  },
  {
    name: 'Blinking Eyes',
    url: 'https://assets9.lottiefiles.com/packages/lf20_vnikrcia.json',
  },
];

const LottieGallery: React.FC = () => {
  const [animationDataList, setAnimationDataList] = useState<(object | null)[]>([]);

  useEffect(() => {
    async function fetchAnimations() {
      const loadedData = [];
      for (const anim of animations) {
        try {
          const resp = await fetch(anim.url);
          const json = await resp.json();
          loadedData.push(json);
        } catch {
          loadedData.push(null);
        }
      }
      setAnimationDataList(loadedData);
    }
    fetchAnimations();
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
      {animations.map((anim, i) =>
        animationDataList[i] ? (
          <div key={anim.name}>
            <h4 style={{ color: '#e8794b', fontWeight: 'bold' }}>{anim.name}</h4>
            <LottieAnimation animationData={animationDataList[i]!} width={200} height={200} />
          </div>
        ) : (
          <div key={anim.name}><i>Failed to load {anim.name} animation</i></div>
        )
      )}
    </div>
  );
};

export default LottieGallery;
