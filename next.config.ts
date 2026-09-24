import type { NextConfig } from "next";

const config: NextConfig = {
  // Stop Next writing coding-agent instruction files on boot.
  agentRules: false,
};

export default config;
