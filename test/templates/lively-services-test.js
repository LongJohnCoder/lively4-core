import Services from '../../templates/classes/Services.js';
import {expect} from '../../node_modules/chai/chai.js';
import {loadComponent} from './templates-fixture.js';

describe("Services Tool",  function() {
  var that, listRefreshed = false, logRefreshed = false;

  var checkListRefreshed = function(done) {
    if (listRefreshed) {
      return done();
    }
    setTimeout(function() {checkListRefreshed(done);}, 1000);
  };

  var checklogRefreshed = function(done) {
    if (listRefreshed) {
      return done();
    }
    setTimeout(function() {checklogRefreshed(done);}, 1000);
  };

  var getItems = function(c) {
    return that.serviceList.querySelectorAll('lively-services-item');
  };
 
  before("load", function(done){
    this.timeout(15000);
    Services.prototype.refreshServiceList = function() { listRefreshed = true; };
    Services.prototype.refreshLog = function() { logRefreshed = true; };
    loadComponent("lively-services").then(c => {
      that = c;
      done();
    });
  });

  after("unload", function(done) {
    that.unload();
    done();
  });
  
  it("should refresh automatically", function(done) {
    this.timeout(8000);
    checkListRefreshed(done);
  });
  
  it("should list, select, and remove services", function(done) {
    var fakeServices = {
      '1': {
        'entryPoint': 'foo.js',
        'status': 0,
        'start': Date.now()
      },
      '42': {
        'entryPoint': 'bar.js',
        'status': 1,
        'start': Date.now()
      }
    };
    that.listServices(fakeServices);
    var items = getItems();
    expect(items.length).to.be.equal(2);

    items[1].click();

    var selected = that.removeAllItems();
    expect(selected).to.be.equal('42');

    items = getItems();
    expect(items.length).to.be.equal(0);

    that.listServices({});
    var emptyItem = that.serviceList.querySelectorAll('.empty');
    expect(emptyItem).to.not.be.null;

    checklogRefreshed(done);
  });

});


