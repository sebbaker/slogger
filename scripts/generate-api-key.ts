import crypto from "node:crypto";
import path from "node:path";
import { readConfigFromPath, writeConfigToPath } from "../src/lib/config";

type Args = {
  name: string;
  configPath: string;
};

function parseArgs(argv: string[]): Args {
  let name = "default";
  let configPath = path.join(process.cwd(), "config.json");

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--name") {
      name = argv[i + 1] ?? name;
      i += 1;
      continue;
    }

    if (arg === "--config") {
      configPath = path.resolve(argv[i + 1] ?? configPath);
      i += 1;
    }
  }

  return { name, configPath };
}

function hash(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = readConfigFromPath(args.configPath);

  const rawKey = crypto.randomBytes(32).toString("hex");
  const keyHash = hash(rawKey);

  config.api_keys.push({
    name: args.name,
    hash: keyHash,
  });

  writeConfigToPath(args.configPath, config);
  process.stdout.write(rawKey);
}

main();
