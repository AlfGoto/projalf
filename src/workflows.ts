import { JobPermission } from "projen/lib/github/workflows-model"
import { Projalf } from "./Projalf"

export function workflow(project: Projalf) {
  const cicdWorkflow = project.github!.addWorkflow("ci-cd")

  // Single workflow - triggers on PR and push to main
  cicdWorkflow.on({
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
    ],
  }

  // All jobs in one workflow with proper dependencies
  cicdWorkflow.addJobs({
    test: {
      ...jobDefaults,
      steps: [
        ...jobDefaults.steps,
        {
          name: "Generate random stage ID",
          id: "stage",
          run: 'echo "STAGE_ID=test-$(shuf -i 10000-99999 -n 1)" >> $GITHUB_OUTPUT',
        },
        {
          name: "Deploy Test Stack",
          run: "npm run deploy -- -c stage=${{ steps.stage.outputs.STAGE_ID }} --require-approval never",
          env: {
            CDK_DEPLOY_ACCOUNT: "${{ secrets.AWS_TEST_ACCOUNT }}",
            CDK_DEPLOY_REGION: "${{ secrets.AWS_REGION || 'eu-central-1' }}",
          },
        },
        {
          name: "Run E2E Tests",
          run: "npm run test:e2e",
          env: {
            STAGE: "${{ steps.stage.outputs.STAGE_ID }}",
          },
        },
        {
          name: "Destroy Test Stack",
          if: "always()",
          run: "npm run destroy -- -c stage=${{ steps.stage.outputs.STAGE_ID }} --force",
          env: {
            CDK_DEPLOY_ACCOUNT: "${{ secrets.AWS_TEST_ACCOUNT }}",
            CDK_DEPLOY_REGION: "${{ secrets.AWS_REGION || 'eu-central-1' }}",
          },
        },
      ],
    },
    deploy_dev: {
      ...jobDefaults,
      needs: ["test"],
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
      needs: ["test"],
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
