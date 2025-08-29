import { Component, SampleFile } from "projen"
import { Projalf } from "./Projalf"

export class Files extends Component {
  constructor(
    private appProject: Projalf,
    className: string,
    fileBase: string,
    inferredName: string,
  ) {
    super(appProject)
    this.appProject = appProject

    new SampleFile(this.appProject, `src/${fileBase}.ts`, {
      contents: `import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ${className}Props extends cdk.StackProps {
  serviceName: string;
  stage: string;
}

export class ${className} extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ${className}Props) {
    super(scope, id, props);
    // Add your infra here...
  }
}
`,
    })

    this.appProject.tryRemoveFile("src/main.ts")
    new SampleFile(this.appProject, "src/main.ts", {
      contents: `
      import * as cdk from 'aws-cdk-lib';
      import { ${className} } from './${fileBase}';
      const env = {
        account: process.env.CDK_DEPLOY_ACCOUNT ?? process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEPLOY_REGION ?? process.env.CDK_DEFAULT_REGION,
      };
      const app = new cdk.App();
      const serviceName = '${inferredName}';
      new ${className}(app, serviceName, { env, serviceName });
      app.synth();
      `,
    })
  }
}
