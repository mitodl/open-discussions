module.exports = {
  parser:   "@typescript-eslint/parser",
  plugins:  ["@typescript-eslint"],
  extends:  ["eslint-config-mitodl", "plugin:@typescript-eslint/recommended"],
  settings: {
    react: {
      version: "16.14.0",
    },
  },
  env: {
    browser: true,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "_" }],
    camelcase:                           [
      "error",
      {
        properties: "never",
      },
    ],
  },
  overrides: [
    {
      files:   ['**/?(*.)+(test).[jt]s?(x)'],
      extends: ['plugin:testing-library/react'],
      env:     {
        jest: true,
      },
    },
  ],
}
