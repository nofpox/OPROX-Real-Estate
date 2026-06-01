declare module "autocannon" {
  export interface LatencyStats {
    p50: number;
    p97_5?: number;
    p99: number;
    max: number;
    average: number;
    stddev?: number;
  }

  export interface RequestStats {
    average: number;
    total?: number;
    stddev?: number;
  }

  export interface Result {
    latency: LatencyStats;
    requests: RequestStats;
    "2xx": number;
    non2xx: number;
    errors: number;
    duration: number;
    connections: number;
  }

  export interface Request {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
    path?: string;
    body?: string;
    headers?: Record<string, string>;
  }

  export interface Options {
    url: string;
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    connections?: number;
    duration?: number;
    pipelining?: number;
  }

  interface AutocannonFn {
    (opts: Options, cb: (err: Error | null, result: Result) => void): unknown;
    track(instance: unknown, opts?: { renderProgressBar?: boolean }): void;
  }

  const autocannon: AutocannonFn;
  export default autocannon;
}
