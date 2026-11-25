export default function HeroArt() {
  const nails = [[92, 292, 46, 150, -8, 'n1'], [148, 252, 50, 195, -3, 'n2'], [208, 228, 54, 222, 0, 'n3'], [270, 252, 50, 195, 3, 'n2'], [326, 292, 46, 150, 8, 'n1']]
  const star = 'M0-14C2-4 4-2 14 0 4 2 2 4 0 14-2 4-4 2-14 0-4-2-2-4 0-14z'
  return (
    <svg viewBox="0 0 440 540" className="heroart" role="img" aria-label="Decorative illustration of painted nails">
      <defs>
        <linearGradient id="arch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbe9e5" /><stop offset="1" stopColor="#ecbdb6" /></linearGradient>
        <linearGradient id="n1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff8f4" /><stop offset="1" stopColor="#eab9b2" /></linearGradient>
        <linearGradient id="n2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fdf1e3" /><stop offset="1" stopColor="#d9b28c" /></linearGradient>
        <linearGradient id="n3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6d2cd" /><stop offset="1" stopColor="#bf7a74" /></linearGradient>
      </defs>
      <path d="M30 540V220C30 105 115 24 220 24s190 81 190 196v320z" fill="url(#arch)" />
      <path d="M52 540V222C52 118 128 46 220 46s168 72 168 176v318z" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2" />
      {nails.map(([x, y, w, h, r, g], i) => (
        <g key={i} transform={`rotate(${r} ${x + w / 2} ${y + h})`}>
          <path d={`M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}z`} fill={`url(#${g})`} />
          <ellipse cx={x + w * 0.3} cy={y + w * 0.6 + 14} rx={w * 0.08} ry={h * 0.2} fill="#fff" opacity=".6" />
        </g>
      ))}
      <path d="M30 470C120 440 320 440 410 470V540H30z" fill="#fbf1ea" />
      {[[110, 120, 1], [345, 150, 0.8], [378, 330, 0.6], [70, 360, 0.7]].map(([x, y, s], i) => (
        <path key={i} d={star} transform={`translate(${x} ${y}) scale(${s})`} fill={i % 2 ? '#d9b28c' : '#fff'} />
      ))}
    </svg>
  )
}
