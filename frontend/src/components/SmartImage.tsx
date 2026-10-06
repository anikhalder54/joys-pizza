import { useState, type ImgHTMLAttributes } from 'react';

/** Image that falls back to a warm branded placeholder if the photo fails to load. */
const fallback = (label: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f7c66b"/><stop offset="1" stop-color="#c8412b"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#g)"/>
      <circle cx="200" cy="130" r="54" fill="#fff3d6" opacity=".9"/>
      <circle cx="200" cy="130" r="44" fill="#d6452f"/>
      <circle cx="186" cy="118" r="7" fill="#8f1d14"/><circle cx="214" cy="126" r="7" fill="#8f1d14"/><circle cx="196" cy="146" r="7" fill="#8f1d14"/>
      <text x="200" y="230" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#fff">${label
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')}</text>
    </svg>`,
  );

export default function SmartImage({
  alt = '',
  src,
  fallbackLabel,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement> & { fallbackLabel?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      loading="lazy"
      {...rest}
      alt={alt}
      src={failed || !src ? fallback(fallbackLabel ?? alt) : src}
      onError={() => setFailed(true)}
    />
  );
}
