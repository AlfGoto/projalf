import { cdk, javascript } from "projen"

const project = new cdk.JsiiProject({
  author: "Alf",
  authorAddress: "alfgoto@gmail.com",
  defaultReleaseBranch: "main",
  name: "projalf",
  projenrcTs: true,
  repositoryUrl: "git@github.com:AlfGoto/projalf.git",
  packageManager: javascript.NodePackageManager.NPM,

  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // deps: ["projen@*"],
  // packageName: undefined,  /* The "name" in package.json. */
  peerDeps: ["projen@>=0.96.1 <1.0.0"],
  peerDependencyOptions: {
    pinnedDevDependency: false
  },
  description: "A projen project made to help use the aws-cdk",
  prettier: true,
  prettierOptions: {
    settings: {
      semi: false,
      singleQuote: false,
      trailingComma: javascript.TrailingComma.NONE,
      printWidth: 100
    }
  }
})

project.synth()
