module.exports = {
  "root": true,
  "extends": ["eslint-config-mitodl", "eslint-config-mitodl/flow", "eslint-config-mitodl/mocha"],
  "rules": {
      "operator-linebreak": "off"
  },
  "settings": {
    "react": {
      "version": "16.4.0",
      "flowVersion": "0.94.0" // Flow version
    }
  }
}
