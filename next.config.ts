import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/india-markets.html", destination: "/india-markets", permanent: true },
      { source: "/indian-macros.html", destination: "/indian-macros", permanent: true },
      { source: "/rbi-policy-tracker.html", destination: "/rbi-policy-tracker", permanent: true },
      { source: "/inflation-tracker.html", destination: "/inflation-tracker", permanent: true },
      { source: "/growth-tracker.html", destination: "/growth-tracker", permanent: true },
      { source: "/fiscal-tracker.html", destination: "/fiscal-tracker", permanent: true },
      { source: "/sector-pulse.html", destination: "/sector-pulse", permanent: true },
    ];
  },
};

export default nextConfig;
