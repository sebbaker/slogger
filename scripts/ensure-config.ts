import fs from "node:fs";
import path from "node:path";
import { defaultConfig, writeConfigToPath } from "../src/lib/config";

function parseArgs(argv: string[]): string {
  let configPath = path.join(process.cwd(), "config.json");

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--config") {
      configPath = path.resolve(argv[i + 1] ?? configPath);
      i += 1;
    }
  }

  return configPath;
}

function main() {
  const configPath = parseArgs(process.argv.slice(2));

  if (fs.existsSync(configPath)) {
    process.stdout.write(`Config already exists: ${configPath}\n`);
    return;
  }

  writeConfigToPath(configPath, defaultConfig);
  process.stdout.write(`Created config: ${configPath}\n`);
}

main();
