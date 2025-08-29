import { JobPermission } from "projen/lib/github/workflows-model"
import { Projalf } from "./Projalf"

export function workflow(project: Projalf) {
  const deployWorkflow = project.github!.addWorkflow("deploy")

  // Trigger on PR and push to main
  deployWorkflow.on({
    pullRequest: {},
    push: { branches: ["main"] },
  })

  // Reusable job template
  const jobDefaults = {
    runsOn: ["ubuntu-latest"],
    permissions: {
      contents: JobPermission.WRITE,
      idToken: JobPermission.WRITE,
    },
    steps: [
      { name: "Checkout", uses: "actions/checkout@v4" },
      {
        name: "Setup Node.js",
        uses: "actions/setup-node@v4",
        with: { "node-version": "20" },
      },
      { name: "Install dependencies", run: "npm ci" },
      {
        name: "Configure AWS credentials",
        uses: "aws-actions/configure-aws-credentials@v4",
        with: {
          "aws-access-key-id": "${{ secrets.AWS_ACCESS_KEY_ID }}",
          "aws-secret-access-key": "${{ secrets.AWS_SECRET_ACCESS_KEY }}",
          "aws-region": "${{ secrets.AWS_REGION || 'eu-central-1' }}",
        },
      },
      { name: "CDK Bootstrap", run: "npx cdk bootstrap" },
    ],
  }

  // Job: deploy dev on PR
  deployWorkflow.addJobs({
    deploy_dev: {
      ...jobDefaults,
      if: "github.event_name == 'pull_request'",
      steps: [
        ...jobDefaults.steps,
        {
          name: "Deploy Dev",
          run: "npm run deploy -- -c stage=dev --require-approval never",
          env: {
            CDK_DEPLOY_ACCOUNT: "${{ secrets.AWS_DEV_ACCOUNT }}",
            CDK_DEPLOY_REGION: "${{ secrets.AWS_REGION || 'eu-central-1' }}",
          },
        },
      ],
    },
    deploy_prod: {
      ...jobDefaults,
      if: "github.ref == 'refs/heads/main' && github.event_name == 'push'",
      steps: [
        ...jobDefaults.steps,
        {
          name: "Deploy Prod",
          run: "npm run deploy -- -c stage=prod --require-approval never",
          env: {
            CDK_DEPLOY_ACCOUNT: "${{ secrets.AWS_PROD_ACCOUNT }}",
            CDK_DEPLOY_REGION: "${{ secrets.AWS_REGION || 'eu-central-1' }}",
          },
        },
      ],
    },
  })
}
