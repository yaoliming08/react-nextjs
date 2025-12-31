/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'pbs.twing.com',
            },
        ],
    },
    // 禁用开发工具指示器（解决拖拽问题和浏览器扩展冲突）
    devIndicators: false,
};

export default nextConfig;
