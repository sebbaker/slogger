let started = false;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (started) {
    return;
  }
  started = true;

  const { ensurePartitions } = await import("@/lib/partition-manager");
  await ensurePartitions();

  setInterval(() => {
    void ensurePartitions();
  }, 6 * 60 * 60 * 1000);
}
