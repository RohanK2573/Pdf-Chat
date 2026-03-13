const path = require("path");

const repoRoot = __dirname;
const serverCwd = path.join(repoRoot, "server");
const webCwd = path.join(repoRoot, "client", "my-app");

module.exports = {
  apps: [
    {
      name: "pdf-scanner-api",
      cwd: serverCwd,
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 8000,
      },
      autorestart: true,
      restart_delay: 2000,
    },
    {
      name: "pdf-scanner-worker",
      cwd: serverCwd,
      script: "npm",
      args: "run start:worker",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      restart_delay: 2000,
    },
    {
      name: "pdf-scanner-web",
      cwd: webCwd,
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      autorestart: true,
      restart_delay: 2000,
    },
  ],
};
