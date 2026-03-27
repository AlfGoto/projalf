import { JobPermission } from "projen/lib/github/workflows-model"
import { Projalf } from "./Projalf"

export function workflow(project: Projalf) {
  const cicdWorkflow = project.github!.addWorkflow("ci-cd")

  cicdWorkflow.on({
    pullRequest: {},
    push: { branches: ["main"] }
  })

  const jobDefaults = {
    runsOn: ["ubuntu-latest"],
    permissions: {
      contents: JobPermission.WRITE,
      idToken: JobPermission.WRITE
    },
    steps: [
      { name: "Checkout", uses: "actions/checkout@v4" },
      {
        name: "Setup Node.js",
        uses: "actions/setup-node@v4",
        with: { "node-version": "20" }
      },
      { name: "Install dependencies", run: "npm ci" }
    ]
  }

  cicdWorkflow.addJobs({
    test: {
      ...jobDefaults,
      steps: [
        ...jobDefaults.steps,
        {
          name: "Configure AWS credentials (test)",
          uses: "aws-actions/configure-aws-credentials@v4",
          with: {
            "aws-access-key-id": "${{ secrets.TEST_AWS_ACCESS_KEY_ID }}",
            "aws-secret-access-key": "${{ secrets.TEST_AWS_SECRET_ACCESS_KEY }}",
            "aws-region": "${{ secrets.AWS_REGION || 'eu-central-1' }}"
          }
        },
        {
          name: "Generate random stage ID",
          id: "stage",
          run: 'echo "STAGE_ID=test-$(shuf -i 10000-99999 -n 1)" >> $GITHUB_OUTPUT'
        },
        {
          name: "Deploy Test Stack",
          run: "npm run deploy -- -c stage=${{ steps.stage.outputs.STAGE_ID }} --require-approval never --outputs-file=test.output.json",
          env: {
            CDK_DEPLOY_ACCOUNT: "${{ secrets.AWS_TEST_ACCOUNT }}",
            CDK_DEPLOY_REGION: "${{ secrets.AWS_REGION || 'eu-central-1' }}"
          }
        },
        {
          name: "Configure AWS credentials for test account",
          uses: "aws-actions/configure-aws-credentials@v1",
          with: {
            "role-to-assume":
              "arn:aws:iam::${{ secrets.AWS_TEST_ACCOUNT }}:role/github-actions-role",
            "aws-region": "${{ secrets.AWS_REGION || 'eu-central-1' }}"
          }
        },
        {
          name: "Verify identity (TEST)",
          run: "aws sts get-caller-identity"
        },
        {
          name: "Verify IoT endpoint (TEST)",
          run: "aws iot describe-endpoint --endpoint-type iot:Data-ATS"
        },
        {
          name: "Run E2E Tests",
          run: "npm run test:e2e",
          env: {
            STAGE: "${{ steps.stage.outputs.STAGE_ID }}"
          }
        },
        {
          name: "Destroy Test Stack",
          if: "always()",
          run: "npm run destroy -- -c stage=${{ steps.stage.outputs.STAGE_ID }} --force",
          env: {
            CDK_DEPLOY_ACCOUNT: "${{ secrets.AWS_TEST_ACCOUNT }}",
            CDK_DEPLOY_REGION: "${{ secrets.AWS_REGION || 'eu-central-1' }}"
          }
        }
      ]
    },
    deploy_dev: {
      ...jobDefaults,
      needs: ["test"],
      if: "github.event_name == 'pull_request'",
      steps: [
        ...jobDefaults.steps,
        {
          name: "Configure AWS credentials",
          uses: "aws-actions/configure-aws-credentials@v4",
          with: {
            "aws-access-key-id": "${{ secrets.AWS_ACCESS_KEY_ID }}",
            "aws-secret-access-key": "${{ secrets.AWS_SECRET_ACCESS_KEY }}",
            "aws-region": "${{ secrets.AWS_REGION || 'eu-central-1' }}"
          }
        },
        {
          name: "Deploy Dev",
          run: "npm run deploy -- -c stage=dev --require-approval never --outputs-file=test.output.json",
          env: {
            CDK_DEPLOY_ACCOUNT: "${{ secrets.AWS_DEV_ACCOUNT }}",
            CDK_DEPLOY_REGION: "${{ secrets.AWS_REGION || 'eu-central-1' }}"
          }
        }
      ]
    },
    deploy_prod: {
      ...jobDefaults,
      needs: ["test"],
      if: "github.ref == 'refs/heads/main' && github.event_name == 'push'",
      steps: [
        ...jobDefaults.steps,
        {
          name: "Configure AWS credentials",
          uses: "aws-actions/configure-aws-credentials@v4",
          with: {
            "aws-access-key-id": "${{ secrets.AWS_ACCESS_KEY_ID }}",
            "aws-secret-access-key": "${{ secrets.AWS_SECRET_ACCESS_KEY }}",
            "aws-region": "${{ secrets.AWS_REGION || 'eu-central-1' }}"
          }
        },
        {
          name: "Deploy Prod",
          run: "npm run deploy -- -c stage=prod --require-approval never --outputs-file=test.output.json",
          env: {
            CDK_DEPLOY_ACCOUNT: "${{ secrets.AWS_PROD_ACCOUNT }}",
            CDK_DEPLOY_REGION: "${{ secrets.AWS_REGION || 'eu-central-1' }}"
          }
        }
      ]
    }
  })
}
