/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
        serverExternalPackages: ['pdf-parse-fork', 'pdfjs-dist'],
    },
    turbopack: {},
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        config.resolve.alias.encoding = false;
        return config;
    },
};

export default nextConfig;
