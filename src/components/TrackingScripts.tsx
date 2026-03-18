'use client';

import { useEffect, useState, Suspense } from 'react';
import Script from 'next/script';
import { FacebookPixelEvents } from './FacebookPixelEvents';

const CONSENT_KEY = 'notevra-cookie-consent';

export function TrackingScripts() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Fire by default unless user has explicitly declined
    const consent = localStorage.getItem(CONSENT_KEY);
    setAllowed(consent !== 'declined');

    function onConsentChange() {
      const updated = localStorage.getItem(CONSENT_KEY);
      setAllowed(updated !== 'declined');
    }

    window.addEventListener('consent-change', onConsentChange);
    return () => window.removeEventListener('consent-change', onConsentChange);
  }, []);

  if (!allowed) return null;

  return (
    <>
      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-3YZ5B2YZC8"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-3YZ5B2YZC8');
        `}
      </Script>

      {/* Meta Pixel */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '949118214118377');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=949118214118377&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>

      {/* Route-change PageView tracker */}
      <Suspense fallback={null}>
        <FacebookPixelEvents />
      </Suspense>
    </>
  );
}
