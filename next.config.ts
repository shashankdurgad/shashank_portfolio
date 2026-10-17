import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every <Link>/href is checked against the route tree at compile time —
  // with the case-study routes landing, a typo'd href should fail the build,
  // not ship a 404.
  typedRoutes: true,
};

export default nextConfig;
