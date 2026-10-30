export type Beat = {
  n: string;
  label: string;
  caption: string;
  light: string;
  dark: string;
  alt: string;
};

/**
 * The four product beats. Screens are real captures of the running app
 * (Expo web, mock data) at 390 × 844, light and dark.
 */
export const BEATS: Beat[] = [
  {
    n: "01",
    label: "Vision",
    caption: "Write the future you're running toward. One vision, stated plainly.",
    light: "/screens/vision-light.webp",
    dark: "/screens/vision-dark.webp",
    alt: "Correr Vision screen: one featured vision with a 34% progress ring.",
  },
  {
    n: "02",
    label: "Promises",
    caption: "Today's promises, in time order. Tick one off, or move it.",
    light: "/screens/home-light.webp",
    dark: "/screens/home-dark.webp",
    alt: "Correr Home screen: a timeline of today's promises, one already complete.",
  },
  {
    n: "03",
    label: "Check-in",
    caption: "Three honest choices. On track, struggling, blocked.",
    light: "/screens/checkin-light.webp",
    dark: "/screens/checkin-dark.webp",
    alt: "Correr daily check-in: three choices for how the day is going.",
  },
  {
    n: "04",
    label: "Progress",
    caption: "Streaks, XP, and a ledger of every rep.",
    light: "/screens/progress-light.webp",
    dark: "/screens/progress-dark.webp",
    alt: "Correr Progress screen: a 12-day streak, level ring and total XP.",
  },
];
