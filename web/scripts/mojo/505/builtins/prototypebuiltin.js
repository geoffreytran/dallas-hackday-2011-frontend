/*  Prototype JavaScript framework, version 1.6.0.3
 *  (c) 2005-2008 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

const installActions = [];

function BuiltInLog(msg) {
	//global.console.log(msg)
}

function AddInstallAction (installAction) {
	installActions.push(installAction)
}

function ArgumentNames (functionObject) {
   var names = functionObject.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
     .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
     .replace(/\s+/g, '').split(',');
   return names.length == 1 && !names[0] ? [] : names;
}

function First(array) {
	if (array && array.length) {
		return array[0];
	}
	return void 0;
}

function Bind(f, o) {
  return function() {
    return f.apply(o);
  }
}

function Wrap (superClassMethod, wrapper) {
  return function() {
    return wrapper.apply(this, [superClassMethod.bind(this)].concat($A(arguments)));
  }
}

$Function.prototype.__privateWrap = function(wrapper) {
    var __method = this;
    return function() {
      return wrapper.apply(this, [__method.bind(this)].concat($A(arguments)));
    }
};

const $PrototypeBI = {
  Version: '1.6.0.3',

  Browser: {
    IE:     false,
    Opera:  false,
    WebKit: true,
    Gecko:  false,
    MobileSafari: false
  },

  BrowserFeatures: {
    XPath: true,
    SelectorsAPI: true,
    ElementExtensions: true,
    SpecificElementExtensions: true
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },
  K: function(x) { return x }
};

function InstallPrototypeObject() {
	BuiltInLog("Installing Prototype Object");
	global.Prototype = $PrototypeBI;
}

AddInstallAction(InstallPrototypeObject);

const $ObjectBI = {};

$ObjectBI.extend = function(destination, source) {
  for (var property in source)
    destination[property] = source[property];
  return destination;
};

function ExtendObject() {
	BuiltInLog("Extending Object");
	$ObjectBI.extend(global.Object, $ObjectBI);
}

AddInstallAction(ExtendObject);

$ObjectBI.extend($ObjectBI, {
  inspect: function(object) {
    try {
      if ($ObjectBI.isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : $String(object);
    } catch (e) {
      if (e instanceof $RangeError) return '...';
      throw e;
    }
  },

  toJSON: function(object) {
    var type = typeof object;
    switch (type) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return object.toString();
    }

    if (object === null) return 'null';
    if (object._toJSON) return object._toJSON();
    if ($ObjectBI.isElement(object)) return;

    var results = [];
    for (var property in object) {
      var value = $ObjectBI.toJSON(object[property]);
      if (!$ObjectBI.isUndefined(value))
        results.push(property._toJSON() + ': ' + value);
    }

    return '{' + results.join(', ') + '}';
  },

  toQueryString: function(object) {
    return $H(object).toQueryString();
  },

  toHTML: function(object) {
    return object && object.toHTML ? object.toHTML() : $StringBI.interpret(object);
  },

  keys: function(object) {
    var keys = [];
    for (var property in object)
      keys.push(property);
    return keys;
  },

  values: function(object) {
    var values = [];
    for (var property in object)
      values.push(object[property]);
    return values;
  },

  clone: function(object) {
    return $ObjectBI.extend({ }, object);
  },

  isElement: function(object) {
    return !!(object && object.nodeType == 1);
  },

  isArray: function(object) {
    return object != null && typeof object == "object" &&
      'splice' in object && 'join' in object;
  },

  isHash: function(object) {
    return object instanceof $HashBI;
  },

  isFunction: function(object) {
    return typeof object == "function";
  },

  isString: function(object) {
    return typeof object == "string" || object instanceof $String;
  },

  isNumber: function(object) {
    return typeof object == "number" || object instanceof $Number;
  },

  isUndefined: function(object) {
    return typeof object == "undefined";
  }
});

const $ClassBIMethods = {
  addMethods: function(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = $ObjectBI.keys(source);

    if (!$ObjectBI.keys({ toString: true }).length)
      properties.push("toString", "valueOf");

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && $ObjectBI.isFunction(value) && First(ArgumentNames(value)) == "$super") {
        var method = value;
        value = (function(m) {
          return function() { return ancestor[m].apply(this, arguments) };
        })(property).__privateWrap(method);

        value.valueOf = Bind(method.valueOf, method);
        value.toString = Bind(method.toString, method);
      }
      this.prototype[property] = value;
    }

    return this;
  }
};

/* Based on Alex Arnell's inheritance implementation. */
const $ClassBI = {
  create: function() {
   var parent = null, properties = $A(arguments);
    if ($ObjectBI.isFunction(properties[0]))
      parent = properties.shift();

	var klass = new $Function("{ this.initialize.apply(this, arguments);}")
    // function klass() "{ this.initialize.apply(this, arguments);}"

    $ObjectBI.extend(klass, $ClassBIMethods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      var subclass = new $Function('{}');
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0; i < properties.length; i++) {
      klass.addMethods(properties[i]);	
	}

    if (!klass.prototype.initialize)
      klass.prototype.initialize = $PrototypeBI.emptyFunction;

    klass.prototype.constructor = klass;

    return klass;
  }
};

$ClassBI.Methods = $ClassBIMethods;

const $AbstractBI = { };

function InstallClass() {
	global.Class = $ClassBI;
	global.Abstract = $AbstractBI;
}

AddInstallAction(InstallClass);

const $FunctionPrototypeBI = {};

function ExtendFunctionPrototype() {
	BuiltInLog("Extending Function prototype");
	$ObjectBI.extend(global.Function.prototype, $FunctionPrototypeBI);
}

AddInstallAction(ExtendFunctionPrototype);

$ObjectBI.extend($FunctionPrototypeBI, {
  argumentNames: function() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  },

  bind: function() {
    if (arguments.length < 2 && $ObjectBI.isUndefined(arguments[0])) return this;
    var __method = this, args = $A(arguments), object = args.shift();
    return function() {
      return __method.apply(object, args.concat($A(arguments)));
    }
  },

  bindAsEventListener: function() {
    var __method = this, args = $A(arguments), object = args.shift();
    return function(event) {
      return __method.apply(object, [event || global.window.event].concat(args));
    }
  },

  curry: function() {
    if (!arguments.length) return this;
    var __method = this, args = $A(arguments);
    return function() {
      return __method.apply(this, args.concat($A(arguments)));
    }
  },

  delay: function() {
    var __method = this, args = $A(arguments), timeout = args.shift() * 1000;
    return global.window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  },

  defer: function() {
    var args = [0.01].concat($A(arguments));
    return this.delay.apply(this, args);
  },

  wrap: function(wrapper) {
    var __method = this;
    return function() {
      return wrapper.apply(this, [__method.bind(this)].concat($A(arguments)));
    }
  },

  methodize: function() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      return __method.apply(null, [this].concat($A(arguments)));
    };
  }
});

function ExtendDate () {
	BuiltInLog("Extending Date");
	global.Date.prototype._toJSON = function() {
	  return '"' + this.getUTCFullYear() + '-' +
	    (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
	    this.getUTCDate().toPaddedString(2) + 'T' +
	    this.getUTCHours().toPaddedString(2) + ':' +
	    this.getUTCMinutes().toPaddedString(2) + ':' +
	    this.getUTCSeconds().toPaddedString(2) + 'Z"';
	};
	global.Date.prototype.toJSON = function() {
		return this;
	};
}

AddInstallAction(ExtendDate);

var $TryBI = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

function InstallTry() {
	BuiltInLog("Installing Try");
	global.Try = $TryBI;
}

AddInstallAction(InstallTry);


function RegExpEscape (str) {
	return $String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
}

function ExtendRegExp() {
	BuiltInLog("Extending RegExp");
	global.RegExp.prototype.match = global.RegExp.prototype.test;

	global.RegExp.escape = RegExpEscape;
}

AddInstallAction(ExtendRegExp);

/*--------------------------------------------------------------------------*/

const $PeriodicalExecuterBI = $ClassBI.create({
  initialize: function(callback, frequency, targetWindow) {
	this.targetWindow = targetWindow || global.window;
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = this.targetWindow.setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    this.targetWindow.clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
      } finally {
        this.currentlyExecuting = false;
      }
    }
  }
});

function InstallPeriodicalExecuter() {
	BuiltInLog("Installing PeriodicalExecuter");
	global.PeriodicalExecuter = $PeriodicalExecuterBI;
}

AddInstallAction(InstallPeriodicalExecuter);

const $StringBI = {
  interpret: function(value) {
    return value == null ? '' : $String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }	
};

const $StringPrototypeBI = {};

$ObjectBI.extend($StringPrototypeBI, {
  gsub: function(pattern, replacement) {
    var result = '', source = this, match;
    replacement = arguments.callee.prepareReplacement(replacement);

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += $StringBI.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  },

  sub: function(pattern, replacement, count) {
    replacement = this.gsub.prepareReplacement(replacement);
    count = $ObjectBI.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  },

  scan: function(pattern, iterator) {
    this.gsub(pattern, iterator);
    return $String(this);
  },

  truncate: function(length, truncation) {
    length = length || 30;
    truncation = $ObjectBI.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : $String(this);
  },

  strip: function() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  },

  stripTags: function() {
    return this.replace(/<\/?[^>]+>/gi, '');
  },

  stripScripts: function() {
    return this.replace(new $RegExp($PrototypeBI.ScriptFragment, 'img'), '');
  },

  extractScripts: function() {
    var matchAll = new $RegExp($PrototypeBI.ScriptFragment, 'img');
    var matchOne = new $RegExp($PrototypeBI.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  },

  evalScripts: function() {
    return this.extractScripts().map(function(script) { return builtinEval(script) });
  },

  toQueryParams: function(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = global.decodeURIComponent(pair.shift());
        var value = pair.length > 1 ? pair.join('=') : pair[0];
        if (value != void 0) value = global.decodeURIComponent(value);

        if (key in hash) {
          if (!$ObjectBI.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  },

  toArray: function() {
    return this.split('');
  },

  succ: function() {
    return this.slice(0, this.length - 1) +
      $String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  },

  times: function(count) {
    return count < 1 ? '' : new $Array(count + 1).join(this);
  },

  camelize: function() {
    var parts = this.split('-'), len = parts.length;
    if (len == 1) return parts[0];

    var camelized = this.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

    for (var i = 1; i < len; i++)
      camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

    return camelized;
  },

  capitalize: function() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  },

  underscore: function() {
    return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/,'#{1}_#{2}').gsub(/([a-z\d])([A-Z])/,'#{1}_#{2}').gsub(/-/,'_').toLowerCase();
  },

  dasherize: function() {
    return this.gsub(/_/,'-');
  },

  inspect: function(useDoubleQuotes) {
    var escapedString = this.gsub(/[\x00-\x1f\\]/, function(match) {
      var character = $StringBI.specialChar[match[0]];
      return character ? character : '\\u00' + match[0].charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  },

  _toJSON: function() {
    return this.inspect(true);
  },

  toJSON: function() {
    return this;
  },

  unfilterJSON: function(filter) {
    return this.sub(filter || $PrototypeBI.JSONFilter, '#{1}');
  },

  isJSON: function() {
    var str = this;
    if (str.blank()) return false;
    str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
  },

  evalJSON: function(sanitize) {
    var json = this.unfilterJSON();
    try {
		if (!sanitize || json.isJSON()) return builtinEval( '(' + json + ')');
    } catch (e) { }
    throw new $SyntaxError('Badly formed JSON string: ' + this.inspect());
  },

  include: function(pattern) {
    return this.indexOf(pattern) > -1;
  },

  startsWith: function(pattern) {
    return this.indexOf(pattern) === 0;
  },

  endsWith: function(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
  },

  empty: function() {
    return this == '';
  },

  blank: function() {
    return /^\s*$/.test(this);
  },

  interpolate: function(object, pattern) {
    return new global.Template(this, pattern).evaluate(object);
  },

  escapeHTML: function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
  unescapeHTML: function() {
    return this.stripTags().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  }

});

$StringPrototypeBI.gsub.prepareReplacement = function(replacement) {
  if ($ObjectBI.isFunction(replacement)) return replacement;
  var template = new global.Template(replacement);
  return function(match) { return template.evaluate(match) };
};

$StringPrototypeBI.parseQuery = $StringPrototypeBI.toQueryParams;

function ExtendString() {
	BuiltInLog("Extending String");
	$ObjectBI.extend(global.String, $StringBI);
	BuiltInLog("Extending String prototype");
	$ObjectBI.extend(global.String.prototype, $StringPrototypeBI);
}

AddInstallAction(ExtendString);

const $TemplateBI = $ClassBI.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || $TemplateBI.Pattern;
  },

  evaluate: function(object) {
    if ($ObjectBI.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return '';

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3];
      var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].gsub('\\\\]', ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + $StringBI.interpret(ctx);
    });
  }
});

function InstallTemplate() {
	BuiltInLog("Installing Template");
	global.Template = $TemplateBI;
	global.Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;
}

AddInstallAction(InstallTemplate);

const $break = { };

const $EnumerableBI = {
  each: function(iterator, context) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator.call(context, value, index++);
      });
    } catch (e) {
      if (e !== $break) throw e;
    }
    return this;
  },

  eachSlice: function(number, iterator, context) {
    var index = -number, slices = [], array = this.toArray();
    if (number < 1) return array;
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  },

  all: function(iterator, context) {
    iterator = iterator || $PrototypeBI.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator.call(context, value, index);
      if (!result) throw global.$break;
    });
    return result;
  },

  any: function(iterator, context) {
    iterator = iterator || $PrototypeBI.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator.call(context, value, index))
        throw global.$break;
    });
    return result;
  },

  collect: function(iterator, context) {
    iterator = iterator || $PrototypeBI.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator.call(context, value, index));
    });
    return results;
  },

  detect: function(iterator, context) {
    var result;
    this.each(function(value, index) {
      if (iterator.call(context, value, index)) {
        result = value;
        throw global.$break;
      }
    });
    return result;
  },

  findAll: function(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  },

  grep: function(filter, iterator, context) {
    iterator = iterator || $PrototypeBI.K;
    var results = [];

    if ($ObjectBI.isString(filter))
      filter = new $RegExp(filter);

    this.each(function(value, index) {
      if (filter.match(value))
      	results.push(iterator.call(context, value, index));
    });
    return results;
  },

  include: function(object) {
    if ($ObjectBI.isFunction(this.indexOf))
      if (this.indexOf(object) != -1) return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw global.$break;
      }
    });
    return found;
  },

  inGroupsOf: function(number, fillWith) {
    fillWith = $ObjectBI.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  },

  inject: function(memo, iterator, context) {
    this.each(function(value, index) {
      memo = iterator.call(context, memo, value, index);
    });
    return memo;
  },

  invoke: function(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  },

  max: function(iterator, context) {
    iterator = iterator || $PrototypeBI.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value >= result)
        result = value;
    });
    return result;
  },

  min: function(iterator, context) {
    iterator = iterator || $PrototypeBI.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value < result)
        result = value;
    });
    return result;
  },

  partition: function(iterator, context) {
    iterator = iterator || $PrototypeBI.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator.call(context, value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  },

  pluck: function(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  },

  reject: function(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  },

  sortBy: function(iterator, context) {
    return this.map(function(value, index) {
      return {
        value: value,
        criteria: iterator.call(context, value, index)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  },

  toArray: function() {
    return this.map();
  },

  zip: function() {
    var iterator = $PrototypeBI.K, args = $A(arguments);
    if ($ObjectBI.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  },

  size: function() {
    return this.toArray().length;
  },

  inspect: function() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }
};

$ObjectBI.extend($EnumerableBI, {
  map:     $EnumerableBI.collect,
  find:    $EnumerableBI.detect,
  select:  $EnumerableBI.findAll,
  filter:  $EnumerableBI.findAll,
  member:  $EnumerableBI.include,
  entries: $EnumerableBI.toArray,
  every:   $EnumerableBI.all,
  some:    $EnumerableBI.any
});

function $A(iterable) {
    if (!iterable) return [];
    // In Safari, only use the `toArray` method if it's not a NodeList.
    // A NodeList is a function, has an function `item` property, and a numeric
    // `length` property. Adapted from Google Doctype.
    if (!(typeof iterable === 'function' && typeof iterable.length ===
        'number' && typeof iterable.item === 'function') && iterable.toArray)
      return iterable.toArray();
    var length = iterable.length || 0, results = new $Array(length);
    while (length--) results[length] = iterable[length];
    return results;
}

const $ArrayPrototypeBI = {};

$ObjectBI.extend($ArrayPrototypeBI, {
  _each: function(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  },

  clear: function() {
    this.length = 0;
    return this;
  },

  first: function() {
    return this[0];
  },

  last: function() {
    return this[this.length - 1];
  },

  compact: function() {
    return this.select(function(value) {
      return value != null;
    });
  },

  flatten: function() {
    return this.inject([], function(array, value) {
      return array.concat($ObjectBI.isArray(value) ?
        value.flatten() : [value]);
    });
  },

  without: function() {
    var values = $A(arguments);
    return this.select(function(value) {
      return !values.include(value);
    });
  },

  reverse: function(inline) {
    return (inline !== false ? this : this.toArray())._reverse();
  },

  reduce: function() {
    return this.length > 1 ? this : this[0];
  },

  uniq: function(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  },

  intersect: function(array) {
    return this.uniq().findAll(function(item) {
      return array.detect(function(value) { return item === value });
    });
  },

  clone: function() {
    return [].concat(this);
  },

  size: function() {
    return this.length;
  },

  inspect: function() {
    return '[' + this.map($ObjectBI.inspect).join(', ') + ']';
  },

  _toJSON: function() {
    var results = [];
    this.each(function(object) {
      var value = $ObjectBI.toJSON(object);
      if (!$ObjectBI.isUndefined(value)) results.push(value);
    });
    return '[' + results.join(', ') + ']';
  },
  
  toJSON: function() {
	return this;
  }
});

function $w(string) {
  if (!$ObjectBI.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

function InstallEnumerable() {
	BuiltInLog("Installing Enumerable");
	global.Enumerable = $EnumerableBI;
	global.$w = $w;
	global.$break = $break;
}

AddInstallAction(InstallEnumerable);

function ExtendArray () {
	BuiltInLog("Extending Array");
	global.Array.from = $A;
	global.$A = $A;

	if (!global.Array.prototype._reverse) global.Array.prototype._reverse = global.Array.prototype.reverse;

	$ObjectBI.extend(global.Array.prototype, $EnumerableBI);
	$ObjectBI.extend(global.Array.prototype, $ArrayPrototypeBI);

  	global.Array.prototype._each = global.Array.prototype.forEach;
	global.Array.prototype.toArray = global.Array.prototype.clone;

}

AddInstallAction(ExtendArray);

const $NumberPrototypeBI = {};

$ObjectBI.extend($NumberPrototypeBI, {
  toColorPart: function() {
    return this.toPaddedString(2, 16);
  },

  succ: function() {
    return this + 1;
  },

  times: function(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  },

  toPaddedString: function(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  },

  _toJSON: function() {
    return global.isFinite(this) ? this.toString() : 'null';
  },

  toJSON: function() {
	return this;
  }
});

function ExtendNumber () {
	BuiltInLog("Extending Number");
	$w('abs round ceil floor').each(function(method){
	  global.Number.prototype[method] = global.Math[method].methodize();
	});
	$ObjectBI.extend(global.Number.prototype, $NumberPrototypeBI);
}

AddInstallAction(ExtendNumber);

function $H(object) {
  return new $HashBI(object);
};

const $HashBI = $ClassBI.create($EnumerableBI, (function() {

  function toQueryPair(key, value) {
    if ($ObjectBI.isUndefined(value)) return key;
    return key + '=' + global.encodeURIComponent($StringBI.interpret(value));
  }

  return {
    initialize: function(object) {
      this._object = $ObjectBI.isHash(object) ? object.toObject() : $ObjectBI.clone(object);
    },

    _each: function(iterator) {
      for (var key in this._object) {
        var value = this._object[key], pair = [key, value];
        pair.key = key;
        pair.value = value;
        iterator(pair);
      }
    },

    set: function(key, value) {
      return this._object[key] = value;
    },

    get: function(key) {
      // simulating poorly supported hasOwnProperty
      if (this._object[key] !== global.Object.prototype[key])
        return this._object[key];
    },

    unset: function(key) {
      var value = this._object[key];
      delete this._object[key];
      return value;
    },

    toObject: function() {
      return $ObjectBI.clone(this._object);
    },

    keys: function() {
      return this.pluck('key');
    },

    values: function() {
      return this.pluck('value');
    },

    index: function(value) {
      var match = this.detect(function(pair) {
        return pair.value === value;
      });
      return match && match.key;
    },

    merge: function(object) {
      return this.clone().update(object);
    },

    update: function(object) {
      return new $HashBI(object).inject(this, function(result, pair) {
        result.set(pair.key, pair.value);
        return result;
      });
    },

    toQueryString: function() {
      return this.inject([], function(results, pair) {
        var key = global.encodeURIComponent(pair.key), values = pair.value;

        if (values && typeof values == 'object') {
          if ($ObjectBI.isArray(values))
            return results.concat(values.map(toQueryPair.curry(key)));
        } else results.push(toQueryPair(key, values));
        return results;
      }).join('&');
    },

    inspect: function() {
      return '#<Hash:{' + this.map(function(pair) {
        return pair.map($ObjectBI.inspect).join(': ');
      }).join(', ') + '}>';
    },

    _toJSON: function() {
      return $ObjectBI.toJSON(this.toObject());
    },

    toJSON: function() {
      return this.toObject();
    },

    clone: function() {
      return new $HashBI(this);
    }
  }
})());

$HashBI.prototype.toTemplateReplacements = $HashBI.prototype.toObject;
$HashBI.from = $H;

function InstallHash() {
	BuiltInLog("Installing Hash");
	global.Hash = $HashBI;
	global.$H = $H;
}

AddInstallAction(InstallHash);

const $ObjectRangeBI = $ClassBI.create($EnumerableBI, {
  initialize: function(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  },

  _each: function(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  },

  include: function(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }
});

function $R(start, end, exclusive) {
  return new $ObjectRangeBI(start, end, exclusive);
};

function InstallObjectRange (argument) {
	BuiltInLog("Installing ObjectRange");
	global.ObjectRange = $ObjectRangeBI;
	global.$R = $R;
}

AddInstallAction(InstallObjectRange);

const $AjaxBI = {
  getTransport: function() {
    return new global.XMLHttpRequest();
  },

  activeRequestCount: 0
};

const $AjaxBIResponders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if ($ObjectBI.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

$AjaxBI.Responders = $AjaxBIResponders;

$ObjectBI.extend($AjaxBIResponders, $EnumerableBI);

const $AjaxBIBase = $ClassBI.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    $ObjectBI.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if ($ObjectBI.isString(this.options.parameters))
      this.options.parameters = this.options.parameters.toQueryParams();
    else if ($ObjectBI.isHash(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});

$AjaxBI.Base = $AjaxBIBase;

const $AjaxBIRequest = $ClassBI.create($AjaxBI.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = $AjaxBI.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = $ObjectBI.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      // simulate other verbs over post
      params['_method'] = this.method;
      this.method = 'post';
    }

    this.parameters = params;

    if (params = $ObjectBI.toQueryString(params)) {
      // when GET, append parameters to URL
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(global.navigator.userAgent))
        params += '&_=';
    }

    try {
      var response = new $AjaxBI.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      $AjaxBI.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-$PrototypeBI-Version': $PrototypeBI.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (global.navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    // user-defined headers
    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if ($ObjectBI.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300);
  },

  getStatus: function() {
    try {
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = $AjaxBI.Request.Events[readyState], response = new $AjaxBI.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || $PrototypeBI.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || $PrototypeBI.emptyFunction)(response, response.headerJSON);
      $AjaxBI.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      // avoid memory leak in MSIE: clean up
      this.transport.onreadystatechange = $PrototypeBI.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: global.window.location.protocol,
      domain: global.document.domain,
      port: global.window.location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null }
  },

  evalResponse: function() {
    try {
      return builtinEval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || $PrototypeBI.emptyFunction)(this, exception);
    $AjaxBI.Responders.dispatch('onException', this, exception);
  }
});

$AjaxBI.Request = $AjaxBIRequest;

const $AjaxBIRequestEvents =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

$AjaxBI.Request.Events = $AjaxBIRequestEvents;

const $AjaxBIResponse = $ClassBI.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if((readyState > 2 && !$PrototypeBI.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = $StringBI.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if(readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = $ObjectBI.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,
  statusText: '',

  getStatus: $AjaxBI.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: $AjaxBI.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

$AjaxBI.Response = $AjaxBIResponse;

logClassCreate = true;

const $AjaxBIUpdater = $ClassBI.create($AjaxBI.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = $ObjectBI.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if ($ObjectBI.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if ($ObjectBI.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

$AjaxBI.Updater = $AjaxBIUpdater;

const $AjaxBIPeriodicalUpdater = $ClassBI.create($AjaxBI.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    global.window.clearTimeout(this.timer);
    (this.onComplete || $PrototypeBI.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new $AjaxBI.Updater(this.container, this.url, this.options);
  }
});

$AjaxBI.PeriodicalUpdater = $AjaxBIPeriodicalUpdater;

function InstallAjax() {
	global.Ajax = $AjaxBI;
	global.Ajax.Responders.register({
	  onCreate:   function() { global.Ajax.activeRequestCount++ },
	  onComplete: function() { global.Ajax.activeRequestCount-- }
	});
}

AddInstallAction(InstallAjax);

function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if ($ObjectBI.isString(element))
    element = global.document.getElementById(element);
  return $ElementBI.extend(element);
}

function SetupElementCache (targetWindow) {
  var element = targetWindow.Element;
  global.window.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = global.Element.cache;
    if (!cache[tagName]) cache[tagName] = $ElementBI.extend(global.document.createElement(tagName));
    return $ElementBI.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };
  $ObjectBI.extend(targetWindow.Element, element || { });
  if (element && element.prototype) global.window.Element.prototype = element.prototype;
  global.Element.cache = { };
}

const $ElementBI = {};

const $ElementBIMethods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    $ElementBI[$ElementBI.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  },

  show: function(element) {
    element = $(element);
    element.style.display = '';
    return element;
  },

  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  update: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    if ($ObjectBI.isElement(content)) return element.update().insert(content);
    content = $ObjectBI.toHTML(content);
    element.innerHTML = content.stripScripts();
    content.evalScripts.bind(content).defer();
    return element;
  },

  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!$ObjectBI.isElement(content)) {
      content = $ObjectBI.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if ($ObjectBI.isString(insertions) || $ObjectBI.isNumber(insertions) ||
        $ObjectBI.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};

    var content, insert, tagName, childNodes;

    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = global.Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if ($ObjectBI.isElement(content)) {
        insert(element, content);
        continue;
      }

      content = $ObjectBI.toHTML(content);

      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      childNodes = global.Element._getContentFromAnonymousElement(tagName, content.stripScripts());

     if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if ($ObjectBI.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if ($ObjectBI.isString(wrapper)) wrapper = new global.Element(wrapper, attributes);
    else wrapper = new global.Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(), attribute = pair.last();
      var value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1)
        elements.push($ElementBI.extend(element));
    return elements;
  },

  ancestors: function(element) {
    return $(element).recursivelyCollect('parentNode');
  },

  descendants: function(element) {
    return $(element).select("*");
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).nextSiblings());
    return [];
  },

  previousSiblings: function(element) {
    return $(element).recursivelyCollect('previousSibling');
  },

  nextSiblings: function(element) {
    return $(element).recursivelyCollect('nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return element.previousSiblings().reverse().concat(element.nextSiblings());
  },

  match: function(element, selector) {
    if ($ObjectBI.isString(selector))
      selector = new global.Selector(selector);
    return selector.match($(element));
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = element.ancestors();
    return $ObjectBI.isNumber(expression) ? ancestors[expression] :
      global.Selector.findElement(ancestors, expression, index);
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return element.firstDescendant();
    return $ObjectBI.isNumber(expression) ? element.descendants()[expression] :
      $ElementBI.select(element, expression)[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(global.Selector.handlers.previousElementSibling(element));
    var previousSiblings = element.previousSiblings();
    return $ObjectBI.isNumber(expression) ? previousSiblings[expression] :
      global.Selector.findElement(previousSiblings, expression, index);
  },

  next: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(global.Selector.handlers.nextElementSibling(element));
    var nextSiblings = element.nextSiblings();
    return $ObjectBI.isNumber(expression) ? nextSiblings[expression] :
      global.Selector.findElement(nextSiblings, expression, index);
  },

  select: function() {
    var args = $A(arguments), element = $(args.shift());
    return global.Selector.findChildElements(element, args);
  },

  adjacent: function() {
    var args = $A(arguments), element = $(args.shift());
    return global.Selector.findChildElements(element.parentNode, args).without(element);
  },

  identify: function(element) {
    element = $(element);
    var id = element.readAttribute('id'), self = arguments.callee;
    if (id) return id;
	var targetDocument = element.ownerDocument;
    do { id = 'anonymous_element_' + self.counter++ } while (targetDocument.getElementById(id));
    element.writeAttribute('id', id);
    return id;
  },

  readAttribute: function(element, name) {
    element = $(element);
    if ($PrototypeBI.Browser.IE) {
      var t = $ElementBI._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null :
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = $ElementBI._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = $ObjectBI.isUndefined(value) ? true : value;

    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return $(element).getDimensions().height;
  },

  getWidth: function(element) {
    return $(element).getDimensions().width;
  },

  classNames: function(element) {
    return $(element).className.split(/\s+/).select(function(name) {
      return name.length > 0;
    });
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new $RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!element.hasClassName(className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new $RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return element[element.hasClassName(className) ?
      'removeClassName' : 'addClassName'](className);
  },

  // removes whitespace-only text node children
  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;

    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;

    while (element = element.parentNode)
      if (element == ancestor) return true;

    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = element.cumulativeOffset();
    global.window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value || value == 'auto') {
      var css = element.ownerDocument.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? global.parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if ($ObjectBI.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          ($ObjectBI.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
            property] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  getDimensions: function(element) {
    element = $(element);
    var display = element.getStyle('display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};

    // All *Width and *Height properties give 0 on elements with display none,
    // so enable the element temporarily
    var els = element.style;
    var originalVisibility = els.visibility;
    var originalPosition = els.position;
    var originalDisplay = els.display;
    els.visibility = 'hidden';
    els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};
  },

  makePositioned: function(element) {
    element = $(element);
    var pos = $ElementBI.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = void 0;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = $ElementBI.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return global.Element._returnOffset(valueL, valueT);
  },

  positionedOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName.toUpperCase() == 'BODY') break;
        var p = $ElementBI.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);
    return global.Element._returnOffset(valueL, valueT);
  },

  absolutize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'absolute') return element;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    var offsets = element.positionedOffset();
    var top     = offsets[1];
    var left    = offsets[0];
    var width   = element.clientWidth;
    var height  = element.clientHeight;

    element._originalLeft   = left - global.parseFloat(element.style.left  || 0);
    element._originalTop    = top  - global.parseFloat(element.style.top || 0);
    element._originalWidth  = element.style.width;
    element._originalHeight = element.style.height;

    element.style.position = 'absolute';
    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.width  = width + 'px';
    element.style.height = height + 'px';
    return element;
  },

  relativize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'relative') return element;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    element.style.position = 'relative';
    var top  = global.parseFloat(element.style.top  || 0) - (element._originalTop || 0);
    var left = global.parseFloat(element.style.left || 0) - (element._originalLeft || 0);

    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.height = element._originalHeight;
    element.style.width  = element._originalWidth;
    return element;
  },

  cumulativeScrollOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return global.Element._returnOffset(valueL, valueT);
  },

  getOffsetParent: function(element) {
    if (element.offsetParent) return $(element.offsetParent);
    if (element == global.document.body) return $(element);

    while ((element = element.parentNode) && element != global.document.body)
      if ($ElementBI.getStyle(element, 'position') != 'static')
        return $(element);

    return $(global.document.body);
  },

  viewportOffset: function(forElement) {
    var valueT = 0, valueL = 0;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      // Safari fix
      if (element.offsetParent == global.document.body &&
        $ElementBI.getStyle(element, 'position') == 'absolute') break;

    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (!$PrototypeBI.Browser.Opera || (element.tagName && (element.tagName.toUpperCase() == 'BODY'))) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return global.Element._returnOffset(valueL, valueT);
  },

  clonePosition: function(element, source) {
    var options = $ObjectBI.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    // find page position of source
    source = $(source);
    var p = source.viewportOffset();

    // find coordinate system to use
    element = $(element);
    var delta = [0, 0];
    var parent = null;
    // delta [0,0] will do fine with position: fixed elements,
    // position:absolute needs offsetParent deltas
    if ($ElementBI.getStyle(element, 'position') == 'absolute') {
      parent = element.getOffsetParent();
      delta = parent.viewportOffset();
    }

    // correct by body offsets (fixes Safari)
    if (parent == global.document.body) {
      delta[0] -= global.document.body.offsetLeft;
      delta[1] -= global.document.body.offsetTop;
    }

    // set position
    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

$ElementBI.Methods = $ElementBIMethods;

$ElementBI.Methods.childOf = $ElementBI.Methods.descendantOf;


$ObjectBI.extend($ElementBI.Methods, {
  getElementsBySelector: $ElementBI.Methods.select,
  childElements: $ElementBI.Methods.immediateDescendants
});

const $ElementBIAttributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: { }
  }
};

$ElementBI._attributeTranslations = $ElementBIAttributeTranslations;

$ElementBIMethods.setOpacity = function(element, value) {
  element = $(element);
  element.style.opacity = (value == 1 || value === '') ? '' :
    (value < 0.00001) ? 0 : value;

  if (value == 1)
  	if(element.tagName.toUpperCase() == 'IMG' && element.width) {
      element.width++; element.width--;
    } else try {
      var n = global.document.createTextNode(' ');
      element.appendChild(n);
      element.removeChild(n);
    } catch (e) { }

  return element;
};

  // Safari returns margins on body which is incorrect if the child is absolutely
  // positioned.  For performance reasons, redefine Element#cumulativeOffset for
  // KHTML/WebKit only.
$ElementBIMethods.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == global.document.body)
        if ($ElementBI.getStyle(element, 'position') == 'absolute') break;

      element = element.offsetParent;
    } while (element);

    return global.Element._returnOffset(valueL, valueT);
};

function SetupXPath () {
	if ($PrototypeBI.BrowserFeatures.XPath) {
	  global.HTMLDocument.prototype._getElementsByXPath = function(expression, parentElement) {
	    var results = [];
	    var query = global.document.evaluate(expression, $(parentElement) || global.document,
	      null, global.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
	    for (var i = 0, length = query.snapshotLength; i < length; i++)
	      results.push($ElementBI.extend(query.snapshotItem(i)));
	    return results;
	  };
	}
}

function SetupTranslations () {
	if ('outerHTML' in global.document.createElement('div')) {
	  global.Element.Methods.replace = function(element, content) {
	    element = $(element);

	    if (content && content.toElement) content = content.toElement();
	    if ($ObjectBI.isElement(content)) {
	      element.parentNode.replaceChild(content, element);
	      return element;
	    }

	    content = global.Object.toHTML(content);
	    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

	    if (global.Element._insertionTranslations.tags[tagName]) {
	      var nextSibling = element.next();
	      var fragments = global.Element._getContentFromAnonymousElement(tagName, content.stripScripts());
	      parent.removeChild(element);
	      if (nextSibling)
	        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
	      else
	        fragments.each(function(node) { parent.appendChild(node) });
	    }
	    else element.outerHTML = content.stripScripts();

	    content.evalScripts.bind(content).defer();
	    return element;
	  };
	}

	global.Element._returnOffset = function(l, t) {
	  var result = [l, t];
	  result.left = l;
	  result.top = t;
	  return result;
	};

	global.Element._getContentFromAnonymousElement = function(tagName, html) {
	  var div = new global.Element('div'), t = global.Element._insertionTranslations.tags[tagName];
	  if (t) {
	    div.innerHTML = t[0] + html + t[1];
	    t[2].times(function() { div = div.firstChild });
	  } else div.innerHTML = html;
	  return $A(div.childNodes);
	};

	global.Element._insertionTranslations = {
	  before: function(element, node) {
	    element.parentNode.insertBefore(node, element);
	  },
	  top: function(element, node) {
	    element.insertBefore(node, element.firstChild);
	  },
	  bottom: function(element, node) {
	    element.appendChild(node);
	  },
	  after: function(element, node) {
	    element.parentNode.insertBefore(node, element.nextSibling);
	  },
	  tags: {
	    TABLE:  ['<table>',                '</table>',                   1],
	    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
	    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
	    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
	    SELECT: ['<select>',               '</select>',                  1]
	  }
	};

	(function() {
	  global.Object.extend(this.tags, {
	    THEAD: this.tags.TBODY,
	    TFOOT: this.tags.TBODY,
	    TH:    this.tags.TD
	  });
	}).call(global.Element._insertionTranslations);
}

const $ElementBIMethodsSimulated = {
  hasAttribute: function(element, attribute) {
    attribute = $ElementBI._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};

$ElementBI.Methods.Simulated = $ElementBIMethodsSimulated;

$ObjectBI.extend($ElementBI, $ElementBI.Methods);

$ElementBI.extend = $PrototypeBI.K;

$ElementBI.hasAttribute = function(element, attribute) {
  if (element.hasAttribute) return element.hasAttribute(attribute);
  return $ElementBI.Methods.Simulated.hasAttribute(element, attribute);
};

$ElementBI.addMethods = function(methods) {
  var F = $PrototypeBI.BrowserFeatures, T = $ElementBI.Methods.ByTag;

  if (!methods) {
    $ObjectBI.extend(global.Form, $FormBIMethods);
    $ObjectBI.extend(global.Form.Element, $FormBIElementMethods);
    $ObjectBI.extend(global.Element.Methods.ByTag, {
      "FORM":     $ObjectBI.clone($FormBIMethods),
      "INPUT":    $ObjectBI.clone($FormBIElementMethods),
      "SELECT":   $ObjectBI.clone($FormBIElementMethods),
      "TEXTAREA": $ObjectBI.clone($FormBIElementMethods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) $ObjectBI.extend(global.Element.Methods, methods || { });
  else {
    if ($ObjectBI.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!global.Element.Methods.ByTag[tagName])
      global.Element.Methods.ByTag[tagName] = { };
    $ObjectBI.extend(global.Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!$ObjectBI.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (global.window[klass]) return global.window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (global.window[klass]) return global.window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (global.window[klass]) return global.window[klass];

    global.window[klass] = { };
    global.window[klass].prototype = global.document.createElement(tagName)['__proto__'];
    return global.window[klass];
  }

  if (F.ElementExtensions) {
    copy(global.Element.Methods, global.HTMLElement.prototype);
    copy($ElementBIMethodsSimulated, global.HTMLElement.prototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in global.Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if ($ObjectBI.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }

  $ObjectBI.extend(global.Element, $ElementBI.Methods);
  delete global.Element.ByTag;

  if (global.Element.extend.refresh) global.Element.extend.refresh();
  global.Element.cache = { };
};

const $DocumentViewport = {
  getDimensions: function() {
    var dimensions = { };
    var B = $PrototypeBI.Browser;
    $w('width height').each(function(d) {
      var D = d.capitalize();
      dimensions[d] = global.document.documentElement['client' + D];
    });
    return dimensions;
  },

  getWidth: function() {
    return this.getDimensions().width;
  },

  getHeight: function() {
    return this.getDimensions().height;
  },

  getScrollOffsets: function() {
    return global.Element._returnOffset(
      global.window.pageXOffset || global.document.documentElement.scrollLeft || global.document.body.scrollLeft,
      global.window.pageYOffset || global.document.documentElement.scrollTop || global.document.body.scrollTop);
  }
};

/* Portions of the Selector class are derived from Jack Slocum's DomQuery,
 * part of YUI-Ext version 0.40, distributed under the terms of an MIT-style
 * license.  Please see http://www.yui-ext.com/ for more information. */

const $SelectorBI = $ClassBI.create({
  initialize: function(expression) {
    this.expression = expression.strip();
    if (this.shouldUseSelectorsAPI()) {
      this.mode = 'selectorsAPI';
    } else if (this.shouldUseXPath()) {
      this.mode = 'xpath';
      this.compileXPathMatcher();
    } else {
      this.mode = "normal";
      this.compileMatcher();
    }
  },

  shouldUseXPath: function() {
    if (!$PrototypeBI.BrowserFeatures.XPath) return false;

    var e = this.expression;

    // Safari 3 chokes on :*-of-type and :empty
    if ($PrototypeBI.Browser.WebKit &&
     (e.include("-of-type") || e.include(":empty")))
      return false;

    // XPath can't do namespaced attributes, nor can it read
    // the "checked" property from DOM nodes
    if ((/(\[[\w-]*?:|:checked)/).test(e))
      return false;

    return true;
  },

  shouldUseSelectorsAPI: function() {
    if (!$PrototypeBI.BrowserFeatures.SelectorsAPI) return false;

    if (!global.Selector._div) global.Selector._div = new global.Element('div');

    // Make sure the browser treats the selector as valid. Test on an
    // isolated element to minimize cost of this check.
    try {
      global.Selector._div.querySelector(this.expression);
    } catch(e) {
      return false;
    }

    return true;
  },

  compileMatcher: function() {
    var e = this.expression, ps = $SelectorBI.patterns, h = $SelectorBI.handlers,
        c = $SelectorBI.criteria, le, p, m;

    if (global.Selector._cache[e]) {
      this.matcher = global.Selector._cache[e];
      return;
    }

	var matcherSourceLines = ["var r = root, h = Selector.handlers, c = false, n;"];

    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          matcherSourceLines.push($ObjectBI.isFunction(c[i]) ? c[i](m) :
    	      new $TemplateBI(c[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    matcherSourceLines.push("return h.unique(n);");
    var functionBody = matcherSourceLines.join('\n');
	this.matcher = new $Function("root", functionBody);
    global.Selector._cache[this.expression] = this.matcher;
  },

  compileXPathMatcher: function() {
    var e = this.expression, ps = $SelectorBI.patterns,
        x = $SelectorBI.xpath, le, m;

    if (global.Selector._cache[e]) {
      this.xpath = global.Selector._cache[e]; return;
    }

    this.matcher = ['.//*'];
    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        if (m = e.match(ps[i])) {
          this.matcher.push($ObjectBI.isFunction(x[i]) ? x[i](m) :
            new $TemplateBI(x[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.xpath = this.matcher.join('');
    global.Selector._cache[this.expression] = this.xpath;
  },

  findElements: function(root) {
    root = root || global.document;
    var e = this.expression, results;

    switch (this.mode) {
      case 'selectorsAPI':
		// removed the id trickery from here since it failed when built-in
        results = $A(root.querySelectorAll(e));
        return results;
      case 'xpath':
        return global.document._getElementsByXPath(this.xpath, root);
      default:
       	return this.matcher(root);
    }
  },

  match: function(element) {
    this.tokens = [];

    var e = this.expression, ps = $SelectorBI.patterns, as = $SelectorBI.assertions;
    var le, p, m;

    while (e && le !== e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          // use the $SelectorBI.assertions methods unless the selector
          // is too complex.
          if (as[i]) {
            this.tokens.push([i, $ObjectBI.clone(m)]);
            e = e.replace(m[0], '');
          } else {
            // reluctantly do a global.document-wide search
            // and look for a match in the array
            return this.findElements(global.document).include(element);
          }
        }
      }
    }

    var match = true, name, matches;
    for (var i = 0, token; token = this.tokens[i]; i++) {
      name = token[0], matches = token[1];
      if (!$SelectorBI.assertions[name](element, matches)) {
        match = false; break;
      }
    }

    return match;
  },

  toString: function() {
    return this.expression;
  },

  inspect: function() {
    return "#<Selector:" + this.expression.inspect() + ">";
  }
});

$ObjectBI.extend($SelectorBI, {
  _cache: { },

  xpath: {
    descendant:   "//*",
    child:        "/*",
    adjacent:     "/following-sibling::*[1]",
    laterSibling: '/following-sibling::*',
    tagName:      function(m) {
      if (m[1] == '*') return '';
      return "[local-name()='" + m[1].toLowerCase() +
             "' or local-name()='" + m[1].toUpperCase() + "']";
    },
    className:    "[contains(concat(' ', @class, ' '), ' #{1} ')]",
    id:           "[@id='#{1}']",
    attrPresence: function(m) {
      m[1] = m[1].toLowerCase();
      return new $TemplateBI("[@#{1}]").evaluate(m);
    },
    attr: function(m) {
      m[1] = m[1].toLowerCase();
      m[3] = m[5] || m[6];
      return new $TemplateBI($SelectorBI.xpath.operators[m[2]]).evaluate(m);
    },
    pseudo: function(m) {
      var h = $SelectorBI.xpath.pseudos[m[1]];
      if (!h) return '';
      if ($ObjectBI.isFunction(h)) return h(m);
      return new $TemplateBI($SelectorBI.xpath.pseudos[m[1]]).evaluate(m);
    },
    operators: {
      '=':  "[@#{1}='#{3}']",
      '!=': "[@#{1}!='#{3}']",
      '^=': "[starts-with(@#{1}, '#{3}')]",
      '$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
      '*=': "[contains(@#{1}, '#{3}')]",
      '~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
      '|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
    },
    pseudos: {
      'first-child': '[not(preceding-sibling::*)]',
      'last-child':  '[not(following-sibling::*)]',
      'only-child':  '[not(preceding-sibling::* or following-sibling::*)]',
      'empty':       "[count(*) = 0 and (count(text()) = 0)]",
      'checked':     "[@checked]",
      'disabled':    "[(@disabled) and (@type!='hidden')]",
      'enabled':     "[not(@disabled) and (@type!='hidden')]",
      'not': function(m) {
        var e = m[6], p = $SelectorBI.patterns,
            x = $SelectorBI.xpath, le, v;

        var exclusion = [];
        while (e && le != e && (/\S/).test(e)) {
          le = e;
          for (var i in p) {
            if (m = e.match(p[i])) {
              v = $ObjectBI.isFunction(x[i]) ? x[i](m) : new $TemplateBI(x[i]).evaluate(m);
              exclusion.push("(" + v.substring(1, v.length - 1) + ")");
              e = e.replace(m[0], '');
              break;
            }
          }
        }
        return "[not(" + exclusion.join(" and ") + ")]";
      },
      'nth-child':      function(m) {
        return $SelectorBI.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m);
      },
      'nth-last-child': function(m) {
        return $SelectorBI.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m);
      },
      'nth-of-type':    function(m) {
        return $SelectorBI.xpath.pseudos.nth("position() ", m);
      },
      'nth-last-of-type': function(m) {
        return $SelectorBI.xpath.pseudos.nth("(last() + 1 - position()) ", m);
      },
      'first-of-type':  function(m) {
        m[6] = "1"; return $SelectorBI.xpath.pseudos['nth-of-type'](m);
      },
      'last-of-type':   function(m) {
        m[6] = "1"; return $SelectorBI.xpath.pseudos['nth-last-of-type'](m);
      },
      'only-of-type':   function(m) {
        var p = $SelectorBI.xpath.pseudos; return p['first-of-type'](m) + p['last-of-type'](m);
      },
      nth: function(fragment, m) {
        var mm, formula = m[6], predicate;
        if (formula == 'even') formula = '2n+0';
        if (formula == 'odd')  formula = '2n+1';
        if (mm = formula.match(/^(\d+)$/)) // digit only
          return '[' + fragment + "= " + mm[1] + ']';
        if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
          if (mm[1] == "-") mm[1] = -1;
          var a = mm[1] ? Number(mm[1]) : 1;
          var b = mm[2] ? Number(mm[2]) : 0;
          predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " +
          "((#{fragment} - #{b}) div #{a} >= 0)]";
          return new $TemplateBI(predicate).evaluate({
            fragment: fragment, a: a, b: b });
        }
      }
    }
  },

  criteria: {
    tagName:      'n = h.tagName(n, r, "#{1}", c);      c = false;',
    className:    'n = h.className(n, r, "#{1}", c);    c = false;',
    id:           'n = h.id(n, r, "#{1}", c);           c = false;',
    attrPresence: 'n = h.attrPresence(n, r, "#{1}", c); c = false;',
    attr: function(m) {
      m[3] = (m[5] || m[6]);
      return new $TemplateBI('n = h.attr(n, r, "#{1}", "#{3}", "#{2}", c); c = false;').evaluate(m);
    },
    pseudo: function(m) {
      if (m[6]) m[6] = m[6].replace(/"/g, '\\"');
      return new $TemplateBI('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m);
    },
    descendant:   'c = "descendant";',
    child:        'c = "child";',
    adjacent:     'c = "adjacent";',
    laterSibling: 'c = "laterSibling";'
  },

  patterns: {
    // combinators must be listed first
    // (and descendant needs to be last combinator)
    laterSibling: /^\s*~\s*/,
    child:        /^\s*>\s*/,
    adjacent:     /^\s*\+\s*/,
    descendant:   /^\s/,

    // selectors follow
    tagName:      /^\s*(\*|[\w\-]+)(\b|$)?/,
    id:           /^#([\w\-\*]+)(\b|$)/,
    className:    /^\.([\w\-\*]+)(\b|$)/,
    pseudo:
/^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|(?=\s|[:+~>]))/,
	attrPresence: /^\[((?:[\w]+:)?[\w]+)\]/,
    attr:         /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/
  },

  // for $SelectorBI.match and $ElementBI#match
  assertions: {
    tagName: function(element, matches) {
      return matches[1].toUpperCase() == element.tagName.toUpperCase();
    },

    className: function(element, matches) {
      return $ElementBI.hasClassName(element, matches[1]);
    },

    id: function(element, matches) {
      return element.id === matches[1];
    },

    attrPresence: function(element, matches) {
      return $ElementBI.hasAttribute(element, matches[1]);
    },

    attr: function(element, matches) {
      var nodeValue = $ElementBI.readAttribute(element, matches[1]);
      return nodeValue && $SelectorBI.operators[matches[2]](nodeValue, matches[5] || matches[6]);
    }
  },

  handlers: {
    // UTILITY FUNCTIONS
    // joins two collections
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        a.push(node);
      return a;
    },

    // marks an array of nodes for counting
    mark: function(nodes) {
      var _true = $PrototypeBI.emptyFunction;
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = _true;
      return nodes;
    },

    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = void 0;
      return nodes;
    },

    // mark each child node with its position (for nth calls)
    // "ofType" flag indicates whether we're indexing for nth-of-type
    // rather than nth-child
    index: function(parentNode, reverse, ofType) {
      parentNode._countedByPrototype = $PrototypeBI.emptyFunction;
      if (reverse) {
        for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
          var node = nodes[i];
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
        }
      } else {
        for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++)
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
      }
    },

    // filters out duplicates and extends all nodes
    unique: function(nodes) {
      if (nodes.length == 0) return nodes;
      var results = [], n;
      for (var i = 0, l = nodes.length; i < l; i++)
        if (!(n = nodes[i])._countedByPrototype) {
          n._countedByPrototype = $PrototypeBI.emptyFunction;
          results.push($ElementBI.extend(n));
        }
      return $SelectorBI.handlers.unmark(results);
    },

    // COMBINATOR FUNCTIONS
    descendant: function(nodes) {
      var h = $SelectorBI.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, node.getElementsByTagName('*'));
      return results;
    },

    child: function(nodes) {
      var h = $SelectorBI.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        for (var j = 0, child; child = node.childNodes[j]; j++)
          if (child.nodeType == 1 && child.tagName != '!') results.push(child);
      }
      return results;
    },

    adjacent: function(nodes) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        var next = this.nextElementSibling(node);
        if (next) results.push(next);
      }
      return results;
    },

    laterSibling: function(nodes) {
      var h = $SelectorBI.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, $ElementBI.nextSiblings(node));
      return results;
    },

    nextElementSibling: function(node) {
      while (node = node.nextSibling)
	      if (node.nodeType == 1) return node;
      return null;
    },

    previousElementSibling: function(node) {
      while (node = node.previousSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    // TOKEN FUNCTIONS
    tagName: function(nodes, root, tagName, combinator) {
      var uTagName = tagName.toUpperCase();
      var results = [], h = $SelectorBI.handlers;
      if (nodes) {
        if (combinator) {
          // fastlane for ordinary descendant combinators
          if (combinator == "descendant") {
            for (var i = 0, node; node = nodes[i]; i++)
              h.concat(results, node.getElementsByTagName(tagName));
            return results;
          } else nodes = this[combinator](nodes);
          if (tagName == "*") return nodes;
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName.toUpperCase() === uTagName) results.push(node);
        return results;
      } else return root.getElementsByTagName(tagName);
    },

    id: function(nodes, root, id, combinator) {
      var targetNode = $(id), h = $SelectorBI.handlers;
      if (!targetNode) return [];
      if (!nodes && root == global.document) return [targetNode];
      if (nodes) {
        if (combinator) {
          if (combinator == 'child') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (targetNode.parentNode == node) return [targetNode];
          } else if (combinator == 'descendant') {
            for (var i = 0, node; node = nodes[i]; i++)
              if ($ElementBI.descendantOf(targetNode, node)) return [targetNode];
          } else if (combinator == 'adjacent') {
            for (var i = 0, node; node = nodes[i]; i++)
              if ($SelectorBI.handlers.previousElementSibling(targetNode) == node)
                return [targetNode];
          } else nodes = h[combinator](nodes);
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node == targetNode) return [targetNode];
        return [];
      }
      return (targetNode && $ElementBI.descendantOf(targetNode, root)) ? [targetNode] : [];
    },

    className: function(nodes, root, className, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      return $SelectorBI.handlers.byClassName(nodes, root, className);
    },

    byClassName: function(nodes, root, className) {
      if (!nodes) nodes = $SelectorBI.handlers.descendant([root]);
      var needle = ' ' + className + ' ';
      for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
        nodeClassName = node.className;
        if (nodeClassName.length == 0) continue;
        if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle))
          results.push(node);
      }
      return results;
    },

    attrPresence: function(nodes, root, attr, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var results = [];
      for (var i = 0, node; node = nodes[i]; i++)
        if ($ElementBI.hasAttribute(node, attr)) results.push(node);
      return results;
    },

    attr: function(nodes, root, attr, value, operator, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var handler = $SelectorBI.operators[operator], results = [];
      for (var i = 0, node; node = nodes[i]; i++) {
        var nodeValue = $ElementBI.readAttribute(node, attr);
        if (nodeValue === null) continue;
        if (handler(nodeValue, value)) results.push(node);
      }
      return results;
    },

    pseudo: function(nodes, name, value, root, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      if (!nodes) nodes = root.getElementsByTagName("*");
      return $SelectorBI.pseudos[name](nodes, value, root);
    }
  },

  pseudos: {
    'first-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if ($SelectorBI.handlers.previousElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'last-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if ($SelectorBI.handlers.nextElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'only-child': function(nodes, value, root) {
      var h = $SelectorBI.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!h.previousElementSibling(node) && !h.nextElementSibling(node))
          results.push(node);
      return results;
    },
    'nth-child':        function(nodes, formula, root) {
      return $SelectorBI.pseudos.nth(nodes, formula, root);
    },
    'nth-last-child':   function(nodes, formula, root) {
      return $SelectorBI.pseudos.nth(nodes, formula, root, true);
    },
    'nth-of-type':      function(nodes, formula, root) {
      return $SelectorBI.pseudos.nth(nodes, formula, root, false, true);
    },
    'nth-last-of-type': function(nodes, formula, root) {
      return $SelectorBI.pseudos.nth(nodes, formula, root, true, true);
    },
    'first-of-type':    function(nodes, formula, root) {
      return $SelectorBI.pseudos.nth(nodes, "1", root, false, true);
    },
    'last-of-type':     function(nodes, formula, root) {
      return $SelectorBI.pseudos.nth(nodes, "1", root, true, true);
    },
    'only-of-type':     function(nodes, formula, root) {
      var p = $SelectorBI.pseudos;
      return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root);
    },

    // handles the an+b logic
    getIndices: function(a, b, total) {
      if (a == 0) return b > 0 ? [b] : [];
      return $R(1, total).inject([], function(memo, i) {
        if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
        return memo;
      });
    },

    // handles nth(-last)-child, nth(-last)-of-type, and (first|last)-of-type
    nth: function(nodes, formula, root, reverse, ofType) {
      if (nodes.length == 0) return [];
      if (formula == 'even') formula = '2n+0';
      if (formula == 'odd')  formula = '2n+1';
      var h = $SelectorBI.handlers, results = [], indexed = [], m;
      h.mark(nodes);
      for (var i = 0, node; node = nodes[i]; i++) {
        if (!node.parentNode._countedByPrototype) {
          h.index(node.parentNode, reverse, ofType);
          indexed.push(node.parentNode);
        }
      }
      if (formula.match(/^\d+$/)) { // just a number
        formula = Number(formula);
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.nodeIndex == formula) results.push(node);
      } else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
        if (m[1] == "-") m[1] = -1;
        var a = m[1] ? Number(m[1]) : 1;
        var b = m[2] ? Number(m[2]) : 0;
        var indices = $SelectorBI.pseudos.getIndices(a, b, nodes.length);
        for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
          for (var j = 0; j < l; j++)
            if (node.nodeIndex == indices[j]) results.push(node);
        }
      }
      h.unmark(nodes);
      h.unmark(indexed);
      return results;
    },

    'empty': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        // IE treats comments as element nodes
        if (node.tagName == '!' || node.firstChild) continue;
        results.push(node);
      }
      return results;
    },

    'not': function(nodes, selector, root) {
      var h = $SelectorBI.handlers, selectorType, m;
      var exclusions = new $SelectorBI(selector).findElements(root);
      h.mark(exclusions);
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node._countedByPrototype) results.push(node);
      h.unmark(exclusions);
      return results;
    },

    'enabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
	      if (!node.disabled && (!node.type || node.type !== 'hidden'))
	        results.push(node);
      return results;
    },

    'disabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.disabled) results.push(node);
      return results;
    },

    'checked': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.checked) results.push(node);
      return results;
    }
  },

  operators: {
    '=':  function(nv, v) { return nv == v; },
    '!=': function(nv, v) { return nv != v; },
    '^=': function(nv, v) { return nv == v || nv && nv.startsWith(v); },
    '$=': function(nv, v) { return nv == v || nv && nv.endsWith(v); },
    '*=': function(nv, v) { return nv == v || nv && nv.include(v); },
    '$=': function(nv, v) { return nv.endsWith(v); },
    '*=': function(nv, v) { return nv.include(v); },
    '~=': function(nv, v) { return (' ' + nv + ' ').include(' ' + v + ' '); },
    '|=': function(nv, v) { return ('-' + (nv || "").toUpperCase() +
     '-').include('-' + (v || "").toUpperCase() + '-'); }
  },

  split: function(expression) {
    var expressions = [];
    expression.scan(/(([\w#:.~>+()\s-]+|\*|\[.*?\])+)\s*(,|$)/, function(m) {
      expressions.push(m[1].strip());
    });
    return expressions;
  },

  matchElements: function(elements, expression) {
	if (elements.length === 0) {
		return [];
	}
	var ownerDoc = elements[0].ownerDocument;
    var matches, h = $SelectorBI.handlers;
	if (ownerDoc.querySelectorAll) {
	    matches = $A(ownerDoc.querySelectorAll(expression));
	} else {
		matches = $ElementBI.select(expression, ownerDoc);
	}
    h.mark(matches);
    for (var i = 0, results = [], element; element = elements[i]; i++)
      if (element._countedByPrototype) results.push(element);
    h.unmark(matches);
    return results;
  },

  findElement: function(elements, expression, index) {
    if ($ObjectBI.isNumber(expression)) {
      index = expression; expression = false;
    }
    return $SelectorBI.matchElements(elements, expression || '*')[index || 0];
  },

  findChildElements: function(element, expressions) {
    expressions = $SelectorBI.split(expressions.join(','));
    var results = [], h = $SelectorBI.handlers;
    for (var i = 0, l = expressions.length, selector; i < l; i++) {
      selector = new $SelectorBI(expressions[i].strip());
      h.concat(results, selector.findElements(element));
    }
    return (l > 1) ? h.unique(results) : results;
  }
});

function $$() {
  return global.Selector.findChildElements(global.document, $A(arguments));
}

const $FormBI = {
  reset: function(form) {
    $(form).reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if ($ObjectBI.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit;

    var data = elements.inject({ }, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          if (key in result) {
            // a key is already present; construct an array of values
            if (!$ObjectBI.isArray(result[key])) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return options.hash ? data : $ObjectBI.toQueryString(data);
  }
};

const $FormBIMethods = {
  serialize: function(form, options) {
    return $FormBI.serializeElements($FormBI.getElements(form), options);
  },

  getElements: function(form) {
    return $A($(form).getElementsByTagName('*')).inject([],
      function(elements, child) {
        if ($FormBIElementSerializers[child.tagName.toLowerCase()])
          elements.push($ElementBI.extend(child));
        return elements;
      }
    );
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map($ElementBI.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push($ElementBI.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    $FormBI.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    $FormBI.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return ['input', 'select', 'textarea'].include(element.tagName.toLowerCase());
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = $ObjectBI.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = global.window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if ($ObjectBI.isString(params)) params = params.toQueryParams();
      $ObjectBI.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new $AjaxBI.Request(action, options);
  }
};

$FormBI.Methods = $FormBIMethods;

/*--------------------------------------------------------------------------*/

const $FormBIElement = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

$FormBI.Element = $FormBIElement;

const $FormBIElementMethods = {
  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != void 0) {
        var pair = { };
        pair[element.name] = value;
        return $ObjectBI.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return $FormBIElementSerializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    $FormBIElementSerializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !['button', 'reset', 'submit'].include(element.type)))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

$FormBI.Element.Methods = $FormBIElementMethods;

/*--------------------------------------------------------------------------*/

const $F = $FormBI.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

const $FormBIElementSerializers = {
  input: function(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return $FormBIElementSerializers.inputSelector(element, value);
      default:
        return $FormBIElementSerializers.textarea(element, value);
    }
  },

  inputSelector: function(element, value) {
    if ($ObjectBI.isUndefined(value)) return element.checked ? element.value : null;
    else element.checked = !!value;
  },

  textarea: function(element, value) {
    if ($ObjectBI.isUndefined(value)) return element.value;
    else element.value = value;
  },

  select: function(element, value) {
    if ($ObjectBI.isUndefined(value))
      return this[element.type == 'select-one' ?
        'selectOne' : 'selectMany'](element);
    else {
      var opt, currentValue, single = !$ObjectBI.isArray(value);
      for (var i = 0, length = element.length; i < length; i++) {
        opt = element.options[i];
        currentValue = this.optionValue(opt);
        if (single) {
          if (currentValue == value) {
            opt.selected = true;
            return;
          }
        }
        else opt.selected = value.include(currentValue);
      }
    }
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    // extend element because hasAttribute may not be native
    return $ElementBI.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
};

$FormBI.Element.Serializers = $FormBIElementSerializers;

/*--------------------------------------------------------------------------*/

const $AbstractBITimedObserver = $ClassBI.create($PeriodicalExecuterBI, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if ($ObjectBI.isString(this.lastValue) && $ObjectBI.isString(value) ?
        this.lastValue != value : $String(this.lastValue) != $String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

$AbstractBI.TimedObserver = $AbstractBITimedObserver;

const $FormBIElementObserver = $ClassBI.create($AbstractBI.TimedObserver, {
  getValue: function() {
    return $FormBIElementMethods.getValue(this.element);
  }
});

$FormBI.Element.Observer = $FormBIElementObserver;

const $FormBIObserver = $ClassBI.create($AbstractBI.TimedObserver, {
  getValue: function() {
    return $FormBI.serialize(this.element);
  }
});

$FormBI.Observer = $FormBIObserver;

/*--------------------------------------------------------------------------*/

const $AbstractBIEventObserver = $ClassBI.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    $FormBI.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          $EventBI.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          $EventBI.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

$AbstractBI.EventObserver = $AbstractBIEventObserver;

const $FormBIElementEventObserver = $ClassBI.create($AbstractBI.EventObserver, {
  getValue: function() {
    return $FormBIElementMethods.getValue(this.element);
  }
});

$FormBI.Element.EventObserver = $FormBIElementEventObserver;

const $FormBIEventObserver = $ClassBI.create($AbstractBI.EventObserver, {
  getValue: function() {
    return $FormBI.serialize(this.element);
  }
});

$FormBI.EventObserver = $FormBIEventObserver;

function ExtendElement(targetWindow) {
	global.$ = $;
	global.$$ = $$;
	global.Field = $FormBI.Element;
	global.$F = $F;
	global.Element = $ElementBI;
	global.Element.Methods.ByTag = {};
	global.Form = $FormBI;
	global.Selector = $SelectorBI;
	global.HTMLDocument.prototype.viewport = $DocumentViewport;
	SetupElementCache(targetWindow);
	SetupXPath();
	SetupTranslations();
	$ElementBI.addMethods();
	global.Element.identify.counter = 1;
}

AddInstallAction(ExtendElement);

const $EventBI = {};

$ObjectBI.extend($EventBI, {
  KEY_BACKSPACE: 8,
  KEY_TAB:       9,
  KEY_RETURN:   13,
  KEY_ESC:      27,
  KEY_LEFT:     37,
  KEY_UP:       38,
  KEY_RIGHT:    39,
  KEY_DOWN:     40,
  KEY_DELETE:   46,
  KEY_HOME:     36,
  KEY_END:      35,
  KEY_PAGEUP:   33,
  KEY_PAGEDOWN: 34,
  KEY_INSERT:   45,

  cache: { },

  relatedTarget: function(event) {
    var element;
    switch(event.type) {
      case 'mouseover': element = event.fromElement; break;
      case 'mouseout':  element = event.toElement;   break;
      default: return null;
    }
    return $ElementBI.extend(element);
  }
});

function ExtendEventPrototype() {
  var methods = $ObjectBI.keys(global.Event.Methods).inject({ }, function(m, name) {
    m[name] = global.Event.Methods[name].methodize();
    return m;
  });

    // global.Event.prototype = global.Event.prototype || global.document.createEvent("HTMLEvents")["__proto__"];
    $ObjectBI.extend(global.Event.prototype, methods);
    global.Event.extend = $PrototypeBI.K;
}

function SetupEventMethods() {
	BuiltInLog("SetupEventMethods");
	global.Event.Methods = (function() {
	  var isButton;

	    isButton = function(event, code) {
	      switch (code) {
	        case 0: return event.which == 1 && !event.metaKey;
	        case 1: return event.which == 1 && event.metaKey;
	        default: return false;
	      }
	    };

	  return {
	    isLeftClick:   function(event) { return isButton(event, 0) },
	    isMiddleClick: function(event) { return isButton(event, 1) },
	    isRightClick:  function(event) { return isButton(event, 2) },

	    element: function(event) {
	      event = $EventBI.extend(event);

	      var node          = event.target,
	          type          = event.type,
	          currentTarget = event.currentTarget;

	      if (currentTarget && currentTarget.tagName) {
	        // Firefox screws up the "click" event when moving between radio buttons
	        // via arrow keys. It also screws up the "load" and "error" events on images,
	        // reporting the document as the target instead of the original image.
	        if (type === 'load' || type === 'error' ||
	          (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
	            && currentTarget.type === 'radio'))
	              node = currentTarget;
	      }
	      if (node.nodeType == global.Node.TEXT_NODE) node = node.parentNode;
	      return $ElementBI.extend(node);
	    },

	    findElement: function(event, expression) {
	      var element = global.Event.element(event);
	      if (!expression) return element;
	      var elements = [element].concat(element.ancestors());
	      return $SelectorBI.findElement(elements, expression, 0);
	    },

	    pointer: function(event) {
		  var doc, docElement;
		  if (event.target) {
			  doc = event.target.ownerDocument;
		  } else {
			  doc = global.document;
		  }
	      docElement = doc.documentElement,
	      body = doc.body || { scrollLeft: 0, scrollTop: 0 };
	      return {
	        x: event.pageX || (event.clientX +
	          (docElement.scrollLeft || body.scrollLeft) -
	          (docElement.clientLeft || 0)),
	        y: event.pageY || (event.clientY +
	          (docElement.scrollTop || body.scrollTop) -
	          (docElement.clientTop || 0))
	      };
	    },

	    pointerX: function(event) { return global.Event.pointer(event).x },
	    pointerY: function(event) { return global.Event.pointer(event).y },

	    stop: function(event) {
	      $EventBI.extend(event);
	      event.preventDefault();
	      event.stopPropagation();
	      event.stopped = true;
	    }
	  };
	})();
}

$ObjectBI.extend($EventBI, (function() {
  var cache = $EventBI.cache;

  function getEventID(element) {
    if (element._prototypeEventID) return element._prototypeEventID[0];
    arguments.callee.id = arguments.callee.id || 1;
    return element._prototypeEventID = [++arguments.callee.id];
  }

  function getDOMEventName(eventName) {
    if (eventName && eventName.include(':')) return "dataavailable";
    return eventName;
  }

  return {
    observe: function(element, eventName, handler) {
      element = $(element);
      var name = getDOMEventName(eventName);
	  element.addEventListener(name, handler, false);
	  return element;
    },

    stopObserving: function(element, eventName, handler) {
      element = $(element);
      var id = getEventID(element), name = getDOMEventName(eventName);
      element.removeEventListener(name, handler, false);
	  return element;
    },

    fire: function(element, eventName, memo) {
      element = $(element);
      if (element == global.document && global.document.createEvent && !element.dispatchEvent)
        element = global.document.documentElement;

      var event;
      if (global.document.createEvent) {
        event = global.document.createEvent("HTMLEvents");
        event.initEvent("dataavailable", true, true);
      } else {
        event = global.document.createEventObject();
        event.eventType = "ondataavailable";
      }

      event.eventName = eventName;
      event.memo = memo || { };

      if (global.document.createEvent) {
        element.dispatchEvent(event);
      } else {
        element.fireEvent(event.eventType, event);
      }

      return $EventBI.extend(event);
    }
  };
})());

$ObjectBI.extend($EventBI, $EventBI.Methods);

$EventBI.extend = $PrototypeBI.K;

function SetupEvents(targetWindow) {
    targetWindow.Event.prototype = targetWindow.Event.prototype || targetWindow.document.createEvent("HTMLEvents").__proto__;
	SetupEventMethods();
	$ElementBI.addMethods({
	  fire:          $EventBI.fire,
	  observe:       $EventBI.observe,
	  stopObserving: $EventBI.stopObserving
	});
	$ObjectBI.extend(targetWindow.Event, $EventBI);
	$ObjectBI.extend(targetWindow.Event, targetWindow.Event.Methods);
	$ObjectBI.extend(global.HTMLDocument.prototype, {
	  fire:          targetWindow.Element.Methods.fire.methodize(),
	  observe:       targetWindow.Element.Methods.observe.methodize(),
	  stopObserving: targetWindow.Element.Methods.stopObserving.methodize(),
	  loaded:        false
	});
	ExtendEventPrototype();
}

AddInstallAction(SetupEvents);

// deprecated, but needed for unit tests.
$HashBI.toQueryString = $ObjectBI.toQueryString;

const $InsertionBI = {
  Before: function(element, content) {
    return $ElementBI.insert(element, {before:content});
  },

  Top: function(element, content) {
    return $ElementBI.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return $ElementBI.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return $ElementBI.insert(element, {after:content});
  }
};

const $continue = new $Error('"throw $continue" is deprecated, use "return" instead');

// This should be moved to script.aculo.us; notice the deprecated methods
// further below, that map to the newer Element methods.
const $PositionBI = {
  // set to true if needed, warning: firefox performance problems
  // NOT neeeded for page scrolling, only if draggable contained in
  // scrollable elements
  includeScrollOffsets: false,

  // must be called before calling withinIncludingScrolloffset, every time the
  // page is scrolled
  prepare: function() {
    this.deltaX =  global.window.pageXOffset
                || global.document.documentElement.scrollLeft
                || global.document.body.scrollLeft
                || 0;
    this.deltaY =  global.window.pageYOffset
                || global.document.documentElement.scrollTop
                || global.document.body.scrollTop
                || 0;
  },

  // caches x/y coordinate pair to use with overlap
  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = $ElementBI.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = $ElementBI.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = $ElementBI.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  // within must be called directly before
  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },

  // Deprecation layer -- use newer Element methods now (1.5.2).

  cumulativeOffset: $ElementBI.Methods.cumulativeOffset,

  positionedOffset: $ElementBI.Methods.positionedOffset,

  absolutize: function(element) {
    global.Position.prepare();
    return $ElementBI.absolutize(element);
  },

  relativize: function(element) {
    global.Position.prepare();
    return $ElementBI.relativize(element);
  },

  realOffset: $ElementBI.Methods.cumulativeScrollOffset,

  offsetParent: $ElementBI.Methods.getOffsetParent,

  page: $ElementBI.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return $ElementBI.clonePosition(target, source, options);
  }
};

function SetupDeprecated() {
	global.Position = $PositionBI;
	global.Insertion = $InsertionBI;
	global.$continue = $continue;
}

AddInstallAction(SetupDeprecated);

$InstallPrototypeBuiltIn = function(targetWindow) {
	for (var i=0; i < installActions.length; i++) {
		installActions[i](targetWindow);
	};
};

%SetProperty(global, "InstallPrototypeBuiltIn", $InstallPrototypeBuiltIn, /* DONT_ENUM */ 1);
