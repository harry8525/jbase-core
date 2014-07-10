import Control = require('Control');

class SubControl extends Control {

  public constructor() {
    super();

    this.events.autoWire();
  }

  public renderHtml() : string {
    return "hello world";
  }

}

export = SubControl;
