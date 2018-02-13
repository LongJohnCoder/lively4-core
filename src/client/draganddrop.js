import { pt } from 'src/client/graphics.js';
import { debounce, through, asDragImageFor, getObjectFor, removeTempKey } from "utils";
import { letsScript } from 'src/client/vivide/vivide.js';

export function applyDragCSSClass() {
  this.addEventListener('dragenter', evt => {
    this.classList.add("drag");
  }, false);
  this.addEventListener('dragleave', evt => {
    this.classList.remove("drag");
  }, false);
  this.addEventListener('drop', evt => {
    this.classList.remove("drag");
  });
}

function appendToBodyAt(node, evt) {
  document.body.appendChild(node);
  lively.showPoint(pt(evt.clientX, evt.clientY));
  lively.setGlobalPosition(node, pt(evt.clientX, evt.clientY));
}

//class DataTransferItemHandler {
//  handle() {
//    
//  }
//}

class DropOnBodyHandler {
  constructor(mimeType, handler) {
    this.mimeType = mimeType;
    this.handler = handler;
  }
  
  handle(evt) {
    const dt = evt.dataTransfer;
    if(!dt.types.includes(this.mimeType)) { return false; }
    
    const element = this.handler(dt.getData(this.mimeType));
    if(element) {
      appendToBodyAt(element, evt);
      return true;
    } else {
      return false;
    }
  }
}

const dropOnDocumentBehavior = {
  
  removeListeners() {
    lively.removeEventListener("dropOnDocumentBehavior", document);
  },
  
  load() {
    // #HACK: we remove listeners here, because this module is called three times (without unloading in between!!)
    this.removeListeners();
    lively.addEventListener("dropOnDocumentBehavior", document, "dragover", ::this.onDragOver);
    lively.addEventListener("dropOnDocumentBehavior", document, "drop", ::this.onDrop);
    
    this.handlers = [
      // vivide list
      {
        handle(evt) {
          const dt = evt.dataTransfer;
          if(!dt.types.includes("vivide/list-input")) { return false; }
          const tempKey = dt.getData("vivide/list-input");
          const data = getObjectFor(tempKey);
          removeTempKey(tempKey);
          letsScript(data, evt);
          return true;
        }
      },

      // move a desktop item
      {
        handle(evt) {
          const dt = evt.dataTransfer;
          if(!dt.types.includes("desktop-icon/object")) { return false; }
          const tempKey = dt.getData("desktop-icon/object");
          const icon = getObjectFor(tempKey);
          removeTempKey(tempKey);

          const offset = dt.types.includes("desktop-icon/offset") ?
            JSON.parse(dt.getData("desktop-icon/offset")) :
            pt(0, 0);
          lively.setGlobalPosition(icon, pt(evt.clientX, evt.clientY).subPt(offset));
          return true;
        }
      },

      // knot/url to desktop item
      {
        handle(evt) {
          const dt = evt.dataTransfer;
          if(!dt.types.includes("knot/url")) { return false; }
          const knotURL = dt.getData("knot/url");

          lively.create('knot-desktop-icon')
            ::through(icon => lively.setGlobalPosition(icon, pt(evt.clientX, evt.clientY)))
            .then(icon => icon.knotURL = knotURL);

          return true;
        }
      },
      
      new DropOnBodyHandler('text/uri-list', urlString => {
        if (!urlString.match(/^data\:image\/png/)) { return false; }
        
        return <img class="lively-content" src={urlString}></img>;
      }),
      
      // open javascript/object in inspector
      {
        handle(evt) {
          const dt = evt.dataTransfer;
          if(!dt.types.includes("javascript/object")) { return false; }
          const tempKey = dt.getData("javascript/object");
          
          lively.openInspector(getObjectFor(tempKey), pt(
            evt.clientX,
            evt.clientY).subPt(lively.getGlobalPosition(document.body)));
          removeTempKey(tempKey);

          return true;
        }
      },
      
      new DropOnBodyHandler('text/uri-list', urlString => {
        return <a class="lively-content" href={urlString} click={event => {
          // #TODO make this bevior persistent?
          event.preventDefault();
          lively.openBrowser(urlString);
          return true;
        }}>
          {urlString.replace(/.*\//,"")}
        </a>;
      }),

      new DropOnBodyHandler('text/html', htmlString => {
        const div = <div></div>;
        div.innerHTML = htmlString;

        return div;
      }),

      new DropOnBodyHandler('text/plain', text => {
        return <p>{text}</p>;
      })
    ];
  },
  
  onDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  },

  handleFiles(evt) {
    const files = evt.dataTransfer.files;

    if(files.length === 0) { return false; }

    lively.notify(`Dropped ${files.length} file(s).`);
    Array.from(files).forEach(async (file) => {
        const extension = lively.files.extension(file.name)
        if (extension == "png") {
            // #Refactor #TODO use lively.files.readBlobAsDataURL
            const reader = new FileReader();
            reader.onload = event => {
              const dataURL = event.target.result.replace(/^data\:image\/png;/, `data:image/png;name=${file.name};`);
              const img = <img class="lively-content" src={dataURL}></img>;
              appendToBodyAt(img, evt);
            };
            reader.readAsDataURL(file); 
        } else if (extension == "html") {
          var source = await lively.files.readBlobAsText(file)
          lively.clipboard.pasteHTMLDataInto(source, document.body, false, lively.getPosition(evt));
        } else {
//           var div = <div class="lively-file">
//             <i class="fa fa-file-o" style="font-size: 30px" aria-hidden="true"></i>
//             <div id="name"><a>{file.name}</a></div>
//           </div>
//           appendToBodyAt(div, evt);
//           div.querySelector("#name a").setAttribute("href", await lively.files.readBlobAsDataURL(file))
          
          var item = await lively.create("lively-file")
          item.classList.add("lively-content") // for persistence
          // #TODO check for existing "file"
          item.name = file.name
          appendToBodyAt(item, evt);
          item.url = await lively.files.readBlobAsDataURL(file) 
        }
      });
    return true;
  },
  
  async onDrop(evt) {
    const dt = evt.dataTransfer;
    
    /*
    console.group("Drop Event on body");
    console.log(dt);
    console.log(`#files ${dt.files.length}`);
    console.log(Array.from(dt.items));
    lively.notify(Array.from(dt.types).join(" "));
    console.groupEnd();
    */

    evt.stopPropagation();
    evt.preventDefault();
    
    if(this.handleFiles(evt)) { return; }

    if(Array.from(dt.types).length > 0) {
      if(this.handlers.find(handler => handler.handle(evt))) {
        return;
      }
    }
    
    lively.warn("Dragged content contained neighter files nor handled items");
  }
}

export function __unload__() {
  dropOnDocumentBehavior.removeListeners();
}

dropOnDocumentBehavior.load()