export type ActionRisk = "read" | "interaction" | "destructive";

export type AdapterMode = "isolated" | "chrome" | "current";

export interface HostPolicy {
  allowedHosts: string[];
  allowLocalhost: boolean;
}

export interface ProcessResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
}
