'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import './HeroCarousel.css';

const slides = [
  { image: 'surpresa', title: 'Riso na linha. Surpresa na caixa.', kicker: 'Diversão em cada chamada', description: 'Escolha um roteiro e prepare uma surpresa divertida.', action: 'Escolher meu trote' },
  { image: 'palco', title: 'Uma ligação. Muitas risadas.', kicker: 'A diversão está na linha', description: 'Roteiros com personalidade para surpreender com bom humor.', action: 'Explorar os trotes' },
  { image: 'conexao', title: 'Conecte a chamada. Solte a risada.', kicker: 'Uma conexão com o bom humor', description: 'Escolha seu roteiro e acompanhe cada surpresa.', action: 'Conhecer os roteiros' }
];

function readMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const reducedMotion = useSyncExternalStore(subscribeMotion, readMotion, () => true);
  const rotating = playing && !reducedMotion;

  useEffect(() => {
    if (!rotating || hovered) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [rotating, hovered]);

  function select(index: number) {
    setPlaying(false);
    setActive((index + slides.length) % slides.length);
  }

  return (
    <section className="tb-carousel" aria-label="Conheça o TroteBox" aria-roledescription="carrossel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => { if (!(event.target instanceof HTMLButtonElement && event.target.classList.contains('tb-carousel-play'))) setPlaying(false); }}>
      <h1 className="tb-carousel-sr">TroteBox — Riso na linha. Surpresa na caixa.</h1>
      <div className="tb-carousel-slides" aria-live={rotating ? 'off' : 'polite'}
        onTouchStart={(event) => { const point = event.touches[0]; if (!point) return; touch.current = { x: point.clientX, y: point.clientY }; }}
        onTouchCancel={() => { touch.current = null; }}
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const point = event.changedTouches[0];
          if (!point) return;
          const dx = point.clientX - start.x;
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(point.clientY - start.y)) select(active + (dx < 0 ? 1 : -1));
        }}>
        {slides.map((slide, index) => (
          <div key={slide.image} className="tb-carousel-slide" hidden={index !== active}
            role="group" aria-roledescription="slide" aria-label={`${index + 1} de ${slides.length}`}>
            <div className="tb-carousel-copy">
              <span className="tb-carousel-kicker">{slide.kicker}</span>
              <h2>{slide.title}</h2>
              <p>{slide.description}</p>
              <a className="button primary" href="#experiencias">{slide.action} <span aria-hidden="true">→</span></a>
            </div>
            <div className="tb-carousel-art" aria-hidden="true">
              <Image src={`/brand/hero-${slide.image}.webp`} alt="" width={1536} height={1024}
                sizes="(max-width: 600px) 950px, 1100px" priority={index === 0} />
            </div>
          </div>
        ))}
      </div>
      <div className="tb-carousel-controls">
        <button type="button" onClick={() => select(active - 1)} aria-label="Banner anterior">←</button>
        <div className="tb-carousel-dots" aria-label="Escolher banner">
          {slides.map((slide, index) => <button type="button" key={slide.image} aria-label={`Banner ${index + 1}: ${slide.title}`}
            aria-current={index === active ? 'true' : undefined} onClick={() => select(index)}><span /></button>)}
        </div>
        <button type="button" onClick={() => select(active + 1)} aria-label="Próximo banner">→</button>
        <button type="button" className="tb-carousel-play" disabled={reducedMotion} onClick={() => setPlaying(!playing)} aria-label={rotating ? 'Pausar carrossel' : 'Iniciar carrossel'}>{rotating ? 'Pausar' : 'Reproduzir'}</button>
      </div>
    </section>
  );
}
