import type { NextConfig } from "next";
<<<<<<< HEAD
=======
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './i18n/request.ts'
);
>>>>>>> feature/ux-login-role-test

const nextConfig: NextConfig = {
  /* config options here */
};

<<<<<<< HEAD
export default nextConfig;
=======
export default withNextIntl(nextConfig);
>>>>>>> feature/ux-login-role-test
