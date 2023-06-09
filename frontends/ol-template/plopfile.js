import { fileURLToPath } from "node:url"
import path from "node:path"

/**
 * @param {import('plop').NodePlopAPI} plop
 */
export default function(plop) {
  const dirName = path.dirname(fileURLToPath(import.meta.url))
  const packagePath = path.resolve(dirName, "../")

  plop.setGenerator("package", {
    description: "Local Node package.",
    prompts:     [
      {
        type:    "input",
        name:    "name",
        message: "What is the package name?"
      }
    ],
    actions: [
      {
        type:          "addMany",
        base:          "plop-templates/package/",
        destination:   path.join(packagePath, "{{name}}"),
        templateFiles: "plop-templates/package/**"
      },
      data => {
        const { name } = data

        console.log(`Created package ${name}.

Run 'yarn install' to make package available locally.

Some useful commands:
  yarn workspace ${name} global:test          # Run tests for just this package.
  yarn workspace ${name} global:test-watch    # Watch tests for just this package.
`)
      }
    ]
  })
}
