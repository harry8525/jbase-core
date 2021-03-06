// BASE CLASSES
class View<ViewModelType> {
  public name: string;
  public viewModel: ViewModelType;

  constructor() {
     this.viewModel = new ViewModelType();
  }

  public setData(data) {
    viewModel.setData(data);
  }

  public renderHtml(): string {
    return this.onRenderHtml(this.viewModel);
  }

  public onRenderHtml(viewModel: ViewModelType): string {
    return '<div></div>';
  }
}

class ViewModel<DataModelType> {
  public dataModel: DataModelType;

  // defaults to copying all data model values to view model for reading purposes.
  // This alleviates the need to

  public setData(data: any) {

  }
}


// ViewModel interface. (GENERATED)
interface IMyControlData {
  name: string;
  age: number;

  onClick();
}

// View. (GENERATED)
//class MyControl implements IView<ViewModel<any>> {
class MyControl extends View<MyControlModel> {
  public viewType: string = 'MyControl';
  public viewModelType: string = require('MyControlModel');
  public viewModel = 'MyControlModel';

  public constructor() {
    super();
    //this.viewModel = new ViewModel<any>();
    this.viewModel = new MyControlModel();
  }

  public onRenderHtml(viewModel: MyControlModel) :string {
    return 'hi';
  }
}

// Subclass example
class MySubControl extends MyControl {
  public viewModel =
}

// View model (Manually, optionally written.)
class MyControlModel extends ViewModel<any> implements IMyControlData {
  // Default values.
  public name: string = 'David';
  public age: number = 21;
  public gender: string = 'male';
  public backgroundColor: string = 'black';

  // optional override
  public setData(data: any) {
    // data is sent from the caller.
  }

  // default click handler.
  public onClick() {
    alert('hi');
  }
}

// get data.
var item = {
  userName: 'foo',
  age: 12
};

// create new view.
var c =  new MyControl();

// pass data to view model from "consumer".
c.setData({
  name: 'Person',
  age: 12
});

// data is mixed into the view model directly by default.
// The viewmodel can alter this behavior, and for example choose to send the data to the datamodel.


//c.viewModel.setViewModel(myViewModel);

// render.
document.body.innerHTML = c.renderHtml();

// activate.

