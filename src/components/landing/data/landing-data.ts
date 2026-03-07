// Static data for Notevra landing page sections

export interface Step {
  icon: string;
  title: string;
  description: string;
}

export interface Testimonial {
  name: string;
  initials: string;
  relationship: string;
  quote: string;
  rating: number;
}

export interface TrustBadge {
  icon: string;
  label: string;
}

export const STEPS: Step[] = [
  {
    icon: 'Heart',
    title: 'Tell us about them',
    description:
      "Share what makes them special — their personality, your favorite memories together, and the occasion you're celebrating.",
  },
  {
    icon: 'Music',
    title: 'Choose your style',
    description:
      'Pick a music genre and mood that fits. From a heartfelt folk ballad to an upbeat pop anthem — you decide the feel.',
  },
  {
    icon: 'Sparkles',
    title: 'Get your song',
    description:
      'Our AI composes a one-of-a-kind song just for them. Download it, share it, or play it the moment the candles are blown out.',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah M.',
    initials: 'SM',
    relationship: 'Made for Mom\'s 60th Birthday',
    quote:
      'I made this for my mom\'s 60th birthday and she cried the second she heard the first verse. It mentioned her garden, her laugh, and the summer road trips we took when I was little. I have never seen her so moved by a gift.',
    rating: 5,
  },
  {
    name: 'James & Priya',
    initials: 'JP',
    relationship: '10th Anniversary Gift',
    quote:
      'We gave each other Notevra songs for our anniversary — completely independently. Both songs referenced the same camping trip where we got engaged. Somehow the AI captured exactly what that moment meant to us. We still listen to them every year.',
    rating: 5,
  },
  {
    name: 'Olivia T.',
    initials: 'OT',
    relationship: 'Best Friend\'s Graduation Gift',
    quote:
      'My best friend moved across the country after graduation and I had no idea what to get her. I described our four years together and Notevra made something that sounded like it was written just for us. She texts me lyrics from it to this day.',
    rating: 5,
  },
  {
    name: 'Daniel R.',
    initials: 'DR',
    relationship: 'Father\'s Retirement Celebration',
    quote:
      'My dad spent 35 years at the same company and I wanted his retirement party to be unforgettable. The song I made talked about his early morning commutes, his old toolbox, and how proud we all are. The room went silent when it played. Then the applause.',
    rating: 5,
  },
];

export const TRUST_BADGES: TrustBadge[] = [
  {
    icon: 'Gift',
    label: 'Truly unique gift',
  },
  {
    icon: 'Fingerprint',
    label: '100% unique',
  },
  {
    icon: 'Smile',
    label: 'No musical skill needed',
  },
];
