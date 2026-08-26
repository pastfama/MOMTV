import React from 'react';
import './AnimatedAvatar.css';

export type AvatarName = 'Bob' | 'Sarah' | 'Mike';

interface Props {
  name: AvatarName;
  size?: number;
}

export const AnimatedAvatar: React.FC<Props> = ({ name, size = 64 }) => {
  switch (name) {
    case 'Bob':
      return (
        <svg className="avatar avatar-bob" width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="#E8794B" />
          <circle cx="32" cy="32" r="20" fill="#fff" />
          <circle className="eye" cx="24" cy="28" r="6" fill="#E8794B" />
          <circle className="eye" cx="40" cy="28" r="6" fill="#E8794B" />
          <rect x="28" y="40" width="8" height="4" rx="2" fill="#E8794B" />
          <line x1="32" y1="16" x2="32" y2="8" stroke="#fff" strokeWidth="2" />
          <circle cx="32" cy="8" r="2" fill="#fff" />
        </svg>
      );
    case 'Sarah':
      return (
        <svg className="avatar avatar-sarah" width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="#9146FF" />
          <ellipse cx="32" cy="32" rx="18" ry="22" fill="#fff" />
          <circle className="eye" cx="24" cy="28" r="5" fill="#9146FF" />
          <circle className="eye" cx="40" cy="28" r="5" fill="#9146FF" />
          <path d="M20 44 Q32 54 44 44" stroke="#9146FF" strokeWidth="3" fill="none" />
        </svg>
      );
    case 'Mike':
      return (
        <svg className="avatar avatar-mike" width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="#22C55E" />
          <circle cx="32" cy="32" r="18" fill="#fff" />
          <rect x="20" y="26" width="8" height="12" rx="4" fill="#22C55E" />
          <rect x="36" y="26" width="8" height="12" rx="4" fill="#22C55E" />
          <line x1="24" y1="20" x2="24" y2="12" stroke="#22C55E" strokeWidth="2" />
          <line x1="40" y1="20" x2="40" y2="12" stroke="#22C55E" strokeWidth="2" />
        </svg>
      );
  }
  return null;
};

export default AnimatedAvatar;
