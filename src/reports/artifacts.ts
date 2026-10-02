import { lstat, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;
let privateRoot: Promise<string> | undefined;

function defaultRoot(): Promise<string> {
  privateRoot ??= mkdtemp(join(tmpdir(), "pi-ui-observer-"));
  return privateRoot;
}

export interface ArtifactInput {
  kind: string;
  bytes: Uint8Array;
  metadata?: Record<string, unknown>;
}

export interface ArtifactRef {
  path: string;
  manifestPath: string;
}

export async function writeArtifact(runId: string, artifact: ArtifactInput, root?: string): Promise<ArtifactRef> {
  if (artifact.bytes.byteLength > MAX_ARTIFACT_BYTES) throw new Error("Artifact exceeds 10 MiB limit");
  const safeRunId = runId.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeKind = artifact.kind.replace(/[^a-zA-Z0-9._-]/g, "_");
  const directory = join(root ?? await defaultRoot(), safeRunId);
  const path = join(directory, `${safeKind}.${artifact.kind === "screenshot" ? "png" : "bin"}`);
  const manifestPath = join(directory, "manifest.json");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || (process.platform !== "win32" && (info.mode & 0o077) !== 0)) throw new Error("Artifact directory must be private and not a symlink");
  await writeFile(path, artifact.bytes, { mode: 0o600, flag: "wx" });
  await writeFile(manifestPath, JSON.stringify({ runId, kind: artifact.kind, path, bytes: artifact.bytes.byteLength, metadata: artifact.metadata ?? {} }, null, 2), { mode: 0o600, flag: "wx" });
  return { path, manifestPath };
}
