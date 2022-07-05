TS_DECLARATION_DIR="${INIT_CWD}/build"

for i in $(find ${TS_DECLARATION_DIR} -type f -name "*.d.ts");
  do sh -c "flowgen $i -o ${i%.*.*}.js.flow --add-flow-header";
done;