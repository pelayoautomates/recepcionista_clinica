import type { CSSProperties } from "react";

type IconProps = {
  size?: number;
  style?: CSSProperties;
};

export function GoogleCalendarLogo({ size = 18, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <rect x="3" y="4" width="18" height="17" rx="3" fill="#ffffff" stroke="#d1d5db" />
      <rect x="3" y="4" width="18" height="5" rx="3" fill="#4285F4" />
      <rect x="3" y="7" width="18" height="2" fill="#4285F4" />
      <rect x="7" y="12" width="4" height="4" rx="1" fill="#34A853" />
      <circle cx="8" cy="4" r="1.2" fill="#EA4335" />
      <circle cx="16" cy="4" r="1.2" fill="#FBBC05" />
    </svg>
  );
}

export function WhatsAppLogo({ size = 18, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path
        d="M9.2 7.8c-.28-.62-.58-.64-.85-.65h-.73c-.25 0-.64.09-.98.45-.34.36-1.29 1.26-1.29 3.08s1.32 3.58 1.5 3.82c.18.24 2.58 4.14 6.36 5.65 3.13 1.25 3.77 1 4.45.94.68-.06 2.2-.9 2.52-1.78.31-.88.31-1.64.22-1.79-.09-.15-.34-.24-.73-.45-.39-.21-2.29-1.13-2.64-1.26-.35-.12-.61-.18-.86.21-.25.39-.98 1.26-1.2 1.52-.22.27-.44.3-.82.09-.38-.21-1.58-.62-3.01-2-.89-.86-1.49-1.92-1.66-2.24-.18-.33-.02-.5.13-.7.14-.19.31-.5.46-.76.15-.27.2-.45.3-.76.1-.3.05-.57-.03-.73-.09-.15-.78-1.93-1.08-2.57Z"
        fill="#ffffff"
      />
    </svg>
  );
}
