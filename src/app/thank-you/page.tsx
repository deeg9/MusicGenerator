'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trackSubscriptionPurchased } from '@/lib/analytics';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const PLAN_DETAILS: Record<string, { label: string; price: number; songs: string }> = {
  starter: { label: 'Starter', price: 3.99, songs: '1 song/month' },
  pro: { label: 'Pro', price: 9.99, songs: '3 songs/month' },
  unlimited: { label: 'Unlimited', price: 19.99, songs: 'Unlimited songs' },
};

function ThankYouContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') ?? '';
  const details = PLAN_DETAILS[plan];
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    if (!details) return;

    // Meta Pixel Purchase event
    window.fbq?.('track', 'Purchase', {
      value: details.price,
      currency: 'USD',
      content_name: plan,
    });

    // GA4 purchase event
    window.gtag?.('event', 'purchase', {
      value: details.price,
      currency: 'USD',
      items: [{ item_name: plan }],
    });

    // PostHog subscription_purchased event
    trackSubscriptionPurchased(plan, details.price);
  }, [plan, details]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      {/* Checkmark icon */}
      <svg
        className="mb-6 h-20 w-20"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="40" cy="40" r="40" fill="#22C55E" />
        <path
          d="M24 40L35 51L56 30"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <h1 className="font-libre text-3xl font-bold text-gray-900">
        You&apos;re all set!
      </h1>

      {details ? (
        <>
          <p className="mt-3 text-lg text-gray-600">
            {details.label} Plan &mdash; {details.songs}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            ${details.price.toFixed(2)}/month
          </p>
        </>
      ) : (
        <p className="mt-3 text-lg text-gray-600">
          Your subscription is confirmed. Thank you for your purchase!
        </p>
      )}

      <Link
        href="/quiz"
        className="mt-8 rounded-xl bg-[#7BAFD4] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#6a9ec3]"
      >
        Create Your First Song
      </Link>

      <Link
        href="/dashboard"
        className="mt-4 text-[#7BAFD4] underline transition-colors hover:text-[#6a9ec3]"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
