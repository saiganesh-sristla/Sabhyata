import React from "react";

interface BookingBtnProps {
  width?: number;
  height?: number;
  className?: string;
  onClick: (e: React.MouseEvent) => void;
  isSubmitting: boolean;
  disabled: boolean;
}

const BookingBtn = ({
  width = 250,
  height = 70,
  className = "",
  onClick,
  isSubmitting,
  disabled,
}: BookingBtnProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isSubmitting}
      className={`focus:outline-none ${disabled || isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"} ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 320 100"
        className={`-ml-3 ${className}`}
      >
        <defs>
          <mask id="scallopMask">
            <rect width="320" height="75" fill="white" />
            {/* fewer scallops with more gap */}
            <circle cx="320" cy="14" r="10" fill="black" />
            <circle cx="320" cy="38" r="10" fill="black" />
            <circle cx="320" cy="62" r="10" fill="black" />
          </mask>
        </defs>

        {/* Ticket background */}
        <rect
          width="320"
          height="100"
          fill="#972a3d"
          mask="url(#scallopMask)"
        />

        {/* White separator line */}
        <rect x="300" y="0" width="3" height="75" fill="white" />

        {/* Centered text with more X padding */}
        <text
          x="100"
          y="45"
          textAnchor="middle"
          fontSize="26"
          fontWeight="bold"
          fill="white"
          fontFamily="sans-serif"
        >
          {isSubmitting ? "PROCESSING..." : "BOOK NOW"}
        </text>
      </svg>
    </button>
  );
};

export default BookingBtn;