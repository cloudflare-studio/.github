#!/usr/bin/env tsx
/**
 * Initialize all missing repositories for Cloudflare Studio
 * Creates both public and private repos with minimal buildable structure
 */

import { execSync } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'

const BASE_DIR = '/Users/andrewpankov/Documents/GitHub/cloudflare-studio'

interface RepoConfig {
  name: string
  description: string
  isPrivate: boolean
  type: 'library' | 'app' | 'plugin' | 'docs' | 'config'
  dependencies?: string[]
}

const REPOS_TO_CREATE: RepoConfig[] = [
  // Public repositories
  {
    name: 'claude-docs',
    description: '🤖 AI-first documentation system for Cloudflare Studio',
    isPrivate: false,
    type: 'library'
  },
  {
    name: '.claude',
    description: '🧠 Organization AI brain - Multi-repo Claude context management',
    isPrivate: false,
    type: 'docs'
  },
  
  // Private business repositories
  {
    name: 'billing',
    description: '💳 Billing system with Stripe integration',
    isPrivate: true,
    type: 'app',
    dependencies: ['stripe', '@cloudflare-studio/runtime']
  },
  {
    name: 'analytics',
    description: '📊 Usage analytics and metrics tracking',
    isPrivate: true,
    type: 'app',
    dependencies: ['@cloudflare/workers-types']
  },
  {
    name: 'plugin-ai',
    description: '🤖 AI-powered automation plugin ($99/month)',
    isPrivate: true,
    type: 'plugin',
    dependencies: ['@cloudflare-studio/plugin-interface', 'openai']
  },
  {
    name: 'plugin-enterprise',
    description: '🏢 Enterprise features plugin (custom pricing)',
    isPrivate: true,
    type: 'plugin',
    dependencies: ['@cloudflare-studio/plugin-interface']
  },
  {
    name: 'infrastructure',
    description: '🏗️ Our own infrastructure managed by cfstudio',
    isPrivate: true,
    type: 'config'
  },
  {
    name: 'runbooks',
    description: '📚 Operational runbooks and workflows',
    isPrivate: true,
    type: 'config'
  },
  {
    name: 'monitoring',
    description: '📡 Monitoring and alerting configuration',
    isPrivate: true,
    type: 'app',
    dependencies: ['@cloudflare/workers-types']
  }
]

async function runCommand(cmd: string, cwd?: string) {
  console.log(`  $ ${cmd}`)
  try {
    return execSync(cmd, { cwd, stdio: 'inherit' })
  } catch (error) {
    console.error(`  ❌ Command failed: ${cmd}`)
    throw error
  }
}

async function createPackageJson(repoPath: string, config: RepoConfig) {
  const isPlugin = config.type === 'plugin'
  const isApp = config.type === 'app'
  
  const packageJson = {
    name: `@cloudflare-studio/${config.name}`,
    version: '0.1.0',
    description: config.description,
    type: 'module',
    ...(config.type !== 'config' && {
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsup src/index.ts --format esm',
        typecheck: 'tsc --noEmit',
        test: 'vitest run',
        'test:watch': 'vitest'
      }
    }),
    ...(config.type === 'config' && {
      scripts: {
        validate: 'cfstudio validate',
        deploy: 'cfstudio deploy'
      }
    }),
    repository: {
      type: 'git',
      url: `git+https://github.com/cloudflare-studio/${config.name}.git`
    },
    homepage: `https://github.com/cloudflare-studio/${config.name}#readme`,
    private: config.isPrivate,
    ...(config.dependencies && {
      dependencies: config.dependencies.reduce((acc, dep) => {
        acc[dep] = dep.startsWith('@cloudflare-studio/') ? 'workspace:*' : 'latest'
        return acc
      }, {} as Record<string, string>)
    }),
    devDependencies: {
      '@types/node': '^20.0.0',
      'tsx': '^4.0.0',
      'tsup': '^8.0.0',
      'typescript': '^5.0.0',
      'vitest': '^1.0.0'
    }
  }
  
  await fs.writeFile(
    path.join(repoPath, 'package.json'),
    JSON.stringify(packageJson, null, 2) + '\n'
  )
}

async function createTsConfig(repoPath: string) {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      lib: ['ES2022'],
      moduleResolution: 'bundler',
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
      outDir: 'dist',
      rootDir: 'src',
      declaration: true,
      declarationMap: true,
      sourceMap: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  }
  
  await fs.writeFile(
    path.join(repoPath, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2) + '\n'
  )
}

async function createSourceFiles(repoPath: string, config: RepoConfig) {
  const srcDir = path.join(repoPath, 'src')
  await fs.mkdir(srcDir, { recursive: true })
  
  if (config.type === 'plugin') {
    // Plugin structure
    const pluginCode = `import { Plugin, PluginCapabilities } from '@cloudflare-studio/plugin-interface'

export class ${config.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Plugin implements Plugin {
  name = '${config.name}'
  version = '0.1.0'
  
  capabilities: PluginCapabilities = {
    resources: [
      // Define resource types this plugin manages
    ],
    actions: [
      // Define actions this plugin provides
    ]
  }
  
  async initialize() {
    console.log('${config.name} plugin initialized')
  }
  
  async execute(action: string, inputs: any) {
    console.log(\`Executing \${action} with inputs:\`, inputs)
    return { success: true }
  }
}

export default new ${config.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Plugin()
`
    await fs.writeFile(path.join(srcDir, 'index.ts'), pluginCode)
    
  } else if (config.type === 'app') {
    // App structure
    const appCode = `/**
 * ${config.description}
 */

export async function main() {
  console.log('${config.name} starting...')
  
  // TODO: Implement ${config.name} logic
}

// Run if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  main().catch(console.error)
}
`
    await fs.writeFile(path.join(srcDir, 'index.ts'), appCode)
    
  } else if (config.type === 'library') {
    // Library structure
    const libCode = `/**
 * ${config.description}
 */

export const version = '0.1.0'

export function hello() {
  return 'Hello from ${config.name}!'
}

// TODO: Implement ${config.name} functionality
`
    await fs.writeFile(path.join(srcDir, 'index.ts'), libCode)
  }
}

async function createConfigFiles(repoPath: string, config: RepoConfig) {
  if (config.type === 'config') {
    // For config repos, create cfstudio.yaml
    const cfstudioYaml = `project:
  name: ${config.name}
  version: 0.1.0
  description: ${config.description}

plugins:
  - name: '@cloudflare-studio/plugin-cloudflare'
  - name: '@cloudflare-studio/plugin-github'

resources:
  # Define resources managed by this project

workflows:
  # Define automation workflows
`
    await fs.writeFile(path.join(repoPath, 'cfstudio.yaml'), cfstudioYaml)
    
    // Add README
    const readme = `# ${config.name}

${config.description}

## Usage

\`\`\`bash
cfstudio validate
cfstudio deploy
\`\`\`
`
    await fs.writeFile(path.join(repoPath, 'README.md'), readme)
  }
}

async function createGitignore(repoPath: string) {
  const gitignore = `# Dependencies
node_modules/
dist/
*.log

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Build
*.tsbuildinfo
coverage/
.turbo/

# Private
*.private
*.secret
`
  
  await fs.writeFile(path.join(repoPath, '.gitignore'), gitignore)
}

async function createGitHubActions(repoPath: string, config: RepoConfig) {
  const workflowsDir = path.join(repoPath, '.github', 'workflows')
  await fs.mkdir(workflowsDir, { recursive: true })
  
  const ciWorkflow = `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install
        
      ${config.type !== 'config' ? `- name: Type check
        run: pnpm typecheck
        
      - name: Run tests
        run: pnpm test
        
      - name: Build
        run: pnpm build` : `- name: Validate
        run: pnpm validate`}
`
  
  await fs.writeFile(path.join(workflowsDir, 'ci.yml'), ciWorkflow)
}

async function createReadme(repoPath: string, config: RepoConfig) {
  const readme = `# ${config.name}

${config.description}

${config.isPrivate ? '**⚠️ This is a private repository for Cloudflare Studio internal use only.**\n' : ''}
## Overview

${config.type === 'plugin' ? `This is a ${config.isPrivate ? 'premium' : 'standard'} plugin for Cloudflare Studio.` : ''}
${config.type === 'app' ? 'This application is part of the Cloudflare Studio platform.' : ''}
${config.type === 'library' ? 'This library provides shared functionality for Cloudflare Studio.' : ''}
${config.type === 'config' ? 'This repository contains configuration and workflows for Cloudflare Studio operations.' : ''}

## Installation

${config.type !== 'config' ? `\`\`\`bash
pnpm add ${config.name}
\`\`\`` : `\`\`\`bash
cfstudio validate
\`\`\``}

## Usage

${config.type === 'plugin' ? `\`\`\`typescript
import ${config.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')} from '${config.name}'

// Use in your cfstudio.yaml
plugins:
  - name: '${config.name}'
\`\`\`` : ''}

${config.type === 'app' ? `\`\`\`bash
pnpm dev  # Development
pnpm build # Production build
\`\`\`` : ''}

## Development

\`\`\`bash
# Install dependencies
pnpm install

${config.type !== 'config' ? `# Run tests
pnpm test

# Build
pnpm build` : `# Validate configuration
pnpm validate`}
\`\`\`

## License

${config.isPrivate ? 'Proprietary - Cloudflare Studio Internal' : 'MIT'}
`
  
  await fs.writeFile(path.join(repoPath, 'README.md'), readme)
}

async function initializeRepo(config: RepoConfig) {
  console.log(`\n📦 Creating ${config.name}...`)
  
  const repoPath = path.join(BASE_DIR, config.name)
  
  // Check if directory already exists
  try {
    await fs.access(repoPath)
    console.log(`  ⚠️  Directory already exists, skipping...`)
    return
  } catch {
    // Directory doesn't exist, continue
  }
  
  // Create directory
  await fs.mkdir(repoPath, { recursive: true })
  
  // Initialize git
  await runCommand('git init', repoPath)
  
  // Create files based on type
  if (config.type !== 'config') {
    await createPackageJson(repoPath, config)
    await createTsConfig(repoPath)
    await createSourceFiles(repoPath, config)
  } else {
    await createConfigFiles(repoPath, config)
  }
  
  // Common files
  await createGitignore(repoPath)
  await createGitHubActions(repoPath, config)
  await createReadme(repoPath, config)
  
  // Initial commit
  await runCommand('git add .', repoPath)
  await runCommand(`git commit -m "feat: initial setup for ${config.name}\n\n${config.description}"`, repoPath)
  
  // Create GitHub repository
  const visibility = config.isPrivate ? '--private' : '--public'
  try {
    await runCommand(
      `gh repo create cloudflare-studio/${config.name} ${visibility} --description "${config.description}" --push --source .`,
      repoPath
    )
    console.log(`  ✅ Created and pushed to GitHub`)
  } catch (error) {
    console.log(`  ⚠️  Could not create GitHub repo (may already exist)`)
  }
}

async function main() {
  console.log('🚀 Initializing missing Cloudflare Studio repositories...\n')
  
  for (const repo of REPOS_TO_CREATE) {
    await initializeRepo(repo)
  }
  
  console.log('\n✨ All repositories initialized!')
  console.log('\n📊 Repository Summary:')
  console.log('\nPublic (Open Source):')
  REPOS_TO_CREATE.filter(r => !r.isPrivate).forEach(r => {
    console.log(`  - ${r.name}: ${r.description}`)
  })
  console.log('\nPrivate (Business):')
  REPOS_TO_CREATE.filter(r => r.isPrivate).forEach(r => {
    console.log(`  - ${r.name}: ${r.description}`)
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}