import React from 'react';
import iaitLogoImg from '../assets/images/iait_logo_1790330364001.jpg';

interface IaitLogoProps {
  className?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const IaitLogo: React.FC<IaitLogoProps> = ({
  className = '',
  alt = 'IAIT Official Institutional Logo - Icon Academy of Information Technology, Kaliabor',
  size = 'md',
}) => {
  const sizeMap = {
    xs: 'h-7 w-7 min-w-[28px]',
    sm: 'h-8 w-8 min-w-[32px]',
    md: 'h-10 w-10 min-w-[40px]',
    lg: 'h-14 w-14 min-w-[56px]',
    xl: 'h-20 w-20 min-w-[80px]',
  };

  const chosenSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden bg-white shadow-xs border border-[#d9e2ff] flex items-center justify-center p-0.5 ${chosenSize} ${className}`}
    >
      <img
        src={iaitLogoImg}
        alt={alt}
        className="w-full h-full object-contain rounded-full select-none"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== '/iaitlogo.png') {
            target.src = '/iaitlogo.png';
          }
        }}
      />
    </div>
  );
};

export default IaitLogo;
