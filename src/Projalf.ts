import * as cp from 'child_process';
import * as path from 'path';
import { awscdk, javascript, SampleFile } from 'projen';

export interface ProjalfOptions extends awscdk.AwsCdkTypeScriptAppOptions {}

export class Projalf extends awscdk.AwsCdkTypeScriptApp {
  constructor(options: ProjalfOptions) {
    const inferredName =
      options.name ?? inferNameFromGit() ?? inferNameFromCwd();
    const className = toPascalCase(inferredName);
    const fileBase = inferredName.toLowerCase();

    const mergedContext = { ...(options.context ?? {}) } as Record<string, any>;
    if (mergedContext.serviceName === undefined) {
      mergedContext.serviceName = inferredName;
    }

    super({
      ...options,
      name: inferredName,
      defaultReleaseBranch: options.defaultReleaseBranch ?? 'main',
      packageManager:
        options.packageManager ?? javascript.NodePackageManager.NPM,
      projenrcTs: options.projenrcTs ?? true,
      cdkVersion: options.cdkVersion ?? '2.156.0',
      context: mergedContext,
      deps: options.deps ?? [],
      devDeps: options.devDeps ?? [],
    });

    new SampleFile(this, `src/${fileBase}.ts`, {
      contents: `import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ${className}Props extends cdk.StackProps {
  serviceName: string;
}

export class ${className} extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ${className}Props) {
    super(scope, id, props);
  }
}
`,
    });

    new SampleFile(this, 'src/main.ts', {
      contents: `import * as cdk from 'aws-cdk-lib';
import { ${className} } from './${fileBase}';

const env = {
  account: process.env.CDK_DEPLOY_ACCOUNT ?? process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEPLOY_REGION ?? process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();

const serviceName = (app.node.tryGetContext('serviceName') as string | undefined) ?? '${inferredName}';

new ${className}(app, serviceName, { env, serviceName });

app.synth();
`,
    });
  }
}

function inferNameFromGit(): string | undefined {
  try {
    const remote = cp
      .execSync('git config --get remote.origin.url', {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      .toString()
      .trim();
    if (!remote) return undefined;
    const match = remote.match(/\/([^\/]+?)(?:\.git)?$/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function inferNameFromCwd(): string {
  return path.basename(process.cwd());
}

function toPascalCase(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}
