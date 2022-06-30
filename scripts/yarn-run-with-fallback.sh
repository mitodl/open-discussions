#!/usr/bin/env node
const execSh = require('exec-sh')
const path = require("path")

const jsonPath = path.resolve(process.env.INIT_CWD, "package.json")
const package = require(jsonPath)

const getCommand = () => {
  const [preferred, fallback] = process.argv.slice(2)
  if (package.scripts[preferred] !== undefined) return preferred
  if (!fallback) {
    throw new Error("No fallback provided.")
  }
  return fallback
}

execSh(`yarn run ${getCommand()}`)