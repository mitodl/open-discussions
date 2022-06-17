#!/bin/bash
export TMP_FILE=$(mktemp)
export NODE_ENV=test

if [[ ! -z "$COVERAGE" ]]
then
    export CMD="npx nyc --reporter=html mocha"
elif [[ ! -z "$CODECOV" ]]
then
    export CMD="npx nyc --reporter=lcovonly -R spec mocha"
elif [[ ! -z "$WATCH" ]]
then
    export CMD="npx mocha --watch"
else
    export CMD="npx mocha"
fi

export FILE_PATTERN=${1:-'"src/**/*/*_test.js"'}
CMD_ARGS="$FILE_PATTERN --exit"

# Second argument (if specified) should be a string that will match specific test case descriptions
#
# EXAMPLE:
#   (src/SomeComponent_test.js)
#   it('should test basic arithmetic') {
#     assert.equal(1 + 1, 2);
#   }
#
#   (in command line...)
#   > ./js_test.sh src/SomeComponent_test.js "should test basic arithmetic"
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
    grep -v "process.on(SIGPROF) is reserved while debugging" |
    grep -v "Browserslist: caniuse-lite is outdated" |
    grep -v "browserslist" |
    grep -v "" |
    grep -v "Why you should do it regularly:" |
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
