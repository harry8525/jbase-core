import DataContext = require('DataContext');
import EventGroup = require('EventGroup');

enum ControlState {
  CREATED = 0,
  INACTIVE = 1,
  ACTIVE = 2,
  DISPOSED = 3
}

var INITIALIZE_EVENT ='initialize';
var RENDERHTML_EVENT = 'renderHtml';
var ACTIVATE_EVENT = 'activate';
var EVALUATEVIEW_EVENT = 'evaluateView';
var UPDATEVIEW_EVENT = 'updateView';
var DEACTIVATE_EVENT = 'deactivate';
var DISPOSE_EVENT = 'dispose';

class Control {
  public controlName: string = 'Control';
  public baseTag: string = 'div';
  public baseClass: string = '';
  public baseStyle: string = '';
  public state: number = ControlState.CREATED;
  public events: EventGroup;
  public activeEvents: EventGroup;
  public id: string;
  public element: HTMLElement;
  public parent: Control;
  public children: Control[];

  private static _instanceCount = 0;
  private _dataContext: DataContext;
  private _subElements: HTMLElement[];
  private _hasChanged: boolean;
  private _isEvaluatingView: boolean;

  constructor() {
    this.events = new EventGroup(this);
    this.activeEvents = new EventGroup(this);
    this._dataContext = new DataContext();
    this.events.on(this._dataContext, 'change', this._onDataContextChanged);

    this.events.declare([
      INITIALIZE_EVENT,
      RENDERHTML_EVENT,
      ACTIVATE_EVENT,
      EVALUATEVIEW_EVENT,
      UPDATEVIEW_EVENT,
      DEACTIVATE_EVENT,
      DISPOSE_EVENT
      ]);
  }

  public dispose(): void {
    if (this.state !== ControlState.DISPOSED) {
      this.state = ControlState.DISPOSED;

      this.children.forEach(function(child) {
        child.dispose();
      });

      this.events.raise(DISPOSE_EVENT);

      this.clearChildren();
      this.events.dispose();
      this.activeEvents.dispose();
      this._dataContext.dispose();
    }
  }

  public setData(data: any, forceUpdate: boolean) {
    this._dataContext.setData(data);
  }

  public initialize(): void {
    if (this.state === ControlState.CREATED) {
      this.id = this.controlName + '-' + String(Control._instanceCount++);
      this.events.raise(INITIALIZE_EVENT, { dataContext: this._dataContext });
      this.state = ControlState.INACTIVE;
    }
  }

  public renderHtml(): string {
    var html;

    if (this.state !== ControlState.DISPOSED) {
      this.initialize();
      if (EventGroup.isObserved(this, RENDERHTML_EVENT)) {
        html = this.events.raise(RENDERHTML_EVENT, { dataContext: this._dataContext, subElements: this._subElements });
      }
      else {
        this._renderDefaultHtml();
      }
    }

    return html;
  }

  public activate(): void {
    if (this.state === ControlState.INACTIVE) {
      this.state = ControlState.ACTIVE;

      if (this._hasChanged) {
        this._onDataContextChanged(null);
      }

      this.children.forEach(function(child) {
        child.activate();
      });

      this.element = document.getElementById(this.id);

      this.events.raise(ACTIVATE_EVENT, { dataContext: this._dataContext });
    }
  }

  public deactivate(): void {
    if (this.state === ControlState.ACTIVE) {
      this.state = ControlState.INACTIVE;

      this.children.forEach(function(child) {
        child.deactivate();
      });

      this.events.raise(DEACTIVATE_EVENT);
    }
  }

  public evaluateView() {
    if (!this._isEvaluatingView) {
      this._isEvaluatingView = true;
      this.events.raise(EVALUATEVIEW_EVENT);
      this._isEvaluatingView = false;
    }
  }

  public updateView() {
    this.events.raise(UPDATEVIEW_EVENT);
  }

  public addChild(control: Control): Control {
    control.parent = this;
    this.children.push(control);

    return control;
  }

  public removeChild(control: Control): Control {
    var childIndex = this.children.indexOf(control);
    var child = this.children[childIndex];

    if (childIndex > -1) {
      this.children.splice(childIndex, 1)[0].parent = null;
    }

    return control;
  }

  public clearChildren() {
    while (this.children.length > 0) {
      this.removeChild(this.children[0]);
    }
  }

  private _onDataContextChanged(args) {
    var cyclesLeft = 5;

    this._hasChanged = true;

    if (this.state === ControlState.ACTIVE && !this._isEvaluatingView) {
      while (this._hasChanged && cyclesLeft--) {
        this._hasChanged = false;
        this.evaluateView();
      }

      if (!cyclesLeft) {
        // This is where bugs can happen.
        // We have re-entrance looping on data changes. Do something fatal to point it out.
        null();
      }

      this.updateView();
    }
  }

  private _renderDefaultHtml() {
    return '<' + this.baseTag + ' id="' + this.id + '"></' + this.baseTag + '>';
  }
}

export = Control;
