/**
 Goal here is to not copy-paste many package.json scripts.

 `node yarn-run-with-fallback.js script1 script2` will run script 1 if it exists
 and script 2 if it does not. This is useful when combined with foreach and
 global yarn commands (See https://yarnpkg.com/getting-started/qa#how-to-share-scripts-between-workspaces).

 For example

   yarn workspaces foreach exec node ${PROJECT_CWD}/scripts/yarn-run-with-fallback.js some-script global:some-script

 will run `some-script` in every workspace in which it exists, and will
 fallback to `globa:some-script` if it does not exist in that workspace.

 NOTES:
 ======
 INIT_CWD and PROJECT_CWD are two yarn environment variables.
 See https://yarnpkg.com/advanced/lifecycle-scripts#environment-variables 
*/

const execSh = require('exec-sh')
const path = require("path")

const { INIT_CWD, PROJECT_CWD } = process.env;

const jsonPath = path.resolve(INIT_CWD, "package.json")
const package = require(jsonPath)

const getScriptName = () => {
  const [preferred, fallback] = process.argv.slice(2)
  if (package.scripts?.[preferred] !== undefined) return preferred
  if (!fallback) {
    throw new Error("No fallback provided.")
  }
  console.log(`Command "${preferred}" not found. Running "${fallback} instead."`)
  return fallback
}

const run = () => {
  if (PROJECT_CWD === INIT_CWD) {
    console.log(`Skipping. This is project root.`)
    return
  }
  const command = `yarn run ${getScriptName()}`;
  console.log(`Running "${command}" in ${process.cwd()}.`)
  execSh(command)
}

run()