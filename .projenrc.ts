import { cdk, javascript } from "projen"

const project = new cdk.JsiiProject({
  author: "Alf",
  authorAddress: "alfgoto@gmail.com",
  defaultReleaseBranch: "main",
  jsiiVersion: "~5.8.0",
  name: "projalf",
  projenrcTs: true,
  repositoryUrl: "git@github.com:AlfGoto/projalf.git",
  packageManager: javascript.NodePackageManager.NPM,

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
  peerDeps: ["projen"],
  description: "A projen project made to help use the aws-cdk",
})

project.eslint?.addRules({
  "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
  "@stylistic/semi": ["error", "never"],
  "@stylistic/consistent-quotes": ["off"],
  "@stylistic/quote-props": ["off"],
  "@stylistic/member-delimiter-style": ["off"],
})

project.synth()
