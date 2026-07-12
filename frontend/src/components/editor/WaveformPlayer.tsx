import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformPlayerProps {
  audioUrl: string;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({ audioUrl }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (waveformRef.current) {
      // Инициализация WaveSurfer
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4F46E5', // Цвет волны
        progressColor: '#312E81', // Цвет проигранной части
        cursorColor: '#EF4444',
        height: 100,
        normalize: true,
      });

      wavesurfer.current.load(audioUrl);

      wavesurfer.current.on('play', () => setIsPlaying(true));
      wavesurfer.current.on('pause', () => setIsPlaying(false));
    }

    return () => {
      // Очистка при размонтировании компонента
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  return (
    <div className="w-full bg-gray-50 p-4 rounded-lg shadow">
      {/* Контейнер для отрисовки волны */}
      <div ref={waveformRef} className="mb-4"></div>
      
      {/* Панель управления воспроизведением */}
      <div className="flex justify-center space-x-4">
        <button 
          onClick={handlePlayPause}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {isPlaying ? 'Пауза' : 'Воспроизведение'}
        </button>
      </div>
    </div>
  );
};