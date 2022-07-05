module.exports = {
    require: [
        "core-js",
        "regenerator-runtime",
    ],
    // these need to be here because mocha doesn't provide
    // hooks like beforeEach when the file is --require
    file: [
        "setup_babel_register.js",
        "src/testing_polyfills.js",
        "src/testing_init.js"
    ]
}