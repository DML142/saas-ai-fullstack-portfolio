import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.50.36'],
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
