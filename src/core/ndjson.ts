export function parseNdjson(stdout: string): any[] {
  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(item => item !== null);
}
