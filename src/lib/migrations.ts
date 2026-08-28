export const CURRENT_SCHEMA_VERSION = 1
const steps: Record<number, (data: unknown) => unknown> = {}
export function migrate(raw: { version: number; data: unknown }): { version: number; data: unknown } {
  let { version, data } = raw
  while (version < CURRENT_SCHEMA_VERSION && steps[version]) { data = steps[version](data); version += 1 }
  return { version: Math.max(version, raw.version), data }
}
