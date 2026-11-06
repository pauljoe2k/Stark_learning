import React from 'react';
import { motion } from 'framer-motion';

export function MasteryRing({ 
  value = 0, 
  size = 56, 
  strokeWidth = 5, 
  animate = true,
  className = ""
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  let strokeColor = "hsl(var(--danger))";
  let textColor = "text-danger";
  if (value >= 75) {
    strokeColor = "hsl(var(--success))";
    textColor = "text-success";
  } else if (value >= 50) {
    strokeColor = "hsl(var(--primary))";
    textColor = "text-primary";
  } else if (value >= 25) {
    strokeColor = "hsl(var(--warning))";
    textColor = "text-warning";
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-muted"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Fill */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: animate ? 1 : 0, ease: "easeOut" }}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <span className={`absolute text-xs font-bold font-mono tracking-tighter ${textColor}`}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

