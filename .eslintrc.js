module.exports = {
  extends:        ["eslint-config-mitodl", "eslint-config-mitodl/jest", "plugin:testing-library/react"],
  plugins:        ["testing-library"],
  ignorePatterns: ["**/build/**"],
  rules:          {
    "@typescript-eslint/no-restricted-imports": ["error", {
      paths: [
        /**
         * No direct imports from "barrel files". They make Jest slow.
         *
         * For more, see:
         *  - https://github.com/jestjs/jest/issues/11234
         *  - https://github.com/faker-js/faker/issues/1114#issuecomment-1169532948
         */
        {
          name:             "@faker-js/faker",
          message:          "Please use @faker-js/faker/locale/en instead.",
          allowTypeImports: true
        },
        {
          name:             "@mui/material",
          message:          "Please use @mui/material/<COMPONENT_NAME> instead.",
          allowTypeImports: true
        },
        {
          name:             "@mui/icons-material",
          message:          "Please use @mui/icons-material/<ICON_NAME> instead.",
          allowTypeImports: true
        }]
    }]
  }
}
