// Points git at .githooks so the leak check runs before every commit. Runs on
// `npm install`; does nothing where there is no git checkout (hosting builds).

import { execFileSync } from 'node:child_process'

try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' })
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' })
} catch {
  // Not a git checkout: nothing to install.
}
