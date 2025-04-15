import nextPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js configuration options can go here
  // e.g., reactStrictMode: true,
};

// PWA configuration options
const withPWA = nextPWA({
  dest: 'public', // Destination directory for service worker files
  register: true, // Register the service worker
  skipWaiting: true, // Install new service worker immediately
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
  // Exclude server-side files from precaching
  buildExcludes: [
    /middleware-manifest\.json$/,
    /\.next\/server\//, // Exclude all files in the .next/server directory
    /^.+\.map$/ // Exclude all source map files
  ],
  // You can add runtime caching strategies here later
});

export default withPWA(nextConfig); 