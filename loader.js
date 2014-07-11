var _isLoadCalled = false;

function onLoad(cb) {
  if (_isLoadCalled) {
    cb();
  }
  else {
    var previousCallback = window.onload;
    window.onload = function() {
      _isLoadCalled = true;
      previousCallback && previousCallback();
      cb();
    };
  }
}

onLoad(function() {
  alert('hi');
});
