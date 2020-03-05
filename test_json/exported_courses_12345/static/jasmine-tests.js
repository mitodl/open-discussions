beforeEach(function () {
  jasmine.addMatchers({
    toBeAFunction: function () {
      return {
        compare: function (actual, expected) {
          return {
            // The ambiguity of typeof doesn't really matter here..
            pass: typeof actual == 'function'
          };
        }
      };
    }
  });
});

// for testing with JS Input
var pf = window.parent;

describe('jQuery', function () {
  it('jQuery is a function', function () {
    expect(pf.jQuery).toBeDefined();
    expect(pf.jQuery).toBeAFunction();
  });
  
  it('$ is jQuery alias', function () {
    expect(pf.$).toBe(pf.jQuery);
  });
  
  // Is it really jQuery?
  it('Simple selector works', function () {
    expect(pf.jQuery('head title').selector).toEqual('head title');
  });
  
  it('jQuery.trim works', function() {
    expect(pf.jQuery.trim('  hello world ! ')).toEqual('hello world !');
  });
  
  // Are the jQuery plugins there?
  it('AjaxFileUpload plugin is loaded', function () {
    expect(pf.jQuery.ajaxFileUpload).toBeDefined();
    expect(pf.jQuery.ajaxFileUpload).toBeAFunction();
  });
  
  it('timeago plugin is loaded', function () {
    expect(pf.jQuery.timeago).toBeDefined();
    expect(pf.jQuery.timeago).toBeAFunction();
    expect(typeof pf.jQuery.timeago.settings).toEqual('object');
  });
  
  it('dyve autocomplete plugin is loaded', function () {
    // At the time of writing these tests, the autocomplete plugin in use is:
    // located here: https://github.com/dyve/jquery-autocomplete
    expect(pf.jQuery.Autocompleter).toBeDefined();
    expect(pf.jQuery.Autocompleter).toBeAFunction();
  });
});

describe('Underscore.js', function () {
  it('_ is a function', function () {
    expect(pf._).toBeDefined();
    expect(pf._).toBeAFunction();
  });
  
  // Is it really Underscore.js?
  it('_.each is a function', function () {
    expect(pf._.each).toBeDefined();
    expect(pf._.each).toBeAFunction();
  });
  
  it('_.each works', function () {
    var result = '';
    pf._.each(['a', 'b', 'c'], function (n) { result += n; });
    
    expect(result).toEqual('abc');
  });
  
  it('_.map is a function', function () {
    expect(pf._.map).toBeDefined();
    expect(pf._.map).toBeAFunction();
  });
  
  it('_.map works', function () {
    var result = pf._.map([1, 2, 3], function (n) {
      return n + 1;
    });
    
    expect(result[0]).toEqual(2);
    expect(result[1]).toEqual(3);
    expect(result[2]).toEqual(4);
  });
  
  it('_.reduce is a function', function () {
    expect(pf._.reduce).toBeDefined();
    expect(pf._.reduce).toBeAFunction();
  });
  
  it('_.reduce works', function () {
    var result = 'this';
    result = pf._.reduce(['is', 'a', 'sentence'], function (memo, n) {
      return memo + ' ' + n;
    }, result);
    
    expect(result).toEqual('this is a sentence');
  });
});

describe('Backbone.js', function () {
  it('Backbone is an object', function () {
    expect(pf.Backbone).toBeDefined();
    expect(typeof pf.Backbone).toEqual('object');
  });
  
  // Is it really Backbone?
  it ('Backbone.VERSION is a string', function () {
    expect(typeof pf.Backbone.VERSION).toEqual('string');
  });
  
  it ('Backbone.Model is a function', function () {
    expect(pf.Backbone.Model).toBeDefined();
    expect(pf.Backbone.Model).toBeAFunction();
  });
  
  it ('Backbone.View is a function', function () {
    expect(pf.Backbone.View).toBeDefined();
    expect(pf.Backbone.View).toBeAFunction();
  });
  
  it ('Backbone.Collection is a function', function () {
    expect(pf.Backbone.Collection).toBeDefined();
    expect(pf.Backbone.Collection).toBeAFunction();
  });
});

describe('JSON 2', function () {
  it('JSON is an object', function () {
    expect(pf.JSON).toBeDefined();
    expect(typeof pf.JSON).toEqual('object');
  });
  
  it('JSON.stringify works', function () {
    expect(pf.JSON.stringify({'a': [1, 2, 3], 'b': 1})).toEqual('{"a":[1,2,3],"b":1}');
  });
  
  it('JSON.parse works', function () {
    var parsedJSONString = pf.JSON.parse('{"a":[1,2,3],"b":1}');
    
    expect(parsedJSONString.a[0]).toEqual(1);
    expect(parsedJSONString.a[1]).toEqual(2);
    expect(parsedJSONString.a[2]).toEqual(3);
    expect(parsedJSONString.b).toEqual(1);
  });
});

describe('Gettext', function () {
  it('gettext is a function', function () {
    expect(pf.gettext).toBeDefined();
    expect(pf.gettext).toBeAFunction();
  });
  
  it('gettext_noop is a function', function () {
    expect(pf.gettext_noop).toBeDefined();
    expect(pf.gettext_noop).toBeAFunction();
  });
});
