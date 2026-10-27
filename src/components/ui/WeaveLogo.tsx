import React from 'react';

interface WeaveLogoProps {
  className?: string;
  markOnly?: boolean;
}

/**
 * Original custom geometric SVG mark suggesting interconnected academic records
 * and woven verification lines. Never uses external or government emblems.
 */
export const WeaveLogo: React.FC<WeaveLogoProps> = ({
  className = '',
  markOnly = false,
}) => {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1.5"
          y="1.5"
          width="21"
          height="21"
          rx="3.5"
          stroke="#244C3A"
          strokeWidth="1.5"
          fill="#F7F6F2"
        />
        {/* Woven horizontal and vertical record threads */}
        <path
          d="M5.5 8.5H18.5M5.5 15.5H18.5"
          stroke="#20241F"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
        <path
          d="M8.5 5.5V18.5M15.5 5.5V18.5"
          stroke="#244C3A"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
        {/* Intersection verification nodes */}
        <rect x="7" y="7" width="3" height="3" fill="#244C3A" />
        <rect x="14" y="14" width="3" height="3" fill="#244C3A" />
        <rect x="14" y="7" width="3" height="3" fill="#20241F" />
        <rect x="7" y="14" width="3" height="3" fill="#20241F" />
      </svg>
      {!markOnly && (
        <span className="font-display font-bold tracking-tight text-[#20241F] text-lg leading-none">
          WEAVE
        </span>
      )}
    </span>
  );
};
