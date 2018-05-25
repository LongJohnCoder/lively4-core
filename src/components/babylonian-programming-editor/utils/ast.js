import { babel } from 'systemjs-babel-build';
const {
  traverse,
  template,
  types,
  transform,
  transformFromAst
} = babel;

import LocationConverter from "./location-converter.js";
import DefaultDict from "./default-dict.js";
import { defaultBabylonConfig } from "./defaults.js";

/**
 * Creates a deep copy of arbitrary objects.
 * Does not copy functions!
 */
export const deepCopy = (obj) => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch(e) {
    console.warn("Could not deeply clone object", obj);
    return Object.assign({}, obj);
  }
}

/**
 * Generates a locationMap for the AST
 */
export const generateLocationMap = (ast) => {
  ast._locationMap = new DefaultDict(Object);

  traverse(ast, {
    enter(path) {
      let location = path.node.loc;
      if(!location) {
        return;
      }
      
      // Some Nodes are exceptions
      if(path.isReturnStatement()) {
        // ReturnStatements are associated with the "return" keyword
        location.end.line = location.start.line;
        location.end.column = location.start.column + "return".length;
      } else if(path.isForStatement()) { //TODO: All loops
        // Loops are associated with their keywords
        location.end.line = location.start.line;
        location.end.column = location.start.column + "for".length;
      }
      
      ast._locationMap[LocationConverter.astToKey(location)] = path;
    }
  });
};

/**
 * Checks whether a path can be probed
 */
export const canBeProbed = (path) => {
  const isTrackableIdentifier = (path.isIdentifier() || path.isThisExpression())
                                 && (!path.parentPath.isMemberExpression()
                                     || path.parentKey === "object")
                                 && (path.parentPath !== path.getFunctionParent());
  const isTrackableMemberExpression = path.isMemberExpression();
  const isTrackableReturnStatement = path.isReturnStatement();
  return isTrackableIdentifier
         || isTrackableMemberExpression
         || isTrackableReturnStatement;
}

/**
 * Checks whether a path can be a slider
 */
export const canBeSlider = (path) => {
  const isTrackableIdentifier = path.isIdentifier()
                                && path.parentPath === path.getFunctionParent();
  const isTrackableLoop = path.isLoop();
  return isTrackableIdentifier || isTrackableLoop;
}

/**
 * Checks whether a path can be an example
 */
export const canBeExample = (path) => {
  // We have to be the name of a function
  const functionParent = path.getFunctionParent();
  const isFunctionName = (functionParent
                          && (functionParent.get("id") === path
                              || functionParent.get("key") === path));
  return isFunctionName;
}

/**
 * Checks whether a path can be an instance
 */
export const canBeInstance  = (path) => {
  // We have to be the name of a class
  const isClassName = (path.parentPath.isClassDeclaration() && path.parentKey === "id");
  return isClassName;
}

/**
 * Checks whether a path can be replaced
 */
export const canBeReplaced = (path) => {
  // We have to be the righthand side of an assignment
  return ((path.parentPath.isVariableDeclarator() && path.parentKey === "init")
          || (path.parentPath.isAssignmentExpression() && path.parentKey === "right"));
}

/**
 * Generates a replacement node
 * (to be used as the righthand side of an assignment)
 */
export const replacementNodeForCode = (code) => {
  // The code we get here will be used as the righthand side of an Assignment
  // We we pretend that it is that while parsing
  code = `placeholder = ${code}`;
  try {
    const ast = astForCode(code);
    return ast.program.body[0].expression.right;
  } catch (e) {
    console.warn("Error parsing replacement node", e);
    return null;
  }
}

/**
 * Assigns IDs to add nodes of the AST
 */
export const assignIds = (ast) => {
  let idCounter = 1;
  traverse(ast, {
    enter(path) {
      path.node._id = nextId();
    }
  });
  return ast;
};
const assignId = (node) => {
  node._id = nextId();
  return node;
}
let ID_COUNTER = 1;
const nextId = () => ID_COUNTER++;


/**
 * Applies basic modifications to the given AST
 */
export const applyBasicModifications = (ast) => {
  const wrapPropertyOfPath = (path, property) => {
    const oldBody = path.get(property);
    const oldBodyNode = path.node[property];
    if(!oldBodyNode) {
      return;
    }
    if(oldBody.isBlockStatement && oldBody.isBlockStatement()) {
      // This is already a block
      return;
    } else if(oldBody instanceof Array) {
      const newBodyNode = prepForInsert(types.blockStatement(oldBodyNode));
      path.node[property] = [newBodyNode];
    } else {
      const newBodyNode = prepForInsert(types.blockStatement([oldBodyNode]));
      oldBody.replaceWith(newBodyNode);
    }
    return path;
  }
  
  // Enforce that all bodies are in BlockStatements
  traverse(ast, {
    BlockParent(path) {
      if(path.isProgram() || path.isBlockStatement() || path.isSwitchStatement()) {
        return;
      }
      if(!path.node.body) {
        console.warn("A BlockParent without body: ", path);
      }
      
      wrapPropertyOfPath(path, "body");
    },
    IfStatement(path) {
      for(let property of ["consequent", "alternate"]) {
        wrapPropertyOfPath(path, property);
      }
    },
    SwitchCase(path) {
      console.log(path);
      wrapPropertyOfPath(path, "consequent");
    }
  });
}

/**
 * Applies replacement markers to the given AST
 */
export const applyReplacements = (ast, replacements) => {
  replacements.forEach((replacement) => {
    const replacementNode = replacementNodeForCode(replacement.code);
    if(!replacementNode) {
      return;
    }
    const path = ast._locationMap[replacement.location];
    if(path.parentPath.isVariableDeclarator()) {
      path.parent.init = replacementNode;
    } else {
      path.replaceWith(replacementNode);
    }
  });
};

/**
 * Applies probe markers to the given AST
 */
export const applyProbes = (ast, annotations) => {
  const trackedNodes = annotations.map((a) => ast._locationMap[a.location].node);

  traverse(ast, {
    Identifier(path) {
      if(!trackedNodes.includes(path.node)) return;
      insertIdentifierTracker(path);
    },
    MemberExpression(path) {
      if(!trackedNodes.includes(path.node)) return;
      insertIdentifierTracker(path);
    },
    ThisExpression(path) {
      if(!trackedNodes.includes(path.node)) return;
      insertIdentifierTracker(path);
    },
    ReturnStatement(path) {
      if(!trackedNodes.includes(path.node)) return;
      insertReturnTracker(path);
    },
    BlockStatement(path) {
      insertBlockTracker(path);
    },
    Program(path) {
      insertBlockTracker(path);
    }
  });
};

/**
 * Applies instances to the given AST
 */
export const applyInstances = (ast, instances) => {
  instances.forEach((instance) => {
    let instanceNode = replacementNodeForCode(instance.code);
    if(!instanceNode) {
      instanceNode = types.nullLiteral();
    }
    const path = ast._locationMap[instance.location];
    if(!path.node._exampleInstances) {
      path.node._exampleInstances = {
        "0": types.nullLiteral()
      };
    }
    path.node._exampleInstances[instance.id] = instanceNode;
  });
}

/**
 * Applies example markers to the given AST
 */
export const applyExamples = (ast, examples) => {
  // Prepare templates to insert
  const functionCall = template("ID.apply(null, PARAMS)");
  const staticMethodCall = template("CLASS.ID.apply(null, PARAMS)");
  const objectMethodCall = template("CLASS.prototype.ID.apply(THIS, PARAMS)");
  
  // Distinguish between class- and function examples
  /*const functionExamples = examples.filter((example) => {
    const nodePath = ast._locationMap[example.location];
    nodePath.node._replacementNode
    if(nodePath.parentPath.isClassDeclaration()) {
      //nodePath.node._exampleInstance = replacementNodeForCode(example.code);
      return false;
    } else {
      return true;
    }
  })*/
  
  // Apply the markers
  examples.forEach((example) => {
    let parametersNode = replacementNodeForCode(example.code);
    if(!parametersNode) {
      parametersNode = types.nullLiteral();
    }
    const path = ast._locationMap[example.location];
    const functionParent = path.getFunctionParent()
    let nodeToInsert;
    
    // Distinguish between Methods and Functions
    if(functionParent.isClassMethod()) {
      // We have a method
      const classIdNode = functionParent.getStatementParent().get("id").node;
      
      // Distinguish between static and object methods
      if(functionParent.node.static) {
        nodeToInsert = staticMethodCall({
          CLASS: types.identifier(classIdNode.name),
          ID: types.identifier(path.node.name),
          PARAMS: parametersNode
        });
      } else {
        // Get the example instance
        nodeToInsert = objectMethodCall({
          CLASS: types.identifier(classIdNode.name),
          ID: types.identifier(path.node.name),
          THIS: classIdNode._exampleInstances[example.instanceId],
          PARAMS: parametersNode
        });
      }
    } else {
      nodeToInsert = functionCall({
        ID: types.identifier(path.node.name),
        PARAMS: parametersNode
      });
    }
    
    // Insert a call at the end of the script
    if(nodeToInsert) {
      ast.program.body.push(template(`window.__tracker.exampleId = "${example.id}"`)());
      ast.program.body.push(nodeToInsert);
    }
  });
}

/**
 * Insers an appropriate tracker for the given identifier path
 */
const insertIdentifierTracker = (path) => {
  // Prepare Trackers
  const tracker = template("window.__tracker.id(ID, window.__tracker.exampleId, __blockCount, VALUE, NAME)")({
    ID: types.numericLiteral(path.node._id),
    VALUE: deepCopy(path.node),
    NAME: types.stringLiteral(stringForPath(path))
  });

  // Find the closest parent statement
  let statementParentPath = path.getStatementParent();

  // We have to insert the tracker at different positions depending on
  // the context of the tracked Identifier
  // TODO: Handle switch
  if(path.parentKey === "params") {
    // We are in a parameter list
    // Prepend tracker to body of function
    const functionParentPath = path.getFunctionParent();
    functionParentPath.get("body").unshiftContainer("body", tracker);
  } else if(statementParentPath.isReturnStatement()) {
    // We are in a return statement
    // Prepend the tracker to the return
    statementParentPath.insertBefore(tracker);
  } else if(statementParentPath.isBlockParent()) {
    // We are in a block
    // Insert into the block body
    const body = statementParentPath.get("body");
    if(body instanceof Array) {
      body.unshift(tracker);
    } else if (body.isBlockStatement()) {
      body.unshiftContainer("body", tracker);
    } else {
      body.replaceWith(
        types.blockStatement([
          body
        ])
      );
      body.unshiftContainer("body", tracker);
    }
  } else if(statementParentPath.isIfStatement()) {
    // We are in an if
    // We have to insert the tracker before the if
    statementParentPath.insertBefore(tracker);
  } else if(path.parentPath.isVariableDeclarator()
            && path.parentKey === "id") {
    // Declaration - only track value after
    statementParentPath.insertAfter(tracker);
  } else {
    // Normal statement - track value before and after
    statementParentPath.insertBefore(tracker);
    statementParentPath.insertAfter(tracker);
  }
};

/**
 * Insers an appropriate tracker for the given return statement
 */
const insertReturnTracker = (path) => {
  const returnTracker = template("window.__tracker.id(ID, window.__tracker.exampleId, __blockCount, VALUE, NAME)")({
    ID: types.numericLiteral(path.node._id),
    VALUE: path.node.argument,
    NAME: types.stringLiteral("return")
  });
  path.get("argument").replaceWith(returnTracker);
}

/**
 * Inserts a tracker to check whether a block was entered
 */
const insertBlockTracker = (path) => {
  if(typeof path.node._id === "undefined") {
    return;
  }
  const blockId = template("const __blockId = ID")({
    ID: types.numericLiteral(path.node._id)
  });
  const tracker = template("const __blockCount = window.__tracker.block(window.__tracker.exampleId, __blockId)")();
  path.unshiftContainer("body", tracker);
  path.unshiftContainer("body", blockId);
};

/**
 * Returns a list of parameter names for the given function Identifier
 */
export const parameterNamesForFunctionIdentifier = (path) => {
  let parameterIdentifiers = path.getFunctionParent().get("params");
  return parameterIdentifiers.map(id => id.node.name);
}

/**
 * Parses code and returns the AST
 */
export const astForCode = (code) =>
  transform(code, Object.assign({}, defaultBabylonConfig(), {
    code: false,
    ast: true
  })).ast

/**
 * Generates executable code for a given AST
 */
export const codeForAst = (ast) =>
  transformFromAst(ast, Object.assign({}, defaultBabylonConfig(), {
    code: true,
    ast: false
  })).code;


const stringForPath = (path) => {
  if(path.isIdentifier()) {
    return path.node.name;
  } else if(path.isThisExpression()) {
    return "this";
  } else if(path.isMemberExpression()) {
    return `${stringForPath(path.get("object"))}.${stringForPath(path.get("property"))}`;
  } else {
    return "";
  }
}

export const bodyForPath = (path) => {
  if(path.node.body) {
    return path.get("body");
  } else if(path.parentPath.node.body) {
    return path.parentPath.get("body");
  }
  return null;
}

const assignLocationToBlockStatement = (node) => {
  if(node.body.length) {
    node.loc = {
      start: node.body[0].loc.start,
      end: node.body[node.body.length - 1].loc.end
    }
  } else {
    node.loc = {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 0 }
    };
  }
  return node;
}

const prepForInsert = (node) => {
  assignId(node);
  if(node.type === "BlockStatement") {
    assignLocationToBlockStatement(node);
  }
  return node;
}
