import type {NextConfig} from 'next';
import path from 'path';

// E2E builds swap Firebase for in-memory shims (see e2e/shims). Normal builds are untouched.
const E2E = process.env.E2E_FAKE_FIREBASE === '1';
const shim = (f: string) => path.resolve(process.cwd(), 'e2e/shims', f);

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(E2E
    ? {
        distDir: '.next-e2e',
        webpack(config: any, { webpack }: any) {
          config.resolve.alias = {
            ...config.resolve.alias,
            'firebase/firestore': shim('firestore-shim.js'),
            'firebase/auth': shim('auth-shim.js'),
          };
          // The Genkit flow is a 'use server' module, so an alias is bypassed; replace the module itself.
          config.plugins.push(
            new webpack.NormalModuleReplacementPlugin(/ai\/flows\/create-admin-user$/, shim('create-admin-user-shim.js')),
          );
          return config;
        },
      }
    : {}),
};

export default nextConfig;
