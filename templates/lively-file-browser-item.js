import Morph from "./Morph.js"

export default class FileBrowserItem extends Morph {
  set name(value) {
    this.get('#item-name').innerHTML = value
  }

  set type(value) {
    // this.classList.remove("class-type")

    switch(value) {
      case 'directory':
        this._setIcon('fa-folder-o')
        // this.classList.add("class-type")
        break
      default:
        this._setIcon('fa-file-o')
    }
  }

  _setIcon(iconClass) {
    this.get('#item-icon').classList.add(iconClass);
  }
}
