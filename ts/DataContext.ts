import EventGroup = require('EventGroup');

class DataContext {
  private events: EventGroup;

  public constructor() {
    this.events = new EventGroup(this);
    this.events.declare('change');
  }

  public dispose() {
    this.events.dispose();
  }

  public setData(data: any, forceChange?: boolean) {
    var hasChanged = false;

    for (var i in data) {
      if (data.hasOwnProperty(i)) {
        var oldValue = this[i];
        var newValue = data[i];

        if (oldValue !== newValue) {
          if (oldValue && EventGroup.isDeclared(oldValue, 'change')) {
            this.events.off(oldValue);
          }
          this[i] = newValue;
          hasChanged = true;
          if (newValue && EventGroup.isDeclared(newValue, 'change')) {
            this.events.on(newValue, 'change', this.change);
          }
        }
      }
    }

    if (hasChanged || forceChange) {
      this.events.raise('change');
    }
  }

  public change(args) {
    this.events.raise('change', args);
  }
}

export = DataContext;
