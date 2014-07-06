(function ()
{
    /// <summary>
    /// Helpers to ensure native operations get auto instrumented so that we have try/catch blocks at the base of every callstack.
    /// </summary>

    var _instance = 1;
    var _listenerCallbacks = {};

    var _nativeSetTimeout = setTimeout;
    var _nativeSetInterval = setInterval;

    // Instrument add/remove event listener functions.
    if (Qos.isEnabled)
    {
        // Override setTimeout and setInterval
        try
        {
            /* @disable(0103) */
            /* @disable(0097) */
            setTimeout = _setTimeoutOverride;
            setInterval = _setIntervalOverride;
            /* @restore(0097) */
            /* @restore(0103) */
        }
        catch (/* @type(Error) */e)
        {
            // IE <= 8 does not allow overriding the native timeout methods.
            // These browsers will not be able to instrument callbacks handled via these methods.
        }

        // Override default event listening
        /* @disable(0092) */
        if (window.Node && window.Node.prototype && window.Node.prototype.addEventListener && window.Window)
        {
            var nodeProto = window.Node.prototype;
            var windowProto = Window.prototype;

            nodeProto.addEventListener = _createAddEventListener(nodeProto.addEventListener);
            nodeProto.removeEventListener = _createRemoveEventListener(nodeProto.removeEventListener);

            /* @disable(0103) */
            windowProto.addEventListener = _createAddEventListener(windowProto.addEventListener);
            windowProto.removeEventListener = _createRemoveEventListener(windowProto.removeEventListener);
            /* @restore(0103) */
        }
        /* TODO (Iansul) 6/12/13: WinLive PS# 825813, IE8 has problems when trying to bind events to the BODY element.
        I debugged this for 2 days and all I could figure out was that certain event types (mousedown,
        dblclick, dragover, and drop) would throw an exception when we tried to execute 
        nativeFunction.apply(this, arguments), with this being the "BODY" element, that is generated in the
        _createAddEventListener and _createRemoveEventListener functions.
        I spoke with dzearing and we agreed to disable this for IE8 for the time being.
        else if (window.Element && window.HTMLDocument) // IE8
        {
            var elementProto = window.Element.prototype;
            var documentProto = window.HTMLDocument.prototype;

            elementProto.attachEvent = _createAddEventListener(elementProto.attachEvent);
            elementProto.detachEvent = _createRemoveEventListener(elementProto.detachEvent);

            documentProto.attachEvent = _createAddEventListener(documentProto.attachEvent);
            documentProto.detachEvent = _createRemoveEventListener(documentProto.detachEvent);
        }
        */
        /* @restore(0092) */
    }

    function _getId(obj)
    {
        /// <summary>Returns an id for the given instance.</summary>

        if (!obj.__qosId)
        {
            obj.__qosId = String(_instance++);
        }

        return obj.__qosId;
    }

    function _setTimeoutOverride()
    {
        /// <summary>Override for the native setTimeout method to instrument the Qos of executed callbacks.</summary>
        /// <returns type="*">Id of the native setTimeout method.</returns>

        if (arguments[0] && typeof arguments[0] === "function")
        {
            arguments[0] = Qos.instrument(Qos.getContext(), arguments[0]);
        }

        return _nativeSetTimeout.apply(this, arguments);
    }

    function _setIntervalOverride()
    {
        /// <summary>Override for the native setInterval method to instrument the Qos of executed callbacks.</summary>
        /// <returns type="*">Id of the native setInterval method.</returns>

        if (arguments[0] && typeof arguments[0] === "function")
        {
            arguments[0] = Qos.instrument(Qos.getContext(), arguments[0]);
        }

        return _nativeSetInterval.apply(this, arguments);
    }


    function _createAddEventListener(nativeFunction)
    {
        /// <summary>Creates an instrumented callback for the given native addEventListener.</summary>

        return function (eventType, callback)
        {
            if (arguments.length >= 2 && !!callback)
            {
                var callbackId = eventType + _getId(callback);
                var instrumentedCallback = _listenerCallbacks[callbackId] = Qos.instrument(null, callback);

                arguments[1] = instrumentedCallback;
            }

            return nativeFunction.apply(this, arguments);
        };
    }
        
    function _createRemoveEventListener(nativeFunction)
    {
        /// <summary>Creates an instrumented callback for the given native removeEventListener.</summary>

        return function (eventType, callback)
        {
            if (arguments.length >= 2 && !!callback)
            {
                var callbackId = eventType + _getId(callback);
                var instrumentedCallback = _listenerCallbacks[callbackId];

                if (instrumentedCallback)
                {
                    arguments[1] = instrumentedCallback;
                    delete _listenerCallbacks[callbackId];
                }
            }
            return nativeFunction.apply(this, arguments);
        };
    }

})();