// Informational dependency findings are allowed; inability to audit is not.
import { spawnSync } from 'node:child_process';

try {
  const result = spawnSync('npm', ['audit', '--json', '--audit-level=high'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.signal || ![0, 1].includes(result.status))
    throw new Error('npm audit did not complete normally.');
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error('npm audit returned invalid JSON.');
  }
  const counts = report.metadata?.vulnerabilities;
  if (
    report.error ||
    !counts ||
    !['info', 'low', 'moderate', 'high', 'critical', 'total'].every(
      (key) => Number.isInteger(counts[key]) && counts[key] >= 0,
    )
  )
    throw new Error('npm audit did not return valid vulnerability evidence.');
  if (counts.total !== counts.info + counts.low + counts.moderate + counts.high + counts.critical)
    throw new Error('npm audit count evidence is inconsistent.');
  if (result.status === 1 && counts.high + counts.critical === 0)
    throw new Error('npm audit failed without an expected severity finding.');
  if (counts.total > 0)
    console.log(
      `::warning::Informational full dependency audit: ${counts.total} entries (${counts.high} high, ${counts.critical} critical). Production audit remains a separate blocking check.`,
    );
  else console.log('Full dependency audit: zero vulnerabilities.');
} catch (error) {
  console.error(
    `::error::${error instanceof Error ? error.message : 'Dependency audit execution failed.'}`,
  );
  process.exitCode = 1;
}
