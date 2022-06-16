#!/bin/bash
export TMP_FILE=$(mktemp)

if [[ ! -z "$COVERAGE" ]]
then
    export CMD="npx nyc --reporter=html mocha --exit"
elif [[ ! -z "$CODECOV" ]]
then
    export CMD="npx nyc  --reporter=lcovonly -R spec mocha --exit"
elif [[ ! -z "$WATCH" ]]
then
    export CMD="npx mocha --watch"
else
    export CMD="npx mocha --exit"
fi

export FILE_PATTERN=${1:-'"src/**/*/*_test.js"'}
CMD_ARGS="--require ./src/babelhook.js ./src/global_init.js $FILE_PATTERN"

# Second argument (if specified) should be a string that will match specific test case descriptions
#
# EXAMPLE:
#   (./frontends/discussions/src/SomeComponent_test.js)
#   it('should test basic arithmetic') {
#     assert.equal(1 + 1, 2);
#   }
#
#   (in command line...)
#   > ./js_test.sh frontends/discussions/src/SomeComponent_test.js "should test basic arithmetic"
if [[ ! -z "$2" ]]; then
    CMD_ARGS+=" -g \"$2\""
fi

echo "Running: $CMD $CMD_ARGS"

eval "$CMD $CMD_ARGS" 2> >(tee "$TMP_FILE")

export TEST_RESULT=$?

if [[ $TEST_RESULT -ne 0 ]]
then
    echo "Tests failed, exiting with error $TEST_RESULT..."
    rm -f "$TMP_FILE"
    exit 1
fi

if [[ $(
    cat "$TMP_FILE" |
    grep -v 'ignored, nothing could be mapped' |
    grep -v "This browser doesn't support the \`onScroll\` event" |
    grep -v "Accessing PropTypes" |
    grep -v "Accessing createClass" |
    grep -v "Browserslist: caniuse-lite is outdated" |
    grep -v "browserslist" |
    grep -v "" |
    grep -v "Why you should do it regularly:" |
    grep -v "ExperimentalWarning: The fs.promises API is experimental" |
    wc -l |
    awk '{print $1}'
    ) -ne 0 ]]  # is file empty?
then
    echo "Error output found:"
    cat "$TMP_FILE"
    echo "End of output"
    rm -f "$TMP_FILE"
    exit 1
fi

rm -f "$TMP_FILE"
