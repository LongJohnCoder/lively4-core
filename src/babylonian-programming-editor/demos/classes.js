// You can also define examples for class methods
class Person {
  constructor(name, hobby) {
    this.name = name
    this.hobby = hobby;
  }
  
  sayHi() {
    console.log(`I'm ${this.name} and I like ${this.hobby}`);
  }
  
  reverseName() {
    this.name = this.name.split("").reverse().join("");
  }
}
/* Examples: {"probes":[{"location":[9,23,9,32]},{"location":[13,4,13,13]}],"sliders":[],"examples":[{"location":[8,2,8,7],"id":"ed15-9cdb-c146","name":"","values":{},"instanceId":"74a4-ee09-1236"},{"location":[12,2,12,13],"id":"c811-ac05-83e1","name":"","values":{},"instanceId":"74a4-ee09-1236"}],"replacements":[],"instances":[{"location":[2,6,2,12],"id":"74a4-ee09-1236","name":"Tommy","values":{"name":"\"Tom\"","hobby":"\"cycling\""}}]} */