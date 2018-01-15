"use strict";
import chai, {expect} from 'node_modules/chai/chai.js';
import sinon from 'src/external/sinon-3.2.1.js';
import sinonChai from 'node_modules/sinon-chai/lib/sinon-chai.js';
chai.use(sinonChai);

describe('simple', function() {
  it('simple div1', () => {
    let div = <div>Hello</div>;
    
    expect(div).to.have.property('tagName', 'DIV');
    expect(div).to.have.property('innerHTML', 'Hello');
  });
});

describe('async support for WebComponents', function() {
  //this.timeout = 30000;
  it('simple WebComponent', async done => {
    let prom = <add-knot>Hello</add-knot>;
    expect(prom).to.be.an.instanceof(Promise);

    let editor = await prom;
    expect(editor).to.have.property('tagName', 'ADD-KNOT');
    expect(editor).to.have.property('innerHTML', 'Hello');
    expect(editor.afterSubmit).to.be.a('function');

    done();
  });
  it('nested WebComponent', async done => {
    let prom = <div><add-knot>Hello</add-knot></div>;
    expect(prom).to.be.an.instanceof(Promise);

    let div = await prom;
    expect(div).to.have.property('tagName', 'DIV');
    let addKnot = div.querySelector('add-knot');
    expect(addKnot).to.have.property('innerHTML', 'Hello');
    expect(addKnot.afterSubmit).to.be.a('function');

    done();
  });
  it('support CodeMirror', async done => {
    let prom = <lively-code-mirror>Hello</lively-code-mirror>;
    expect(prom).to.be.an.instanceof(Promise);

    let editor = await prom;
    expect(editor).to.have.property('tagName', 'LIVELY-CODE-MIRROR');
    expect(editor.editor.getValue()).to.equal('Hello');

    done();
  });
});
