import Control = require('Control');
import SharedControl = require('SharedControl');

class SetView extends Control {
  public child: SharedControl;

  constructor() {
    super();

    this.child = new SharedControl();
  }

  public renderHtml() {
    return 'im SetView and my child says: ' + this.child.renderHtml();
  }
}

export = SetView;
