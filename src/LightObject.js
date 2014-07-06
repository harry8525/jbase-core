/// Copyright (C) Microsoft Corporation. All rights reserved.

(function ()
{
    var w = window;

    // Store in local variable for crunching.
    var _object = w.Object;

    var _jsonDefined = typeof (JSON) !== "undefined";

    /* @disable(0092) */
    if (!_object.isString)
    {
        /* @restore(0092) */
        _object.isString = function $Object$isString(p_var)
        {
            /// <summary>
            /// Checks if the given object is a string
            /// </summary>
            /// <param name="p_var" type="Object">variable to check</param>
            /// <returns type="Boolean">Boolean True if object is a string</returns>

            return (typeof (p_var) === "string") || (/* @static_cast(Boolean) */p_var && p_var.constructor === String);
        };
    }

    /* @disable(0092) */
    if (!_object.isArray)
    {
        /* @restore(0092) */
        _object.isArray = function $Object$isArray(p_obj)
        {
            /// <summary>
            /// Checks if the given object is an Array
            /// </summary>
            /// <param name="p_obj" type="Object">variable to check</param>
            /// <returns>Boolean True if object is an Array</returns>

            return /* @static_cast(Boolean)*/p_obj && Object.prototype.toString.call(p_obj) === '[object Array]';
        };
    }

    /* @disable(0092) */
    if (!_object.isFunction)
    {
        /* @restore(0092) */
        _object.isFunction = function $Object$isFunction(p_var)
        {
            /// <summary>
            /// Checks if the given object is a function
            /// </summary>
            /// <param name="p_var" type="Object">variable to check</param>
            /// <returns>Boolean True if object is a function</returns>

            return (typeof (p_var) === "function");
        };
    }

    /* @disable(0092) */
    if (!_object.isObject)
    {
        /* @restore(0092) */
        _object.isObject = function $Object$isObject(p_var)
        {
            /// <summary>
            /// Checks if the given object is an Object
            /// </summary>
            /// <param name="p_var" type="Object">variable to check</param>
            /// <returns type="Boolean">Boolean True if object is an Object</returns>

            return (/* @static_cast(Boolean) */p_var && (typeof (p_var) === "object"));
        };
    }

    /* @disable(0092) */
    if (!_object.isBoolean)
    {
        /* @restore(0092) */
        _object.isBoolean = function $Object$isBoolean(p_var)
        {
            /// <summary>
            /// Checks if the given object is a boolean
            /// </summary>
            /// <param name="p_var" type="Object">variable to check</param>
            /// <returns type="Boolean">Boolean True if object is a boolean</returns>

            return (typeof (p_var) === "boolean") || (/* @static_cast(Boolean) */p_var && p_var.constructor === Boolean);
        };
    }

    /* @disable(0092) */
    if (!_object.isNumber)
    {
        /* @restore(0092) */
        _object.isNumber = function $Object$isNumber(p_var)
        {
            /// <summary>
            /// Checks if the given object is a number
            /// </summary>
            /// <param name="p_var" type="Boolean">variable to check</param>
            /// <returns type="Boolean">Boolean True if object is a number</returns>

            return (typeof (p_var) === "number") || (p_var && p_var.constructor === Number);
        };
    }

    /* @disable(0092) */
    if (!_object.isNull)
    {
        /* @restore(0092) */
        _object.isNull = function $Object$isNull(obj)
        {
            /// <summary>
            /// Checks if the given object is null or undefined
            /// </summary>
            /// <param name="obj" type="Object">variable to check</param>
            /// <returns>Boolean True if object is null</returns>

            return (null == obj || undefined == obj);
        };
    }

    /* @disable(0092) */
    if (!_object.fromJSON)
    {
        /* @restore(0092) */
        _object.fromJSON = function $Object$fromJSON(text)
        {
            /// <summary>
            /// Takes a JSON string and converts it to a JavaScript Object
            /// Uses JSON.org JSON syntax
            /// </summary>
            /// <param name="text" type="String">JSON Text</param>
            /// <returns>JavaScript Object</returns>

            try
            {
                /* @disable(0092) */
                if (_jsonDefined && /* @static_cast(Boolean) */JSON.parse)   // Defer to built-in implementation
                {
                    return JSON.parse(text);
                    /* @restore(0092) */
                }
                else if (/^[\],:{}\s]*$/.test(text.replace(/\\["\\\/b-u]/g, '@').
                replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
                replace(/(?:^|:|,)(?:\s*\[)+/g, '')))
                {
                    return eval('(' + text + ')');
                }
            }
            catch (/* @type(Error)*/e)
            {
                // Swallow
            }
            return null;
        };
    }

    /* @disable(0092) */
    if (!_object.toJSON)
    {
        /* @restore(0092) */
        _object.toJSON = function $Object$toJSON(object, replacer, space, shouldFailSilently, shouldSkipStrings)
        {
            /// <summary>
            /// Converts an Object into a JSON string.
            /// This follows the JSON.org JSON Syntax
            /// It returns "null" if null was passed in.
            /// It should do a Debug.assert() instead
            /// This will not work: Object.fromJSON(Object.toJSON(null))
            /// </summary>
            /// <param name="object" type="*">Object to serialize</param>
            /// <param name="replacer" type="*" optional="true">Replacer function or array used for JSON.stringify</param>
            /// <param name="space" type="*" optional="true">Spacing value used for JSON.stringify</param>
            /// <param name="shouldFailSilently" type="Boolean" optional="true">If true, JSON.stringify will fail without throwing an error.</param>
            /// <param name="shouldSkipStrings" type="Boolean" optional="true">If true, no-op when 'object' is a string.</param>
            /// <returns type="String">JSON string</returns>

            if (object === '')
            {
                // IE 8 has a bug that string empty from Dom elements is not stringified the same as string empty
                // blogs.msdn.com/jscript/archive/2009/06/23/serializing-the-value-of-empty-dom-elements-using-native-json-in-ie8.aspx
                // example JSON.stringify(document.createElement('a').innerHTML) outputs 'null'
                //   when JSON.stringify('') outputs ''
                //   and document.createElement('a').innerHTML === '' is true.
                return '';
            }

            // No-op if the object is a string and 'shouldSkipStrings' is true.
            if (shouldSkipStrings && (typeof object == "string")) { return /* @static_cast(String) */object; };

            if (_jsonDefined && /* @static_cast(Boolean) */JSON.stringify)   // Defer to built-in implementation
            {
                // Note: The replacer and space parameters are only used for JSON.stringify.  If JSON.stringify is not present,
                // the encoding algorithm below will not make use of these values.  

                var jsonString = "";
                try
                {
                    // Objects with circular references can not be properly serialized, and will throw a runtime error.
                    jsonString = JSON.stringify(object, replacer, space);
                }
                catch (/* @type(Error) */err)
                {
                    if (shouldFailSilently)
                    {
                        jsonString = "Object could not be serialized to JSON.";
                    }
                    else
                    {
                        throw err;
                    }
                }

                return jsonString;
            }

            var _this = _object.toJSON;
            var /* @dynamic */json = "null";

            if (!_object.isNull(object))
            {
                if (_object.isArray(object))
                {
                    json = [];
                    /* @disable(0092) */
                    for (var i = 0; i < object.length; i++)
                    {
                        /* @restore(0092) */
                        json.push(_this(object[i]));
                    }
                    json = "[" + json.join(",") + "]";
                }
                else if (_object.isObject(object))
                {
                    json = [];
                    for (var name in object)
                    {
                        /* @disable(0092) */
                        json.push('"' + name.encodeJson() + '":' + _this(object[name]));
                        /* @restore(0092) */
                    }
                    json = "{" + json.join(",") + "}";
                }
                else if (_object.isString(object))
                {
                    /* @disable(0092) */
                    json = '"' + object.encodeJson() + '"';
                    /* @restore(0092) */
                }
                else if (!_object.isFunction(object))
                {
                    json = object.toString();
                }
            }
            return json;
        };
    }

    // Define the json methods
    if (!_jsonDefined)   // Defer to built-in implementation
    {
        window.JSON = {
            parse: _object.fromJSON,
            stringify: _object.toJSON
        };
    }
    /* @disable(0092) */
    else if (/* @static_cast(Boolean) */JSON.parse)
    {
        /* @restore(0092) */
        var originalJSONparse = JSON.parse;
        JSON.parse = function parse(str) {
            try
            {
                return originalJSONparse.apply(JSON, [str]);
            }
            catch (/* @type(Error)*/e)
            {
                e.message = e.message + '\n' + 'inputScript: ' + str + " at "  + e.stack;
                throw e;
            }
        };
    }
})();
