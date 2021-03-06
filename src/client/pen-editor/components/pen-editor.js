import Morph from 'src/components/widgets/lively-morph.js';

import babelDefault from 'systemjs-babel-build';
const babel = babelDefault.babel;

// https://github.com/babel/babel/blob/8ee24fdfc04870dade1f7318b29bb27b59fdec79/packages/babel-types/src/definitions/core.js
// validator https://github.com/babel/babel/blob/eac4c5bc17133c2857f2c94c1a6a8643e3b547a7/scripts/generators/utils.js
// let nodeTypes = Object.keys(babel.types.ALIAS_KEYS).map(name => babel.types[name])
// nodeTypes.map(n => n.name)
// babel.buildExternalHelpers()
// babel.types.BUILDER_KEYS.IfStatement
// babel.types.NODE_FIELDS.ArrowFunctionExpression.body.validate.oneOfNodeTypes
// babel.types.NODE_FIELDS.BlockStatement.body.validate
// var y = 
//     Object.keys(babel.types.NODE_FIELDS.AssignmentExpression.operator.validate)
// babel.types.identifier('hello')
// babel.types.TYPES[0]
// var x = babel.types.NODE_FIELDS.BlockStatement.body.validate.chainOf[1]
// Object.keys(x.each.oneOfNodeTypes)
// Object.keys(y)
//((babel.types.NODE_FIELDS.BlockStatement.directives.validate).chainOf[1].each).oneOfNodeTypes[0] === 'Directive'

export default class PenEditor extends Morph {
  get ast() { return this.get('#ast'); }
  get fileName() { return this.get('input#fileName'); }
  
  initialize() {
    this.windowTitle = "AST Editor";
    
    this.fileName.value = lively4url + '/src/client/pen-editor/components/example.js';
  }
  
  async setAST(ast) {
    this.__ast__ = ast;
    return this.buildAST(ast);
  }
  
  getAST() {
    return this.__ast__
  }
  
  async buildAST(ast) {
    var astNode = await (<generic-ast-node></generic-ast-node>)
    this.ast.innerHTML = '';
    this.ast.appendChild(astNode);
    astNode.setNode(ast.program)
  }

  livelyMigrate(other) {
    this.setAST(other.getAST())
  }
  
  async livelyExample() {
    await this.loadFile(lively4url + '/src/client/pen-editor/components/example.js');
  }
  
  async loadFile(filePath) {
    const syntaxPlugins = (await Promise.all([
      'babel-plugin-syntax-jsx',
      'babel-plugin-syntax-do-expressions',
      'babel-plugin-syntax-function-bind',
      'babel-plugin-syntax-async-generators'
    ]
      .map(syntaxPlugin => System.import(syntaxPlugin))))
      .map(m => m.default);

    const source = await fetch(filePath).then(r => r.text());
    
    var ast = babel.transform(source, {
      babelrc: false,
      plugins: syntaxPlugins,
      presets: [],
      moduleIds: false,
      sourceMaps: true,
      compact: false,
      comments: true,
      code: true,
      ast: true,
      resolveModuleSource: undefined
    }).ast;
    this.setAST(ast)
  }
  
  async saveFile(filePath) {
    
  }
  
}