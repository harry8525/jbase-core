import Control = require('Control');

class SubControl extends Control {

  public constructor() {
    super();
    this.events.autoWire();

  }
}

export = SubControl;
