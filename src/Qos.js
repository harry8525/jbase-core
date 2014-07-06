(function ()
{
    /// <summary>
    /// Namespace for recording Qos of JavaScript operation.
    ///
    /// To use Qos, you must burn $Config.isQosEnabled = 1 onto your page.
    ///
    /// </summary>

    var c_qosKeyPrefix = 'QOS issue: ';
    var c_unhandledExceptionCode = "UnhandledException";
    var c_unhandledAsyncExceptionCode = "UnhandledAsyncException";
    var c_abortedCode = "UnhandledChildException";
    var c_ignoredErrorType = "c";

    var _logKey = 1;
    var _logs = {};
    var _defaultErrorId = '';
    var _qosOnLogErrorId = '';
    var _contextStack = [];
    var _instance = 1;
    var _isGuardedInTryCatch = false;

    /* @disable(0058) */
    /* @disable(0092) */
    var _isEnabled = !!(window.$Config && $Config.isQosEnabled);

    ///#DEBUG
    // Enabled for unit testing.
    _isEnabled |= !!(window.LiveUnit);
    ///#ENDDEBUG

    /* @restore(0058) */
    /* @disable(0092) */

    window.Qos = {

        responseType: {
            success: "s",
            expected: "c",
            unexpected: "f"
        },

        isEnabled: _isEnabled,

        instrument: function (context, callback)
        {
                /// <summary>Instruments a function for recording its Qos.</summary>
                /// <param name="context" type="*">Qos operation representing the context in which to run the function, or null if not applicable.</param>
                /// <param name="callback" type="Function">Function to instrument.</param>
                /// <returns type="... -> *">The returned function.</returns>

            return function ()
            {
                var retVal;

                if (context)
                {
                    _contextStack.push(context);
                }

                if (!_isGuardedInTryCatch)
                {
                    // Only try/catch at the root instrument block. Call the callback immediately otherwise.
                    try
                    {
                        if (callback)
                        {
                            _isGuardedInTryCatch = true;
                            retVal = callback.apply(this, arguments);
                        }
                    }
                    catch (/* @type(Error) */ e)
                    {
                        // Calling this will rethrow the exception.
                        Qos.instrumentException(e);

                    }
                    finally
                    {
                        _isGuardedInTryCatch = false;
                    }
                }
                else
                {
                    if (callback)
                    {
                        retVal = callback.apply(this, arguments);
                    }
                }

                if (context)
                {
                    Qos.end();
                }

                return retVal;
            };
        },

        onUnhandledError: function (message, fileName, stack)
        {
            /// <summary>
            /// Function to run on an unhandled error.
            /// </summary>
            /// <param name="message" type="String">Error message.</param>
            /// <param name="fileName" type="String">URI of the file in which the error occurred.</param>
            /// <param name="stack" type="String">Stack trace of the error.</param>

            stack = stack || "";

            if (/* @static_cast(Boolean) */message &&
                /* @static_cast(Boolean) */fileName)
            {
                var fileNameInStack = ' (' + fileName + ')';
                var firstNewline = stack.indexOf('\n');

                if (firstNewline !== -1)
                {
                    stack = stack.substring(0, firstNewline) + fileNameInStack + stack.substring(firstNewline);
                }
                else
                {
                    stack = stack + fileNameInStack;
                }

                // Creating our own pseudo stack trace from the available information.
                stack = message + '\n' + 'at ' + stack;

                Qos.instrumentException({ message: message, stack: stack, isUnhandled: true });
            }
        },

        clearLogs: function ()
        {
            /// <summary>
            /// Clears the logged Qos events
            /// </summary>
            /// <returns type="*">Logs that have been cleared.</returns>

            var clearedLogs = _logs;

            _logKey = 1;
            _logs = {};

            return clearedLogs;
        },

        createContext: function (apiId)
        {
                /// <summary>Creates a QOS context.</summary>
                /// <param name="apiId" type="String">Api name to be logged for the given context to Metron.</returns>
                /// <returns type="*">Qos context object.</returns>

            var context = null;

            if (apiId)
            {
                context = {
                    id: apiId,
                    startTime: new Date().getTime()
                };
            }

            return context;
        },

        start: function (apiId)
        {
            /// <summary>Starts a block to be logged to Metron for QOS.</summary>
            /// <param name="apiId" type="String">Passing in null creates an anonymous context.</param>

            // Uncomment to debug missing qos instrument blocks.
            // Debug.assert(_isGuardedInTryCatch, "Qos.start() was called while not within an instrumented block.");

            // Push context to the current stack.
            _contextStack.push(Qos.createContext(apiId));
        },

        end: function ()
        {
            /// <summary>Ends a block to be logged to Metron for QOS.</summary>

            Debug.assert(_contextStack.length, "Qos.end() was called without a matching Qos.start().");

            _completeContext(_contextStack.pop());
        },

        getContext: function ()
        {
            /// <summary>Gets the current context that's being executed, if any.</summary>

            var context = _contextStack.length ? _contextStack[_contextStack.length - 1] : null;

            return context;
        },

        instrumentException: function (e)
        {
            /// <summary>Instruments an exception that has been thrown.</summary>
            /// <param name="e" type="Error">The exception object.</param>

            // Only process the exception if it has an exception stack. Otherwise, let it be caught by
            // the global exception handler.
            if (/* @static_cast(Boolean) */e)
            {
                if (!!e.stack)
                {
                    // Complete the current context if applicable.
                    _completeContext(_contextStack.pop(), false, e);

                    // Log all pending contexts as aborted.
                    while (_contextStack.length)
                    {
                        _completeContext(_contextStack.pop(), true);
                    }
                }

                if (!e.isUnhandled)
                {
                    ///#DEBUG
                    var debugStack = e.stack;
                    if (debugStack)
                    {
                        Debug.trace("Caught exception {0}:{1}".format(e.message, debugStack));
                    }
                    ///#ENDDEBUG
                    throw e;
                }
            }
        },

        log: function (id, partnerId, startTime, errorCode, errorType, stack, endTime)
        {
            /// <summary>
            /// Logs a QoS event.
            /// </summary>
            /// <param name="id" type="String">The ID of the event.</param>
            /// <param name="partnerId" type="String">The ID of the partner that owns the event.</param>
            /// <param name="startTime" type="Number" optional="true">The start time.</param>
            /// <param name="errorCode" type="String" optional="true">The error code.</param>
            /// <param name="errorType" type="String" optional="true">The error type.</param>
            /// <param name="stack" type="String" optional="true">The stack trace.</param>
            /// <param name="endTime" type="Number" optional="true">The end time.</param>

            if (/* @static_cast(Boolean) */ id && Qos.isEnabled)
            {
                if (!!stack && errorType != c_ignoredErrorType)
                {
                    Qos.displayErrorCallback && Qos.displayErrorCallback({ stack: stack });
                }

                endTime = endTime || new Date().getTime();
                _logs[_logKey++] = {
                    id: id,
                    partnerId: partnerId,
                    startTime: startTime || endTime,
                    errorCode: errorCode,
                    errorType: errorType,
                    stack: stack,
                    endTime: endTime
                };
            }
        },

        logData: function (id, partnerId, startTime, errorCode, errorType, data, endTime) {
            /// <summary>
            /// Logs a QoS event passing in JSON.stringify'd object in place of the default stack trace.
            /// </summary>
            /// <param name="id" type="String">The ID of the event.</param>
            /// <param name="partnerId" type="String">The ID of the partner that owns the event.</param>
            /// <param name="startTime" type="Number" optional="true">The start time.</param>
            /// <param name="errorCode" type="String" optional="true">The error code.</param>
            /// <param name="errorType" type="String" optional="true">The error type.</param>
            /// <param name="data" type="*" optional="true">An object to be converted to a JSON string</param>
            /// <param name="endTime" type="Number" optional="true">The end time.</param>

            var jsonData = data ? JSON.stringify(data) : "";
            Qos.log(id, partnerId, startTime, errorCode, errorType, jsonData, endTime);
        },

        displayErrorCallback: function (e) { }, // Override this function to handle displaying errors in UI. The function will be passed the Exception object.

        registerDefaultErrorId: function (errorId)
        {
            /// <summary>
            /// Registers a default ID for logging errors.
            /// </summary>
            /// <param name="errorId" type="String">The ID.</param>

            _defaultErrorId = errorId;
        },

        registerQosOnLogErrorId: function (errorId)
        {
            /// <summary>
            /// Registers a default ID for Qos on error logging.
            /// </summary>
            /// <param name="errorId" type="String">The ID.</param>

            _qosOnLogErrorId = errorId;
        }
    };

    function _completeContext(context, isAborted, exception)
    {
        /// <summary>Completes a context.</summary>
        /// <param name="context" type="*" optional="true"></param>
        /// <param name="isAborted" type="Boolean" optional="true"></param>
        /// <param name="exception" type="Error" optional="true"></param>

        context = context || {};

        var errorCode = isAborted ? c_abortedCode : null;
        var errorType = isAborted ? c_ignoredErrorType : null;
        var stack = null;
        var now = new Date().getTime();

        context.startTime = context.startTime || now;
        context.endTime = context.endTime || now;

        if (/* @static_cast(Boolean) */ exception && /* @static_cast(Boolean) */ exception.stack)
        {
            errorCode = exception.code || (context.isLogged ? c_unhandledAsyncExceptionCode : c_unhandledExceptionCode);

            var message = exception.message || exception.description || (exception.toString ? exception.toString() : "");

            if (message.indexOf(c_qosKeyPrefix) == -1)
            {
                /* @disable(0092) */
                /* @static_cast(Boolean) */ Qos.displayErrorCallback && Qos.displayErrorCallback(exception);
                /* @restore(0092) */

                // Mark the exception as logged, so window.onerror logging doesn't log it redundantly.
                context.id = context.id || _defaultErrorId;
                context.asyncOperations = 0;
                exception.message = exception.description = c_qosKeyPrefix + message;
                stack = exception.stack;
            }
            else
            {
                // Ignore exceptions that have already been logged.
                exception = null;
            }
        }

        if (context.id)
        {            
            if (!context.isLogged || /* @static_cast(Boolean) */ exception)
            {
                context.isLogged = true;

                Qos.log(
                    context.id,         // api id
                    null,               // scenario id
                    context.startTime,  // start time
                    errorCode,          // error code (shows up in metron ui)
                    errorType,          // type used to determine if it should be treated as expected
                    stack,              // stack, gets uncrunched on server and sent to cosmos
                    context.endTime);   // end time
            }
        }
    }

    // Reset logs.
    Qos.clearLogs();

})();