import React from 'react';
import './App.css';
import AnimatedAvatar from './components/AnimatedAvatar';
import LottieGallery from './components/LottieGallery';

function App() {
  return (
    <div className="App" style={{ padding: '20px', color: '#e8794b' }}>
      <h1>Fameshire MOMTV Cartoon Avatars</h1>
      <div style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
        <AnimatedAvatar name="Bob" />
        <AnimatedAvatar name="Sarah" />
        <AnimatedAvatar name="Mike" />
      </div>
      <h2>Sample Lottie Animations</h2>
      <LottieGallery />
    </div>
  );
}

export default App;
