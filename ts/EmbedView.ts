import Control = require('Control');
import SharedControl = require('SharedControl');
import SubControl = require('SubControl');

class EmbedView extends Control {
  public child: SharedControl;
  public child2: SubControl;

  constructor() {
    super();
    this.events.autoWire();

    this.child = new SharedControl();
    this.child2 = new SubControl();
  }

  public onRenderHtml() {
    return 'im EmbedView and my child says: ' + this.child.renderHtml() + ' ' + this.child2.renderHtml();
  }
}

export = EmbedView;
