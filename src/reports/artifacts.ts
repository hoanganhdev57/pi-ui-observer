import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;

export interface ArtifactInput {
  kind: string;
  bytes: Uint8Array;
  metadata?: Record<string, unknown>;
}

export interface ArtifactRef {
  path: string;
  manifestPath: string;
}

export async function writeArtifact(runId: string, artifact: ArtifactInput, root = join(tmpdir(), "pi-ui-observer", "runs")): Promise<ArtifactRef> {
  if (artifact.bytes.byteLength > MAX_ARTIFACT_BYTES) throw new Error("Artifact exceeds 10 MiB limit");
  const safeRunId = runId.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeKind = artifact.kind.replace(/[^a-zA-Z0-9._-]/g, "_");
  const directory = join(root, safeRunId);
  const path = join(directory, `${safeKind}.${artifact.kind === "screenshot" ? "png" : "bin"}`);
  const manifestPath = join(directory, "manifest.json");
  await mkdir(directory, { recursive: true });
  await writeFile(path, artifact.bytes);
  await writeFile(manifestPath, JSON.stringify({ runId, kind: artifact.kind, path, bytes: artifact.bytes.byteLength, metadata: artifact.metadata ?? {} }, null, 2));
  return { path, manifestPath };
}
