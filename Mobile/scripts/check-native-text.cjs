// React Native rejects even a literal space directly inside View/ScrollView.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../src');
const errors = [];
for (const name of fs.readdirSync(root, { recursive: true }).filter(n => n.endsWith('.tsx'))) {
  const file = path.join(root, name);
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxText(node) && !node.containsOnlyTriviaWhiteSpaces && node.parent.openingElement?.tagName.getText(source) !== 'Text') {
      errors.push(`${name}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}: text outside <Text>: ${JSON.stringify(node.text)}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('PASS: no literal JSX text outside Text in mobile screens/components.');
