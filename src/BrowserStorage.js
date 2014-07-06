/// Copyright (C) Microsoft Corporation. All rights reserved.

(function ()
{
    var downlevelSessionObject = {};

    /* @disable(0058) */
    /* @disable(0092) */
    var localKeySuffix = (/* @static_cast(Boolean) */window.$Config && /* @static_cast(Boolean) */$Config.hcid) ? '.' + $Config.hcid : '';
    /* @restore(0058) */
    /* @restore(0092) */

    window.BrowserStorage = {
        setSessionValue: function (key, value)
        {
            /// <summary>
            /// This sets a session value
            /// </summary>
            /// <param name="key" type="String">The key to store the value under</param>
            /// <param name="value" type="Object">The value to store under the key</param>

            try
            {
                /* @disable(0092) */
                if (window.sessionStorage)
                {
                    sessionStorage[key] = Object.toJSON(value);
                }
                else
                {
                    downlevelSessionObject[key] = Object.toJSON(value);
                }
                /* @restore(0092) */
            }
            catch (e) { }
        },
        getSessionValue: function (key)
        {
            /// <summary>
            /// This gets the session value from a key
            /// </summary>
            /// <param name="key" type="String">The key to get the value from</param>
            /// <returns type="Object">The value at the key</returns>

            try
            {
                var value;

                /* @disable(0092) */
                if (window.sessionStorage)
                {
                    value = sessionStorage[key];
                }
                else
                {
                    value = downlevelSessionObject[key];
                }
                /* @restore(0092) */

                return value ? Object.fromJSON(value) : /* @static_cast(Object) */undefined;
            }
            catch (e) { }

            return /* @static_cast(Object) */undefined;
        },
        setLocalValue: function (key, value, isGlobal)
        {
            /// <summary>
            /// This sets a session value
            /// </summary>
            /// <param name="key" type="String">The key to store the value under</param>
            /// <param name="value" type="Object">The value to store under the key</param>
            /// <param name="isGlobal" type="Boolean" optional="true">Default false; if true, the value to store should be applied to anyone using the computer, not just the specific user.</param>

            try
            {
                /* @disable(0092) */
                if (window.localStorage)
                {
                    if (!isGlobal)
                    {
                        key += localKeySuffix;
                    }

                    localStorage[key] = Object.toJSON(value);
                }
                /* @restore(0092) */
            }
            catch (e) { }
        },
        getLocalValue: function (key, defaultValue, isGlobal)
        {
            /// <summary>
            /// This gets the session value from a key
            /// </summary>
            /// <param name="key" type="String">The key to get the value from</param>
            /// <param name="defaultValue" type="Object" optional="true">Default value returned if the key has no associated value.</param> 
            /// <param name="isGlobal" type="Boolean" optional="true">Default false; if true, the value to store should be applied to anyone using the computer, not just the specific user.</param>
            /// <returns type="Object">The value at the key</returns>

            try
            {
                /* @disable(0092) */
                if (window.localStorage)
                {
                    if (!isGlobal)
                    {
                        key += localKeySuffix;
                    }

                    var value = localStorage[key];
                    var localValue = value ? Object.fromJSON(value) : undefined;

                    return ((localValue === null || localValue === undefined) && (defaultValue !== undefined)) ? defaultValue : localValue;
                }
                /* @restore(0092) */
            }
            catch (e) { }

            return defaultValue;
        }
    };
})();