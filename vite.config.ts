import { fileURLToPath, URL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

function gitValue(args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: import.meta.dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch { return null }
}

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
const gitStatus = gitValue(['status', '--porcelain'])
const buildInfo = {
  version: packageJson.version,
  gitCommit: gitValue(['rev-parse', '--short', 'HEAD']),
  gitBranch: process.env.GITHUB_REF_NAME || gitValue(['branch', '--show-current']) || null,
  gitState: gitStatus === null ? null : gitStatus ? 'dirty' : 'clean',
  builtEastern: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/New_York' }).format(new Date()),
}

export default defineConfig({
  plugins: [vue({
    template: { compilerOptions: { isCustomElement: (tag) => tag === 'nice-pool' } },
  })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  base: './',
  define: { __SANPY_WEB_BUILD_INFO__: JSON.stringify(buildInfo) },
})
