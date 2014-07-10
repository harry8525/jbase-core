var rjs = require('requirejs');
var fs = require('fs');

var moduleLookup = {};
var moduleIndex = 0;

rjs.optimize({
  baseUrl: 'dist',
  dir: 'build',
  optimize: 'uglify2',
  modules: [{
    name: 'merge/Control',
    include: [ 'Control' ]
  }, {
    name: 'merge/SharedControl',
    include: ['SharedControl'],
    exclude: ['Control']
  }, {
    name: 'merge/EmbedView',
    include: ['EmbedView'],
    exclude: ['Control', 'SharedControl']
  }, {
    name: 'merge/SetView',
    include: ['SetView'],
    exclude: ['Control', 'SharedControl']
  }],

  onBuildRead: function(moduleName, path, contents) {

    moduleLookup[moduleName] = contents;

    return contents;
  },

      //A function that will be called for every write to an optimized bundle
    //of modules. This allows transforms of the content before serialization.
    onBuildWrite: function (moduleName, path, contents) {
        //Always return a value.
        //This is just a contrived example.
        return contents;
    },

  onModuleBundleComplete: function(data) {
    var index = moduleIndex++;
    var module = this.modules[index];
    var moduleSize = fs.statSync(module._buildPath).size;

    console.log('Module: ' + data.path + '(' + moduleSize + ')');
    data.included.forEach(function(path) {
      var name = path.replace(/.js/g, '');
      console.log('  Includes: ' + path + ' (' + moduleLookup[name].length + ' bytes)');
    });
  }

}, function(buildResponse) {

   for (var module in moduleLookup) {
    var path = 'build/merge/' + module + '.js';
    var size = fs.statSync(path).size;

    console.log("Final size: " + module + '.js: ' + size + 'bytes');
   }
});
