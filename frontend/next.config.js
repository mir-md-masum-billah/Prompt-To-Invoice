const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repo has a lockfile in the root and one in /frontend; pin the root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

module.exports = nextConfig;
