import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const outdir = path.join(root, 'site')
const entrypoints = [
  'pages/index.html',
]

const result = Bun.spawnSync(
  ['bun', 'build', ...entrypoints, '--outdir', outdir],
  {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  },
)

if (result.exitCode !== 0) {
  process.exit(result.exitCode)
}

const targets = [
  { source: 'index.html', target: 'index.html' },
]

for (let index = 0; index < targets.length; index++) {
  const entry = targets[index]!
  await moveBuiltHtml(entry.source, entry.target)
}

// Copy assets manually since the bundler might not pick them up properly if they are dynamic or just a video
await Bun.spawnSync(['mkdir', '-p', path.join(outdir, 'assets')])
await Bun.spawnSync(['cp', '-r', path.join(root, 'pages', 'assets'), outdir])

async function resolveBuiltHtmlPath(relativePath: string): Promise<string> {
  const candidates = [
    path.join(outdir, relativePath),
    path.join(outdir, 'pages', relativePath),
  ]
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index]!
    if (await Bun.file(candidate).exists()) return candidate
  }
  throw new Error(`Built HTML not found for ${relativePath}`)
}

async function moveBuiltHtml(sourceRelativePath: string, targetRelativePath: string): Promise<void> {
  const sourcePath = await resolveBuiltHtmlPath(sourceRelativePath)
  const targetPath = path.join(outdir, targetRelativePath)
  let html = await readFile(sourcePath, 'utf8')
  html = rebaseRelativeAssetUrls(html, sourcePath, targetPath)

  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, html)
  if (sourcePath !== targetPath) await rm(sourcePath)
}

function rebaseRelativeAssetUrls(html: string, sourcePath: string, targetPath: string): string {
  return html.replace(/\b(src|href)="([^"]+)"/g, (_match, attr: string, value: string) => {
    if (!value.startsWith('.')) return `${attr}="${value}"`

    const absoluteAssetPath = path.resolve(path.dirname(sourcePath), value)
    let relativeAssetPath = path.relative(path.dirname(targetPath), absoluteAssetPath)
    relativeAssetPath = relativeAssetPath.split(path.sep).join('/')
    if (!relativeAssetPath.startsWith('.')) relativeAssetPath = `./${relativeAssetPath}`
    return `${attr}="${relativeAssetPath}"`
  })
}
