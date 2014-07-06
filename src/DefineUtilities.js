(function ()
{
    var _instance = 1;

    mix(window, {
        /// <summary>Base utilities that should be available globally.</summary>

        getId: function (obj)
        {
            /// <summary>Gets an a unique identifier for an object.</summary>
            /// <param name="obj" type="*" optional="true">Optional object to get id for; if one is not provided, a new id will be returned.</param>
            /// <returns type="String">Id of object.</returns>

            var /* @type(String) */ id;

            if (obj)
            {
                if (!obj.__id)
                {
                    obj.__id = String(_instance++);
                }

                id = obj.__id;
            }
            else
            {
                id = String(_instance++);
            }

            return id;
        },

        getKey: function (obj)
        {
            /// <summary>Gets an object's key property, or creates one if it's missing. A key is typically managed by something external.</summary>
            /// <param name="obj" type="*" optional="true">Optional object to get id for; if one is not provided, a new id will be returned.</param>
            /// <returns type="String">Id of object.</returns>

            var /* @type(String) */ key;

            if (obj)
            {
                if (!obj.key)
                {
                    obj.key = getId(obj);
                }

                key = obj.key;
            }

            return key;
        },

        defineNamespace: /* @analysis('JBaseCMExt.ext.js', 'DefineNamespaceAnalysisExtension') */function (fullName, members, baseWindow, deep)
        {
            /// <summary>Defines a namespace. If the namespace already exists, it will add to it.</summary>
            /// <param name="fullName" type="String">A period delimited fully qualified namespace. Example: "Foo.Bar.Baz"</param>
            /// <param name="members" type="Object">An object that will be assigned to the last portion of the namespace. Example: Baz=members;</param>
            /// <param name="baseWindow" type="Object" optional="true">An object that will be assigned to the last portion of the namespace. Example: Baz=members;</param>
            /// <param name="deep" type="Boolean" optional="true">This specifies if we should do a deep definition of the namespace</param>
            /// <returns type="String">The class name, or last portion of the namespace definition.</returns>

            var nameParts = fullName.split(".");
            var parentObj = baseWindow || window;

            for (var i = 0; i < (nameParts.length - 1); i++)
            {
                parentObj = parentObj[nameParts[i]] = parentObj[nameParts[i]] || {};
            }

            var className = nameParts[nameParts.length - 1];

            if (parentObj[className])
            {
                mix(/* @static_cast(Object) */parentObj[className], members, deep);
            } else
            {
                parentObj[className] = members;
            }

            return className;
        },

        defineClass: /* @analysis('JBaseCMExt.ext.js', 'DefineClassAnalysisExtension'), @varargs */function (fullName, constructor, members, statics)
        {
            /// <summary>Defines a class.</summary>
            /// <param name="fullName" type="String">Fully qualified name of the class.</param>
            /// <param name="constructor" type="... -> void">Constructor.</param>
            /// <param name="members" type="Object">Object containing the members, which will be assigned to the prototype.</param>
            /// <param name="statics" type="Object" optional="true">Object containing static members, which will be mixed into the constructor.</param>
            /// <remarks>The class will expose __fullName and __className on all classes so that the instances can be identified in a debugger.</remarks>

            var proto = constructor.prototype;
            /* @disable(0157) */
            var className = defineNamespace(fullName, constructor);
            /* @restore(0157) */

            proto.__fullName = fullName;
            proto.__className = className;

            members && mix(/* @static_cast(Object) */proto, members);
            statics && mix(/* @static_cast(Object) */constructor, statics);

            if (arguments.length > 4)
            {
                for (var x = 4; x < arguments.length; x++)
                {
                    /* @disable(0157) */
                    mix(proto, arguments[x]);
                    /* @restore(0157) */
                }
            }
        },

        defineSubClass: /* @analysis('JBaseCMExt.ext.js', 'DefineSubClassAnalysisExtension'), @varargs */function (fullName, baseClass, constructor, members, statics)
        {
            /// <summary>
            /// Defines a subclass. The subclass will derive from the base class. The base class constructor will be called first
            /// on initial creation, and then the subclass. A _base member will also become available for referencing the base
            /// class prototype.
            /// </summary>
            /// <param name="fullName" type="String">Fully qualified name of the class.</param>
            /// <param name="baseClass" type="... -> void">Reference to the base class constructor.</param>
            /// <param name="constructor" type="... -> void">Constructor.</param>
            /// <param name="members" type="Object">Object containing the members, which will be assigned to the prototype.</param>
            /// <param name="statics" type="Object" optional="true">Object containing static members, which will be mixed into the constructor.</param>

            var innerConstructor = constructor || function () { };

            constructor = function ()
            {
                baseClass.apply(this, /* @static_cast(Array) */arguments);
                innerConstructor.apply(this, /* @static_cast(Array) */arguments);
            };

            var proto = constructor.prototype;

            // Mix in the base class prototype
            mix(/* @static_cast(Object) */proto, /* @static_cast(Object) */baseClass.prototype);

            proto._base = baseClass.prototype;

            // If the subclass received an appendedFunctions table, make a copy so that further appends are scoped to this prototype.
            if (proto.__appendedFunctions)
            {
                proto.__appendedFunctions = _clone(proto.__appendedFunctions);
            }

            /* @disable(0157) */
            defineClass(/* @static_cast(String) */fullName, /* @static_cast(Object) */constructor, /* @static_cast(Object) */members, statics);
            /* @restore(0157) */

            if (arguments.length > 5)
            {
                for (var x = 5; x < arguments.length; x++)
                {
                    /* @disable(0157) */
                    mix(proto, arguments[x]);
                    /* @restore(0157) */
                }
            }
        },

        appendFunction: appendFunction,

        mix: mix,

        bind: function (obj, func)
        {
            /// <summary>Returns a function that will call the provided function in the context of the provided object. (The "this" reference will be obj.)</summary>
            /// <param name="obj">Object that should be the "this" reference.</param>
            /// <param name="func">Function that should be called.</param>
            /// <returns type="Function">The closured function reference calling func.apply(obj, arguments).</returns>

            return function ()
            {
                return func.apply(obj, arguments);
            };
        }
    });

    function appendFunction(/* @dynamic */obj, functionName, func)
    {
        /// <summary>
        /// Given an object and a function name, append a new function to the existing one.
        /// </summary>
        /// <param name="obj"></param>
        /// <param name="functionName" type="String"></param>
        /// <param name="func" type="Function"></param>
        /// <returns></returns>

        if (!obj[functionName])
        {
            obj[functionName] = func;
        }
        else
        {
            var appendedFunctions = obj.__appendedFunctions = /* @static_cast(Object) */(obj.__appendedFunctions || {});

            if (appendedFunctions[functionName])
            {
                appendedFunctions[functionName].push(func);
            }
            else
            {
                // We have an existing function but no append list for this function, so we create the append
                // list, add both the existing and the new function to it, and replace the entry with a closured
                // function that will call all functions in the append list.

                var functionList = appendedFunctions[functionName] = [];

                appendedFunctions[functionName].push(obj[functionName]);
                appendedFunctions[functionName].push(func);

                obj[functionName] = function ()
                {
                    var currentList = /* @static_cast(Array) */ this["__appendedFunctions"][functionName];

                    for (var i = 0; i < currentList.length; i++)
                    {
                        currentList[i].apply(this, arguments);
                    }
                };
            }
        }
    }

    /* @analysis('JBaseCMExt.ext.js', 'MixAnalysisExtension') */function mix(dest, src, deep)
    {
        /// <summary>Mix the src object into the destination object.</summary>
        /// <param name="dest" type="Object"></param>
        /// <param name="src" type="Object"></param>
        /// <param name="deep" type="Boolean" optional="true">This is true if we should do a deep copy, this will also remove append function, functionality</param>
        /// <returns></returns>

        for (var i in src)
        {
            if (src.hasOwnProperty(i))
            {
                // We will replace all properties on the dest object, except for dispose functions which we will append to.
                if ((i !== "initialize" && i !== "dispose") || deep)
                {
                    if (!deep || !dest[i])
                    {
                        dest[i] = src[i];
                    }
                    else
                    {
                        /* @disable(0157) */
                        mix(dest[i], src[i], deep);
                        /* @restore(0157) */
                    }
                }
                else
                {
                    appendFunction(dest, i, src[i]);
                }
            }
        }

        return dest;
    }

    function _clone(obj)
    {
        /// <summary>Shallow clone needed to duplicate the append table during subclassing.</summary>

        var newObj = {};

        for (var prop in obj)
        {

            if (obj.hasOwnProperty(prop))
            {
                var propValue = obj[prop];

                if (propValue && Object.prototype.toString.call(propValue) === "[object Array]")
                {
                    newObj[prop] = propValue.slice(0);
                }
                else
                {
                    newObj[prop] = propValue;
                }
            }
        }

        return newObj;
    }

})();