/// <reference path=".../../wlive.vsref.js" />
/// Copyright (C) Microsoft Corporation. All rights reserved.

///#DEBUG
(function ()
{
    //Namespace References
    var _window = window;

    //Register Function
    /* @disable(0092) */
    var $B = /* @dynamic */_window.$B;
    /* @restore(0092) */

    var Debug = _window.Debug = {};

    Debug.options = {
        tracePagePath: false //Set this to true to include the page's path when tracing with Debug.trace().
    };

    Debug.fail = function DebugFail(message)
    {
        /// <summary>
        ///     Fails execution of script and invokes the debugger with the provided message.
        /// </summary>
        /// <param name="message" type="String">Message to show if the condition is not met.</param>

        var error = new Error(message + ' '); //TODO: What is the space for after the message?

        // This line is here instead of at the top because it is an optional API circular reference.
        /* @disable(0092) */
        var /* @dynamic */$WebWatson = _window.$WebWatson;
        /* @restore(0092) */

        // The if block breaks the circular dependancy.
        if ($WebWatson)
        {
            $WebWatson.submitFromException(error, undefined, 33);
        }

        if ($B && (/* @static_cast(Boolean) */$B.BlackBerry))
        {
            //Only come in here on BlackBerry.
            alert('Error: ' + message);
        }
        else
        {
            throw error;
        }
    };

    Debug.assert = function DebugAssert(condition, message)
    {
        /// <summary>
        ///      Asserts a condition and invokes the debugger with the provided message if
        ///      the condition is not met.
        /// </summary>
        /// <param name="condition" type="*">Condition to check.</param>
        /// <param name="message" type="String">Message to show if the condition is not met.</param>

        if (!condition)
        {
            message = 'Assert failed: ' + message;
            if (!window['LiveUnit'] && confirm(message + '\r\n\r\nBreak into debugger?'))
            {
                debugger;
                Debug.fail(message);
            }
        }
    };

    Debug.failIf = function DebugFailIf(condition, message)
    {
        /// <summary>
        ///     Fails execution of script and invokes the debugger with the provided message if
        ///     the condition is not met.
        /// </summary>
        /// <param name="condition" type="Boolean">Condition to check.</param>
        /// <param name="message" type="String">Message to show if the condition is not met.</param>

        if (!condition)
        {
            Debug.fail(message);
        }
    };

    Debug.trace = function DebugTrace(message, category)
    {
        /// <summary>
        /// Trace a message to the console if it is available.
        /// </summary>
        /// <param name="message" type="String">Message to trace.</param>
        /// <param name="category" type="String" optional="true">Category to trace to.</param>

        if (!message)
        {
            message = "";
        }
        if (_window["console"] && _window["console"].log)
        {
            if (Debug.options.tracePagePath)
            {
                var pagePath = _window.location.pathname;
                if (!category)
                {
                    category = pagePath;
                }
                else
                {
                    category = pagePath + ": " + category;
                }
            }
            if (category)
            {
                message = category + ": " + message;
            }
            _window["console"].log(message);
        }
    };

})();
///#ENDDEBUG
