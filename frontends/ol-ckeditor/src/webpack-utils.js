const { styles } = require("@ckeditor/ckeditor5-dev-utils")
const { CKEditorTranslationsPlugin } = require('@ckeditor/ckeditor5-dev-translations')

const ckeditorRules = [
  {
    test: /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,
    use:  ["raw-loader"]
  },
  {
    test: /ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/,
    use:  [
      {
        loader:  "style-loader",
        options: {
          injectType: "singletonStyleTag",
          attributes: {
            "data-cke": true
          }
        }
      },
      "css-loader",
      {
        loader:  "postcss-loader",
        options: {
          postcssOptions: styles.getPostCssConfig({
            themeImporter: {
              themePath: require.resolve("@ckeditor/ckeditor5-theme-lark")
            },
            minify: true
          })
        }
      }
    ]
  }
]


/**
 * CKEditor distributes its npm packages as pre-bundled, ready-to-use modules,
 * or as un-built modules for greater customization. This takes care of building
 * CKEditor.
 *
 * To use this with a webpack config, two things need to be done:
 * 1. Call `withCKeditor` on your config
 * 2. Exclude ckeditor's packages from any CSS/SCSS processing module rules you
 *    use. Appropriate rules will be added for them here.
 *    Typically, this is done via `exclude: /@ckeditor/` in module rule definitions.
 *
 * For more, see:
 *  - https://ckeditor.com/docs/ckeditor5/latest/installation/advanced/alternative-setups/integrating-from-source.html
 *
 * @param { import('webpack').Configuration } config
 */
const withCKEditor = config => {
  const modified = {
    ...config,
  }
  modified.module.rules = [...modified.module.rules, ...ckeditorRules]
  modified.plugins = [
    ...modified.plugins,
    new CKEditorTranslationsPlugin({
      language:                               "en",
      addMainLanguageTranslationsToAllAssets: true
    })
  ]
  return modified
}

module.exports = { withCKEditor }
