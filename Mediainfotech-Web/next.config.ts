import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    '192.168.29.196:3000',
    '192.168.29.196',
    '192.168.0.134:3000',
    '192.168.0.134',
    '192.168.56.1:3000',
    '192.168.56.1',
    '*.local',
  ],
};

export default nextConfig;
