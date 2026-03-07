import { HeroSection } from '@/components/landing/HeroSection';
import dynamic from 'next/dynamic';

const HowItWorksSection = dynamic(
  () => import('@/components/landing/HowItWorksSection').then((m) => m.HowItWorksSection)
);
const TestimonialsSection = dynamic(
  () => import('@/components/landing/TestimonialsSection').then((m) => m.TestimonialsSection)
);
const BottomCtaSection = dynamic(
  () => import('@/components/landing/BottomCtaSection').then((m) => m.BottomCtaSection)
);

export default function Home() {
  return (
    <main>
      <HeroSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <BottomCtaSection />
    </main>
  );
}
