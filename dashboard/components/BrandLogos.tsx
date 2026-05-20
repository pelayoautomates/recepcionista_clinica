import type { CSSProperties } from "react";

export function MetaLogo({ size = 18, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <path d="M6.918 3C4.758 3 3 4.758 3 6.918v10.164C3 19.242 4.758 21 6.918 21h10.164C19.242 21 21 19.242 21 17.082V6.918C21 4.758 19.242 3 17.082 3H6.918Z" fill="#0866FF"/>
      <path d="M12 7.5c-2.485 0-4.5 2.015-4.5 4.5s2.015 4.5 4.5 4.5 4.5-2.015 4.5-4.5S14.485 7.5 12 7.5Zm0 7.4a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8Z" fill="white"/>
      <circle cx="16.8" cy="7.2" r="1" fill="white"/>
    </svg>
  );
}

export function OpenAILogo({ size = 18, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <rect width="24" height="24" rx="6" fill="#10a37f"/>
      <path d="M12 5.5a3.5 3.5 0 0 0-3.19 2.06A3 3 0 0 0 6.5 11a3 3 0 0 0 .46 1.6A3.5 3.5 0 0 0 8.5 18.5h7a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-.81-2.23A3 3 0 0 0 18.5 11a3 3 0 0 0-2.31-2.94A3.5 3.5 0 0 0 12 5.5Z" fill="white" opacity="0.9"/>
    </svg>
  );
}

export function TelnyxLogo({ size = 18, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <rect width="24" height="24" rx="6" fill="#00C2A8"/>
      <path d="M7 8h10M12 8v8M9.5 13l2.5 3 2.5-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function StripeLogo({ size = 18, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <rect width="24" height="24" rx="6" fill="#635BFF"/>
      <path d="M11.5 9.5c0-.83.67-1.2 1.75-1.2 1.56 0 3.54.5 3.54.5V6.4s-1.97-.57-3.97-.57C10.08 5.83 8 7.1 8 9.67c0 4.83 6.67 4.05 6.67 6.12 0 .98-.85 1.3-2 1.3-1.7 0-3.9-.7-3.9-.7v2.45s2.15.7 4.2.7c3.2 0 5.4-1.25 5.4-3.9-.02-5.22-6.87-4.27-6.87-6.14Z" fill="white"/>
    </svg>
  );
}

type IconProps = {
  size?: number;
  style?: CSSProperties;
};

export function GoogleCalendarLogo({ size = 18, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <path d="M18.67 2H5.33A3.33 3.33 0 0 0 2 5.33v13.34A3.33 3.33 0 0 0 5.33 22h13.34A3.33 3.33 0 0 0 22 18.67V5.33A3.33 3.33 0 0 0 18.67 2Z" fill="#ffffff" />
      <path d="M18.67 2H5.33A3.33 3.33 0 0 0 2 5.33V8h20V5.33A3.33 3.33 0 0 0 18.67 2Z" fill="#4285F4" />
      <path d="M16.5 11.5H7.5V20h9v-8.5Z" fill="#ffffff" />
      <path d="M12 19.1c2.52 0 4.57-2.05 4.57-4.57S14.52 9.95 12 9.95a4.57 4.57 0 1 0 0 9.14Z" fill="#34A853" />
      <path d="M13.88 12.55h-1.44c-.51 0-.93.43-.93.94v1.66h2.37a2.57 2.57 0 0 1-2.59 2.11c-1.4 0-2.54-1.14-2.54-2.54 0-1.4 1.14-2.54 2.54-2.54.55 0 1.05.17 1.46.47l.8-.8a3.73 3.73 0 0 0-2.26-.76 3.78 3.78 0 0 0 0 7.56c2.18 0 3.74-1.53 3.74-3.69 0-.25-.03-.43-.07-.64Z" fill="#ffffff" />
      <path d="M6.3 1.4v3M17.7 1.4v3" stroke="#EA4335" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2 8h20" stroke="#D2E3FC" strokeWidth="0.8" />
      <path d="M18.67 2H5.33A3.33 3.33 0 0 0 2 5.33v13.34A3.33 3.33 0 0 0 5.33 22h13.34A3.33 3.33 0 0 0 22 18.67V5.33A3.33 3.33 0 0 0 18.67 2Z" stroke="#DADCE0" strokeWidth="0.8" />
    </svg>
  );
}

export function WhatsAppLogo({ size = 18, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <path d="M20.52 3.48A11.9 11.9 0 0 0 12.03 0C5.4 0 0 5.4 0 12.03c0 2.12.55 4.2 1.6 6.03L0 24l6.12-1.56a11.96 11.96 0 0 0 5.9 1.5h.01c6.63 0 12.03-5.4 12.03-12.03 0-3.2-1.25-6.2-3.54-8.43Z" fill="#25D366" />
      <path
        d="M19.07 4.92A9.84 9.84 0 0 0 12.04 2c-5.48 0-9.94 4.46-9.94 9.94 0 1.75.46 3.48 1.32 5L2 22l5.2-1.36a9.87 9.87 0 0 0 4.8 1.23h.01c5.48 0 9.94-4.46 9.94-9.94 0-2.66-1.04-5.17-2.88-7.01Zm-7.04 15.27h-.01a8.17 8.17 0 0 1-4.17-1.14l-.3-.18-3.08.81.82-3-.2-.31a8.16 8.16 0 0 1-1.25-4.33c0-4.5 3.67-8.16 8.18-8.16a8.1 8.1 0 0 1 5.78 2.4 8.1 8.1 0 0 1 2.4 5.79c0 4.5-3.67 8.16-8.17 8.16Zm4.48-6.11c-.25-.13-1.5-.74-1.73-.83-.23-.08-.4-.12-.57.13-.16.25-.65.83-.8 1-.15.16-.3.18-.56.06-.25-.13-1.07-.39-2.03-1.24a7.59 7.59 0 0 1-1.41-1.76c-.15-.25-.02-.39.11-.52.12-.12.25-.3.38-.45.13-.15.16-.25.25-.41.08-.17.04-.31-.02-.44-.07-.12-.57-1.38-.78-1.89-.2-.49-.4-.43-.57-.44h-.49c-.17 0-.44.07-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.02 2.58.12.17 1.77 2.7 4.28 3.79.6.26 1.07.42 1.43.54.6.19 1.14.16 1.57.1.48-.08 1.5-.61 1.71-1.2.21-.6.21-1.1.15-1.2-.06-.1-.22-.16-.47-.29Z"
        fill="#ffffff"
      />
    </svg>
  );
}
