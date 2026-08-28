const ts = require('typescript')

module.exports = function testbedTsxLoader(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: 'remix/ui',
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
    },
    fileName: this.resourcePath,
  }).outputText
}
