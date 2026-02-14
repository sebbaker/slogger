import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const configSchema = z.object({
  api_keys: z.array(
    z.object({
      name: z.string().min(1),
      hash: z.string().regex(/^[a-f0-9]{64}$/i),
    }),
  ),
  time_paths: z.array(z.string().min(1)).default(["timestamp", "time", "created_at", "meta.time"]),
});

export type SloggerConfig = z.infer<typeof configSchema>;

export const defaultConfig: SloggerConfig = {
  api_keys: [],
  time_paths: ["timestamp", "time", "created_at", "meta.time"],
};

export function getConfigPath(): string {
  if (process.env.CONFIG_PATH) {
    return process.env.CONFIG_PATH;
  }

  return path.join(process.cwd(), "config.json");
}

export function readConfig(): SloggerConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return defaultConfig;
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return configSchema.parse(parsed);
}

export function writeConfig(config: SloggerConfig): void {
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function writeConfigToPath(configPath: string, config: SloggerConfig): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function readConfigFromPath(configPath: string): SloggerConfig {
  if (!fs.existsSync(configPath)) {
    return defaultConfig;
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return configSchema.parse(parsed);
}
