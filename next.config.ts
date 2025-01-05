// next.config.js
module.exports = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config: { resolve: { fallback: { fs: boolean; }; }; }, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, // Mock the 'fs' module
        // You can add other Node.js modules here if needed
      };
    }
    return config;
  },
};
