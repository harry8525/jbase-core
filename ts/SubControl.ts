import Control = require('Control');

class SubControl extends Control {

  public constructor() {
    super();
    this.events.autoWire();
  }

  public onRenderHtml(dataContext: any) : string {
    return '<div>Sub control</div>';
  }
}

export = SubControl;
