type P = { size?: number };
const svg = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
});

export const CheckIcon = ({ size = 14 }: P) => (
  <svg {...svg(size)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const NetworkIcon = ({ size = 18 }: P) => (
  <svg {...svg(size)}>
    <circle cx="12" cy="5" r="2.2" />
    <circle cx="5" cy="18" r="2.2" />
    <circle cx="19" cy="18" r="2.2" />
    <path d="M11 7l-5 9M13 7l5 9M7.2 18h9.6" />
  </svg>
);

export const SendIcon = ({ size = 18 }: P) => (
  <svg {...svg(size)}>
    <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />
  </svg>
);

export const CloseIcon = ({ size = 18 }: P) => (
  <svg {...svg(size)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ChatIcon = ({ size = 18 }: P) => (
  <svg {...svg(size)}>
    <path d="M5 5h14v10H10l-4 4v-4H5z" />
  </svg>
);
