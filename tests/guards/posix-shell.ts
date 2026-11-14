import { existsSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';

/**
 * Lets the shell-based guards run on a Windows developer machine through Git Bash,
 * without changing what they do on the Linux CI runners.
 *
 * On Linux and macOS this returns exactly what the tests used before: `bash` and a
 * restricted PATH of the given directories plus `/usr/bin:/bin`.
 *
 * On Windows, `bash` on the inherited PATH may be WSL's `System32\bash.exe`, which has
 * no access to this Node install, and a `:`-joined PATH is meaningless. So the tests
 * use Git for Windows' bash and the platform delimiter, and the restricted PATH gets
 * Git's `usr/bin` (coreutils, sh) and the folder holding `jq`, instead of `/usr/bin:/bin`.
 */
export const isWindows = process.platform === 'win32';

function findOnPath(executable: string, accept: (dir: string) => boolean = () => true) {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (dir && accept(dir) && existsSync(join(dir, executable))) return dir;
  }
  return undefined;
}

const gitUsrBin = isWindows
  ? (findOnPath(
      'bash.exe',
      (dir) => /[\\/]Git[\\/]usr[\\/]bin[\\/]?$/i.test(dir) || /[\\/]Git[\\/]bin[\\/]?$/i.test(dir),
    ) ??
    [
      join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'usr', 'bin'),
      join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Git', 'usr', 'bin'),
    ].find((dir) => existsSync(join(dir, 'bash.exe'))))
  : undefined;

/** True when a usable POSIX bash exists (always assumed on Linux and macOS). */
export const hasPosixBash = !isWindows || gitUsrBin !== undefined;

/** The bash executable to spawn. */
export const bash = isWindows && gitUsrBin ? join(gitUsrBin, 'bash.exe') : 'bash';

/** A restricted PATH: the given directories first, then the minimal system tools. */
export function toolPath(...dirs: string[]): string {
  if (!isWindows) return [...dirs, '/usr/bin', '/bin'].join(':');
  const system = [gitUsrBin, findOnPath('jq.exe')].filter((d): d is string => Boolean(d));
  // Git's `usr/bin` sits beside `bin`; some installs only expose the latter on PATH.
  if (gitUsrBin && !gitUsrBin.toLowerCase().endsWith(join('usr', 'bin'))) {
    system.push(join(dirname(gitUsrBin), 'usr', 'bin'));
  }
  return [...dirs, ...system].join(delimiter);
}
