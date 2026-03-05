import { Suspense } from 'react';
import { GenerationPage } from '@/components/GenerationPage';
import { HeroSection } from '@/components/HeroSection';

export default function Home() {
  return (
    <>
      <HeroSection />
      <section id="create">
        <Suspense fallback={null}>
          <GenerationPage />
        </Suspense>
      </section>
    </>
  );
}
