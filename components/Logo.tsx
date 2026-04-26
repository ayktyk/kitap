import React from 'react';

interface Props {
  size?: number;
  className?: string;
  /** Arka plan radius'unu kapatir (sadece kitap yiginini gosterir). */
  bare?: boolean;
}

/**
 * Kitapligim PWA logosu - public/icon.svg dosyasinin React inline karsiligi.
 * Tema rengine duyarli degildir; her zaman kendi krem zemini ve kahverengi
 * cilt tonlariyla render edilir. Boylece koyu/acik temalarda da kimligi sabit kalir.
 */
const Logo: React.FC<Props> = ({ size = 32, className = '', bare = false }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Kitaplığım logosu"
    >
      {!bare && <rect width="512" height="512" rx="96" fill="#f5efe7" />}
      <g transform="translate(96 112)">
        {/* Cilt 1 — koyu krem */}
        <rect x="0" y="8" width="52" height="280" rx="6" fill="#8c5e58" />
        <rect x="8" y="40" width="36" height="4" fill="#f5efe7" opacity="0.5" />
        <rect x="8" y="240" width="36" height="4" fill="#f5efe7" opacity="0.5" />

        {/* Cilt 2 — acik kahve */}
        <rect x="62" y="32" width="48" height="256" rx="6" fill="#a67c76" />
        <rect x="70" y="60" width="32" height="3" fill="#f5efe7" opacity="0.5" />
        <rect x="70" y="250" width="32" height="3" fill="#f5efe7" opacity="0.5" />

        {/* Cilt 3 — koyu kahve */}
        <rect x="120" y="16" width="56" height="272" rx="6" fill="#6b4540" />
        <rect x="128" y="48" width="40" height="4" fill="#f5efe7" opacity="0.5" />
        <rect x="128" y="248" width="40" height="4" fill="#f5efe7" opacity="0.5" />

        {/* Cilt 4 — toz pembesi */}
        <rect x="186" y="48" width="46" height="240" rx="6" fill="#c19a91" />
        <rect x="194" y="74" width="30" height="3" fill="#ffffff" opacity="0.4" />
        <rect x="194" y="254" width="30" height="3" fill="#ffffff" opacity="0.4" />

        {/* Cilt 5 — egik */}
        <g transform="translate(240 80) rotate(8)">
          <rect x="0" y="0" width="60" height="208" rx="6" fill="#8c5e58" />
          <rect x="8" y="28" width="44" height="4" fill="#f5efe7" opacity="0.5" />
          <rect x="8" y="172" width="44" height="4" fill="#f5efe7" opacity="0.5" />
        </g>

        {/* Raf */}
        <rect x="-8" y="290" width="336" height="12" rx="3" fill="#6b4540" />
      </g>
    </svg>
  );
};

export default Logo;
