// Fluent-style outline icons, drawn here as inline SVG (no Microsoft asset files).
import type { ReactNode } from 'react';

const Svg = ({ children, size = 20 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
);

export const Bell = () => <Svg size={24}><path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3z" /><path d="M10 20a2 2 0 0 0 4 0" /></Svg>;
export const ChatIcon = () => <Svg size={24}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z" /></Svg>;
export const TeamsIcon = () => (
  <Svg size={24}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.2" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M15 14.2c3 0 5.5 1.6 5.5 4.3" /></Svg>
);
export const CalendarIcon = () => <Svg size={24}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M8 3v4M16 3v4" /></Svg>;
export const CallIcon = () => <Svg size={24}><path d="M7 4h3l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 5 6a2 2 0 0 1 2-2z" /></Svg>;
export const CloudIcon = () => <Svg size={24}><path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 .5 9z" /></Svg>;
export const MoreIcon = ({ size = 24 }: { size?: number }) => (
  <Svg size={size}><circle cx="6" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="18" cy="12" r="1" fill="currentColor" /></Svg>
);
export const SearchIcon = () => <Svg size={16}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></Svg>;
export const FilterIcon = () => <Svg><path d="M4 6h16M7 12h10M10 18h4" /></Svg>;
export const PlusIcon = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>;
export const ChevronDown = ({ size = 16 }: { size?: number }) => <Svg size={size}><path d="M6 9l6 6 6-6" /></Svg>;
export const ChevronLeft = () => <Svg size={16}><path d="M15 6l-6 6 6 6" /></Svg>;
export const ChevronRight = () => <Svg size={16}><path d="M9 6l6 6-6 6" /></Svg>;
export const HashIcon = ({ size = 16 }: { size?: number }) => <Svg size={size}><path d="M10 4L8 20M16 4l-2 16M4.5 9h15M4 15h15" /></Svg>;
export const HelpIcon = () => <Svg size={24}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></Svg>;
export const PeopleAddIcon = () => (
  <Svg><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3 2.5-5 5.5-5 1.4 0 2.6.4 3.6 1.1" /><path d="M17 14v6M14 17h6" /></Svg>
);
export const VideoIcon = () => <Svg size={16}><rect x="3" y="7" width="12" height="10" rx="2" /><path d="M15 11l6-3v8l-6-3" /></Svg>;
export const SendIcon = () => <Svg><path d="M4 12l16-8-5 16-3-7z" /><path d="M12 13l8-9" /></Svg>;
export const FormatIcon = () => <Svg><path d="M6 19l5-14h2l5 14M8.5 13h7" /></Svg>;
export const AttachIcon = () => <Svg><path d="M16 7l-7.5 7.5a2 2 0 0 0 3 3L19 10a4 4 0 0 0-6-6l-7.5 7.5a6 6 0 0 0 8.5 8.5L20 14" /></Svg>;
export const EmojiIcon = () => <Svg><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14.5a4 4 0 0 0 7 0" /><path d="M9 10h.01M15 10h.01" /></Svg>;
export const GifIcon = () => <Svg><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="M10 10H8v4h2v-1.5M12.5 10v4M15 14v-4h2M15 12h1.5" /></Svg>;
export const StickerIcon = () => <Svg><path d="M5 5h14v8l-6 6H5z" /><path d="M13 19v-4a2 2 0 0 1 2-2h4" /></Svg>;
export const CheckIcon = () => <Svg size={16}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const InfoIcon = () => <Svg size={16}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></Svg>;
export const BookmarkIcon = () => <Svg size={16}><path d="M7 4h10v16l-5-4-5 4z" /></Svg>;
export const MailIcon = () => <Svg size={16}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4 7l8 6 8-6" /></Svg>;
export const AtIcon = () => <Svg size={16}><circle cx="12" cy="12" r="3.5" /><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.5 6.9" /></Svg>;
export const EventIcon = () => <Svg><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M8 3v4M16 3v4M9 15l2 2 4-4" /></Svg>;
/** The Context layer's app icon: three linked nodes. */
export const NetworkIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.8} aria-hidden="true" focusable="false">
    <circle cx="6" cy="7" r="2.5" /><circle cx="18" cy="7" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.3 8.3l2.7 7.5M15.7 8.3L13 15.8M8.5 7h7" />
  </svg>
);
