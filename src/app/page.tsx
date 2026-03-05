import { Suspense } from 'react';
import { GenerationPage } from '@/components/GenerationPage';
import { HeroSection } from '@/components/HeroSection';

export default function Home() {
  return (
    <>
      <section id="home">
        <HeroSection />
      </section>
      <section id="create">
        <Suspense fallback={null}>
          <GenerationPage />
        </Suspense>
      </section>
    </>
  );
}
