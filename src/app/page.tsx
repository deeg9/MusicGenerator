import { Suspense } from 'react';
import { GenerationPage } from '@/components/GenerationPage';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <GenerationPage />
    </Suspense>
  );
}
