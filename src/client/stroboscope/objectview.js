import PropertyView from 'src/client/stroboscope/propertyview.js';

export default class ObjectView
{
  constructor(event){
    this.id = event.object_id;
    this.propertyViews = [0, 1, 2];
    this.indexMap = new Map();
    this.viewsAsArray = [0, 1, 2]
    this.append(event);
  }
  
  append(event){
    if(this.indexMap.has(event.property)){
      var index = this.indexMap.get(event.property);
      this.propertyViews[index].handleEvent(event);
    }
    else
    {
      this.indexMap.set(event.property, this.propertyViews.length);
      this.propertyViews.push(new PropertyView(event))
    }
  }
  
  propertyCount()
  {
    return this.propertyViews.length
  }
}