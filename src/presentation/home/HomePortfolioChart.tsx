export function HomePortfolioChart() {
  return (
    <div
      className="home-chart"
      role="img"
      aria-label="Illustrative portfolio value chart trending upward"
    >
      <svg viewBox="0 0 700 170" preserveAspectRatio="none">
        <defs>
          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#79eda1" stopOpacity=".22" />
            <stop offset="1" stopColor="#79eda1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 144 C28 141 32 134 54 139 S86 143 111 133 S140 136 162 128 S191 120 213 124 S243 117 266 101 S300 104 326 97 S351 107 379 89 S400 84 426 72 S456 83 478 72 S502 73 524 59 S550 68 570 51 S598 48 618 30 S650 26 670 15 S689 15 700 8 L700 170 L0 170Z"
          fill="url(#portfolioGradient)"
        />
        <path
          d="M0 144 C28 141 32 134 54 139 S86 143 111 133 S140 136 162 128 S191 120 213 124 S243 117 266 101 S300 104 326 97 S351 107 379 89 S400 84 426 72 S456 83 478 72 S502 73 524 59 S550 68 570 51 S598 48 618 30 S650 26 670 15 S689 15 700 8"
          fill="none"
          stroke="#8cf5a8"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
