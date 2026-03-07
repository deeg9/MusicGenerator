import type { NextConfig } from "next";
import BundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-static', 'react-email', '@react-email/render'],
};

export default withBundleAnalyzer(nextConfig);
