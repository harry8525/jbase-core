/// Copyright (C) Microsoft Corporation. All rights reserved.

(function ()
{
    var w = window;

    var Debug = w.Debug;

    // Store in local variable for crunching.
    var _stringPrototype = w.String.prototype;


    _stringPrototype.endsWith = /* @bind(String) */function $String$endsWidth(suffix)
    {
        /// <summary>
        /// Checks if the string ends with the provided suffix
        /// Usage: 'abc'.endsWith('bc') returns true
        /// </summary>
        /// <param name="suffix" type="String">Suffix to match</param>
        /// <returns>Bool if the suffix is at the end of the string</returns>
        Debug.assert(/* @static_cast(Boolean) */ suffix, 'must provide suffix');
        return (this.substr(this.length - suffix.length) == suffix);
    };


    _stringPrototype.startsWith = /* @bind(String) */function $String$startsWith(prefix)
    {
        /// <summary>
        /// Checks if the string starts with the provided prefix
        /// Usage: 'abc'.startsWith('ab') returns true
        /// </summary>
        /// <param name="prefix" type="String">Prefix to match</param>
        /// <returns>Bool if the prefix is at the start of the string</returns>
        Debug.assert(/* @static_cast(Boolean) */prefix, 'must provide prefix');
        return (this.substr(0, prefix.length) == prefix);
    };


    _stringPrototype.lTrim = /* @bind(String) */function $String$lTrim()
    {
        /// <summary>
        /// Removes the white spaces at the start of the string
        /// (Also known as trimStart)
        /// Usage: ' abc '.lTrim() returns 'abc '
        /// </summary>
        /// <returns>Original string minus white spaces at the begining</returns>
        return this.replace(/^\s*/, "");
    };


    _stringPrototype.rTrim = /* @bind(String) */function $String$rTrim()
    {
        /// <summary>
        /// Removes the white spaces at the end of the string
        /// (Also known as trimEnd)
        /// Usage: ' abc '.rTrim() returns ' abc'
        /// </summary>
        /// <returns>Original string minus trailing white spaces</returns>
        return this.replace(/\s*$/, "");
    };


    _stringPrototype.trim = /* @bind(String) */function $String$trim()
    {
        /// <summary>
        /// Removes the white spaces at the start and end of the string
        /// (Also known as trimEnd)
        /// Usage: ' abc '.trim() returns 'abc'
        /// </summary>
        /// <returns>Original string minus white spaces at the start and end</returns>
        return this.replace(/^\s+|\s+$/g, "");
    };

    // DO NOT DO var x = new RegEx(/\{\d+\}/g); because Blackberry adds an extra /g at the end

    // Regex that finds {#} so it can be replaced by the arguments in string format
    var c_FormatRegEx = /\{\d+\}/g;
    // Regex that finds {string} so it can be replaced by the arguments in string item format
    var c_FormatItemRegEx = /\{[a-z|A-Z|\.|\$|\:]+\}/g;
    // Regex that finds { and } so they can be removed on a lookup for string format
    var c_FormatArgsRegEx = /[\{\}]/g;


    _stringPrototype.format = /* @bind(String), @varargs */function $String$format(s)
    {
        /// <summary>
        /// String Format is like C# string format.
        /// Usage Example: "hello {0}!".format("mike") will return "hello mike!"
        /// Calling format on a string with less arguments than specified in the format is invalid
        /// Example "I love {0} every {1}".format("CXP") will result in a Debug Exception.
        /// </summary>
        /// <param name="s" parameterArray="true" type="String">The values passed will be used in the string format</param>
        var args = arguments;
        //Callback match function
        function replace_func(match)
        {
            /// <param name="match" type="String">regex match</param>

            //looks up in the args
            var replacement = args[match.replace(c_FormatArgsRegEx, "")];
            Debug.assert(typeof (replacement) != 'undefined', 'String Format- Provide argument at index ' + match.replace(c_FormatArgsRegEx, ""));
            // catches undefined in nondebug and null in debug and nondebug
            if (replacement == null)
            {
                replacement = '';
            }
            return replacement;
        }
        return (this.replace(c_FormatRegEx, replace_func));
    };

    /* @dynamic */ function findNodeInObject(path, object)
    {
        /// <summary>
        /// Finds the node in the object with that path
        /// </summary>
        /// <param name="path" type="String">The path to the node in the object</param>
        /// <param name="object" type="Object">The object to find the path in</param>
        /// <returns type="*">This is the object found at the path or null is returned</returns>

        var pathArray = path.split('.');
        var /* @dynamic */currentNode = object;
        for (var x = 0; x < pathArray.length; x++)
        {
            currentNode = currentNode[pathArray[x]];
            if (typeof currentNode === "undefined")
            {
                return /* @static_cast(*) */null;
            }
        }

        return currentNode;
    }

    _stringPrototype.itemFormat = /* @bind(String) */function $String$itemFormat(object, functionObject, functionArgs)
    {
        /// <summary>
        /// String Format that you can use a predefined object and function object used for formating. 
        /// The code will look into the object first and if node is not it will look into the function object.
        /// Example: 
        /// &#10;'1 - {$Config.mkt} 2 - {test}'.itemFormat({ '$Config': $Config },
        /// &#10;{ 'test': function (s)
        /// &#10;&#10;{
        /// &#10;&#10;&#10;return s;
        /// &#10;&#10;}
        /// &#10;},
        /// &#10;['hello']);
        /// </summary>
        /// <param name="object" type="Object">The values passed will be used in the string format</param>
        /// <param name="functionObject" type="Object" optional="true">The values passed will be used in the string format</param>
        /// <param name="functionArgs" type="Array" optional="true">This is an array of arguments to pass to a matched function, if found</param>

        // make sure we have a function object
        functionObject = functionObject || {};
        // make sure we have arguments
        functionArgs = functionArgs || [];

        function replace_func(match)
        {
            /// <summary>
            /// This function looks up the base value or function to execute, and if a post processing function is 
            /// required it executes that function with the looked up value
            /// </summary>
            /// <param name="match" type="String">regex match</param>

            //looks up in the args
            var path = match.replace(c_FormatArgsRegEx, '');

            var /* @type(String -> String) */processValueFunction;
            var operations = path.split(':');
            var /* @type(String)*/output = '';

            var objectNode = findNodeInObject(operations[0], object);
            if (objectNode != null)
            {
                output = /* @static_cast(String) */objectNode;
            }
            else
            {
                var functionNode = /* @static_cast(Function) */findNodeInObject(operations[0], functionObject);
                if (functionNode != null)
                {
                    output = /* @static_cast(String) */functionNode.apply(this, functionArgs);
                }
                else
                {
                    Debug.fail('String Item Format- Provide argument ' + match.replace(c_FormatArgsRegEx, ''));
                }
            }

            //  Test if we have a post processing operation
            if (operations.length == 2)
            {
                processValueFunction = /* @static_cast(String -> String) */findNodeInObject(operations[1], functionObject);
                Debug.assert(/* @static_cast(Boolean) */processValueFunction, 'String Item Format- Process Value Function ' + match.replace(c_FormatArgsRegEx, '') + ' was not found.');
            }

            // process the value if there is a process value function
            return processValueFunction ? processValueFunction(output) : output;
        }
        return (this.replace(c_FormatItemRegEx, replace_func));
    };

    // Escaping Routines

    //encode if a character not matches with [a-zA-Z0-9_.,-]
    var c_EncodeHtmlAttributeRegEx = /[^\w.,-]/g;

    _stringPrototype.encodeXmlAttribute = _stringPrototype.encodeHtmlAttribute = /* @bind(String) */function $String$encodeHtmlAttribute()
    {
        /// <summary>
        /// Encodes a string to be displayed in the browser. 
        /// Usage: element.innerHTML = "&lt;a href=\"" + $WebSecurity.getSafeUrlUnencoded(url).encodeHtmlAttribute() + "\">here&lt;/a&gt;");
        /// Usage: element.innerHTML = "&lt;img src=\"hardcoded.gif\" alt=\"" + dataFromUser.encodeHtmlAttribute() + "\" /&gt;");
        /// </summary>
        /// <returns>Encoded Xml/Html Attribute</returns>
        return this.replace(c_EncodeHtmlAttributeRegEx, function (_match)
        {
            /// <summary>
            /// Replace Helper Function
            /// </summary>
            /// <param name="_match" type="String">Regex Match</param>
            /// <returns type="String">replaced match</returns>

            return ["&#", _match.charCodeAt(0), ";"].join("");
        });
    };


    function extendedCharCodeAt(str, idx, /* @dynamic */result)
    {
        /// <summary>
        /// Gets the char code from str at idx.
        /// Supports Secondary-Multilingual-Plane Unicode characters (SMP), e.g. codes above 0x10000
        /// </summary>
        /// <param name="str" type="String">String to get char code from</param>
        /// <param name="idx" type="Number">Index of char to get code for</param>
        /// <param name="result" type="*">Receives result code c: and index skip s: info</param>
        /// <returns>True if this method processed the char code</returns>
        
        var skip = (result.s === idx);
        if (!skip)
        {
            idx = idx || 0;
            var code = str.charCodeAt(idx);
            var hi, low;
            result.s = -1;
            if (code < 0xD800 || code > 0xDFFF)
            {
                //Main case, Basic-Multilingual-Plane (BMP) code points.
                result.c = code;
            }
            else if (code <= 0xDBFF) // High surrogate of SMP
            {
                hi = code;
                low = str.charCodeAt(idx + 1);
                Debug.assert(!isNaN(low), 'High surrogate not followed by low surrogate in fixedCharCodeAt()');
                result.c = ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
                result.s = idx + 1;
            }
            else // Low surrogate of SMP, 0xDC00 <= code && code <= 0xDFFF
            {
                //Shouldn't really ever come in here, previous call to this method would set skip index in result
                //in high surrogate case, which is short-circuited at the start of this function.
                result.c = -1;
                skip = true;
            }
        }
        return !skip;
    }

    //encode if a character not matches with [a-zA-Z0-9_{space}.,-].
    var c_EncodeHtmlRegEx = /[^\w .,-]/g;

    _stringPrototype.encodeXml = _stringPrototype.encodeHtml = /* @bind(String) */function $String$encodeHtml()
    {
        /// <summary>
        /// Aggressively encodes a string to be displayed in the browser. All non-letter characters are converted
        /// to their Unicode entity ref, e.g. &#65;, period, space, comma, and dash are left un-encoded as well.
        /// Usage: _divElement.innerHTML =_someValue.encodeHtml());
        /// </summary>
        /// <returns>Encode Xml/Html</returns>
        var /* @dynamic */charCodeResult = {
            c: 0, // Code
            s: -1 // Next skip index
        };

        return this.replace(c_EncodeHtmlRegEx, function (match, ind, s)
        {
            /// <summary>
            /// Replace Helper Function
            /// </summary>
            /// <param name="_match" type="String">Regex Match</param>
            /// <param name="ind" type="Number">Index into the string where the match occurred</param>
            /// <param name="s" type="String">The string where the match occurred</param>
            /// <returns type="String">replaced match</returns>
            if (extendedCharCodeAt(s, ind, charCodeResult))
            {
                return ["&#", charCodeResult.c, ";"].join("");
            }
            //If extendedCharCodeAt returns false that means this index is the low surrogate,
            //which has already been processed, so we remove it by returning an empty string.
            return "";
        });
    };

    //encode if a character not matches with [a-zA-Z0-9.%-]
    //% in the whitelist prevents the double encoding of '%' (from %25 to erroneous output %2525)
    var c_EncodeUrlRegEx = /[^\w.%-]/g;

    _stringPrototype.encodeURIComponent = _stringPrototype.encodeUrl = /* @bind(String) */function $String$encodeUrl()
    {
        /// <summary>
        /// URL encodes the specified value
        /// Usage: 
        ///   var url = "http://search.live.com/results.aspx?query=" + userInput.encodeUrl();
        ///   element.innerHTML = "&lt;a href=\"" + $WebSecurity.getSafeUrlUnencoded(url).encodeHtmlAttribute() + "\"&gt;here&lt;/a&gt;");
        ///   _anchor.setAttribute("href", $WebSecurity.getSafeUrlUnencoded(url));
        /// </summary>
        /// <returns>Encode String</returns>

        return encodeURIComponent(this).replace(c_EncodeUrlRegEx, function (_match)
        {
            /// <summary>
            /// Replace Helper Function
            /// </summary>
            /// <param name="_match" type="String">Regex Match</param>
            /// <returns type="String">replaced match</returns>

            /* Note: we should never see a non-ASCII char here*/
            var hex = _match.charCodeAt(0).toString(16);
            return "%" + ((hex.length == 1) ? "0" + hex : hex).toUpperCase();
        });
    };

    // encode if a character not matches with [a-zA-Z0-9_{space}.,-].
    var c_EncodeJsonRegEx = /[^\w .,-]/g;

    _stringPrototype.encodeJson = /* @bind(String) */function $String$encodeJson()
    {
        /// <summary>
        /// Encodes a string to be used for a JSON string.
        /// Note this does not add the double quotes required to surround JSON strings.
        /// </summary>
        /// <returns type="String">Encoded String</returns>

        return this.replace(c_EncodeJsonRegEx, function (_match)
        {
            /// <summary>
            /// Replace Helper Function
            /// </summary>
            /// <param name="_match" type="String">Regex Match</param>
            /// <returns type="String">replaced match</returns>

            var hex = _match.charCodeAt(0).toString(16);
            var zeroPadding = new Array(4 - hex.length + 1).join('0');
            return "\\u" + zeroPadding + hex.toUpperCase();
        });
    };

    _stringPrototype.decodeURIComponent = _stringPrototype.decodeUrl = /* @bind(String) */function $String$decodeUrl()
    {
        /// <summary>
        /// Decodes a URI Component encoded with string.encodeURIComponent, string.encodeUrl
        /// </summary>
        /// <returns>Decoded String</returns>
        return decodeURIComponent(this);
    };

    var _escapeRegex = /([\\\.\{\}\(\)\[\]\/\+\*\?\|\^\$])/gi;

    /// <summary>
    /// Escapes any regex characters in a string
    /// </summary>
    _stringPrototype.escapeRegex = /* @bind(String) */function $String$escapeRegex(value) //TODO remove the value argument
    {
        ///<summary>Escapes any regex characters in a string</summary>
        ///<param name="value" type="String" optional="true"></param>
        return (arguments.length == 0 ? this : value).replace(_escapeRegex, "\\$1");
    };

})();