/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    turbopack: {},
    webpack: (config, { isServer }) => {
        config.resolve.alias.canvas = false;
        config.resolve.alias.encoding = false;

        // Externalize PDF parsing packages for server-side
        if (isServer) {
            config.externals = config.externals || [];
            config.externals.push('pdf-parse-fork', 'pdfjs-dist');
        }

        return config;
    },
};

export default nextConfig;
