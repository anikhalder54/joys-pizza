import { useCallback, useEffect, useState } from 'react';
import { HERO_SLIDES } from '../data/menu';
import { Link } from '../lib/router';
import { ChevronLeft, ChevronRight } from './Icons';
import SmartImage from './SmartImage';

const INTERVAL = 5500;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = HERO_SLIDES.length;

  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), INTERVAL);
    return () => clearInterval(t);
  }, [paused, n]);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured dishes"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(index - 1);
        if (e.key === 'ArrowRight') go(index + 1);
      }}
    >
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.title}
          className={`hero-slide ${i === index ? 'active' : ''}`}
          aria-hidden={i !== index}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${n}`}
        >
          <SmartImage src={s.image} alt={s.title} fallbackLabel="" loading={i === 0 ? 'eager' : 'lazy'} />
          <div className="hero-overlay" />
          <div className="container hero-content">
            <span className="eyebrow">{s.eyebrow}</span>
            <h1>{s.title}</h1>
            <p>{s.text}</p>
            <div className="hero-ctas">
              <Link to="/menu" className="btn btn-primary btn-lg" tabIndex={i === index ? 0 : -1}>
                Order Now
              </Link>
              <Link to="/menu" className="btn btn-ghost btn-lg" tabIndex={i === index ? 0 : -1}>
                View Menu
              </Link>
            </div>
          </div>
        </div>
      ))}

      <button className="hero-arrow left" onClick={() => go(index - 1)} aria-label="Previous slide">
        <ChevronLeft width={26} height={26} />
      </button>
      <button className="hero-arrow right" onClick={() => go(index + 1)} aria-label="Next slide">
        <ChevronRight width={26} height={26} />
      </button>

      <div className="hero-dots" role="tablist">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.title}
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to slide ${i + 1}`}
            className={i === index ? 'active' : ''}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}
