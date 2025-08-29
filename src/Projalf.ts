import * as cp from "child_process"
import * as path from "path"
import { awscdk, javascript } from "projen"
import { Files } from "./files"
import { workflow } from "./workflows"

export interface ProjalfOptions extends awscdk.AwsCdkTypeScriptAppOptions {}

export class Projalf extends awscdk.AwsCdkTypeScriptApp {
  constructor(options: ProjalfOptions) {
    const inferredName =
      options.name ?? inferNameFromGit() ?? inferNameFromCwd()
    const className = toPascalCase(inferredName)
    const fileBase = inferredName.toLowerCase()

    const mergedContext = { ...(options.context ?? {}) } as Record<string, any>
    if (mergedContext.serviceName === undefined) {
      mergedContext.serviceName = inferredName
    }

    super({
      ...options,
      name: inferredName,
      defaultReleaseBranch: options.defaultReleaseBranch ?? "main",
      packageManager:
        options.packageManager ?? javascript.NodePackageManager.NPM,
      projenrcTs: options.projenrcTs ?? true,
      cdkVersion: options.cdkVersion ?? "2.156.0",
      context: mergedContext,
      deps: options.deps ?? [],
      devDeps: options.devDeps ?? [],
      buildWorkflow: false,
      release: false,
      depsUpgrade: false,
      githubOptions: {
        pullRequestLint: false,
      },

      prettierOptions: {
        ...options.prettierOptions,
        settings: {
          semi: false,
          printWidth: 100,
          singleQuote: false,
          ...options.prettierOptions?.settings,
        },
      },
    })

    new Files(this, className, fileBase, inferredName)

    // Enforce ESLint style: double quotes and no semicolons
    this.eslint?.addRules({
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "never"],
      "@stylistic/consistent-quotes": ["off"],
    })

    workflow(this)
  }
}

function inferNameFromGit(): string | undefined {
  try {
    const remote = cp
      .execSync("git config --get remote.origin.url", {
        stdio: ["ignore", "pipe", "ignore"],
      })
      .toString()
      .trim()
    if (!remote) return undefined
    const match = remote.match(/\/([^\/]+?)(?:\.git)?$/)
    return match?.[1]
  } catch {
    return undefined
  }
}

function inferNameFromCwd(): string {
  return path.basename(process.cwd())
}

function toPascalCase(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("")
}
