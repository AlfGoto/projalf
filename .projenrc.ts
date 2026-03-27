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
  peerDeps: ["projen@*"],
  peerDependencyOptions: {
    pinnedDevDependency: false
  },
  description: "A projen project made to help use the aws-cdk"
})

project.eslint?.addRules({
  "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
  "@stylistic/semi": ["error", "never"],
  "@stylistic/consistent-quotes": ["off"],
  "@stylistic/quote-props": ["off"],
  "@stylistic/member-delimiter-style": ["off"],
  "@stylistic/comma-dangle": ["error", "never"],
  "@stylistic/max-len": [
    "error",
    {
      code: 100,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreComments: true,
      ignoreRegExpLiterals: true
    }
  ]
})

project.synth()
