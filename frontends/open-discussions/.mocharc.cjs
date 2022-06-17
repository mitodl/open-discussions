module.exports = {
    require: [
        "core-js",
        "regenerator-runtime",
    ],
    // these need to be here because mocha doesn't provide
    // hooks like beforeEach when the file is --require
    file: [
        "src/babelhook.js",
        "src/global_init.js"
    ]
}