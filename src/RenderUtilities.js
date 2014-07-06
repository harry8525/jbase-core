/*
    This adds the base render utilities, like incapsulating request animation frame, and the batching of calls into what we like to call a render frame.
    The goal of these utilities is to make it so all dom interactions happen in one thread context (similar to how video games paint).
*/
(function ()
{
    var _hasPendingRequestFrame = false;
    var _onRenderFrameCallbacksCounts = 0;
    var _onRenderFrameCallsCount = 0;
    var _onRenderFrameCallbacks = {};
    var _onEndOfRenderFrameCallbacks = {};
    var _traceOnRenderFrame = false;
    var _renderFramesCount = {};
    var _renderFramesDurationSum = {};
    var /* @type(Number) */_lastRequestAnimationFrameTime;
    var c_onRenderFrameTraceCategory = 'OnRenderFrame';
    var c_nativeRequestAnimationFrameSupport = false;

    Trace.register(c_onRenderFrameTraceCategory, { isEnabled: false });

    /* @disable(0092) */
    /* @disable(0058) */
    var isMacSafari = window['$B'] && $B.SF_Mac;
    var c_requestAnimationFrame =  window.requestAnimationFrame ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame ||
              window.oRequestAnimationFrame ||
              window.msRequestAnimationFrame;
    /* @restore(0092) */
    /* @restore(0058) */

    // Special case Safari Mac to not use requestAnimationFrame.
    if (c_requestAnimationFrame && !isMacSafari)
    {
        c_nativeRequestAnimationFrameSupport = true;
    }
    else
    {
    c_requestAnimationFrame = function (callback)
        {
            setTimeout(callback, 0);
        };
    }

    // This generates a safe request animation frame function
    window.safeRequestAnimationFrame = function (callback)
    {
        return c_requestAnimationFrame.call(this, Qos.instrument(Qos.getContext(), callback));

    };

    // ===========================================
    // Public helper methods.

    mix(window, {
        /// <summary>Render utilities to be mixed into the window definition.</summary>

        doOnRenderFrame: _doOnRenderFrame,
        doOnRenderFrameEveryXFrames: _doOnRenderFrameEveryXFrames,
        stopDoOnRenderFrame: _stopDoOnRenderFrame,
        doOnEndOfRenderFrame: _doOnEndOfRenderFrame,
        stopDoOnEndOfRenderFrame: _stopDoOnEndOfRenderFrame,
        c_doOnRenderFrameTraceCategory: c_onRenderFrameTraceCategory,
        c_nativeRequestAnimationFrameSupport: c_nativeRequestAnimationFrameSupport
    });

    // End: Public helper methods.
    // ===========================================

    function _executeOnRenderFrame(duration)
    {
        /// <summary>
        /// This executes the on frame render, by calling all of the callbacks for the next frame
        /// </summary>

        // make sure we have some duration
        duration = (new Date()).getTime() - _lastRequestAnimationFrameTime;

        _hasPendingRequestFrame = false;

        // reset values and store curren values
        // (this way if someone schedule something in one of the callbacks its put on the next frame render)
        var onRenderFrameCallbacksCounts = _onRenderFrameCallbacksCounts;
        var onRenderFrameCallbacks = _onRenderFrameCallbacks;
        var onEndOfRenderFrameCallbacks = _onEndOfRenderFrameCallbacks;
        var onRenderFrameCallsCount = _onRenderFrameCallsCount;
        var traceOnRenderFrame = _traceOnRenderFrame;

        _onRenderFrameCallsCount = 0;
        _onRenderFrameCallbacksCounts = 0;
        _onRenderFrameCallbacks = {};
        _onEndOfRenderFrameCallbacks = {};
        _traceOnRenderFrame = false;


        ///#DEBUG
        var trace;

        if (traceOnRenderFrame)
        {
            trace = Trace.log("OnRenderFrame - callbacks: " + onRenderFrameCallbacksCounts + " calls: " + onRenderFrameCallsCount + " (" + ((1 - (onRenderFrameCallbacksCounts / onRenderFrameCallsCount)) * 100) + "% saved)", c_onRenderFrameTraceCategory);
        }

        try
        {
            // Only do this if the browser natively supports this to minimize CPU usage in debug modes
            if (c_nativeRequestAnimationFrameSupport)
            {
                Trace.endFrame();
                Trace.startFrame();
            }

            ///#ENDDEBUG

            // Call the callbacks
            for (var x in onRenderFrameCallbacks)
            {
                onRenderFrameCallbacks[x](duration);
            }

            for (x in onEndOfRenderFrameCallbacks)
            {
                onEndOfRenderFrameCallbacks[x](duration);
            }

            ///#DEBUG

            // Only do this if the browser natively supports this to minimize CPU usage in debug modes
            if (c_nativeRequestAnimationFrameSupport)
            {
                _doOnRenderFrame("_queueNextAnimationFrame", function () { }, true);
            }
        }
        finally
        {
            if (traceOnRenderFrame)
            {
                Trace.logTo(trace, "Done.", c_onRenderFrameTraceCategory);
            }
        }
        ///#ENDDEBUG
    }

    function _stopDoOnRenderFrame(guid)
    {
        /// <summary>
        /// This will stop the call at the next render frame
        /// </summary>
        /// <param name="guid" type="String">The guid for the render frame call</param>

        if (_onRenderFrameCallbacks[guid])
        {
            delete _onRenderFrameCallbacks[guid];
        }
    }

    function _doOnRenderFrame(guid, callback, hideOnRenderFrameFromLog)
    {
        /// <summary>
        /// This will call the passed callback at the next render frame, if the guid is already registered it will
        /// overwrite that callback with the passed one
        /// </summary>
        /// <param name="guid" type="String">The guid for the current callback</param>
        /// <param name="callback" type="void -> void">The callback to call on render frame</param>
        /// <param name="hideOnRenderFrameFromLog" type="Boolean" optional="true">This is true if we should hide this call from the trace logs (this is to stop infinite log scenarios, aka trace window render frame calls)</param>

        var currentCallback = _onRenderFrameCallbacks[guid];

        if (!currentCallback)
        {
            _onRenderFrameCallbacksCounts++;
        }
        _onRenderFrameCallsCount++;

        _traceOnRenderFrame = _traceOnRenderFrame || !hideOnRenderFrameFromLog;

        _onRenderFrameCallbacks[guid] = callback;

        _safeStartRenderFrame();
    }

    function _stopDoOnEndOfRenderFrame(guid)
    {
        /// <summary>
        /// This will stop the call at the end of the next render frame
        /// </summary>
        /// <param name="guid" type="String">The guid for the end of the render frame call</param>

        if (_onEndOfRenderFrameCallbacks[guid])
        {
            delete _onEndOfRenderFrameCallbacks[guid];
        }
    }

    function _doOnEndOfRenderFrame(guid, callback, hideOnRenderFrameFromLog)
    {
        /// <summary>
        /// This will call the passed callback at the end of the next render frame, if the guid is already registered it will
        /// overwrite that callback with the passed one
        /// </summary>
        /// <param name="guid" type="String">The guid for the current callback</param>
        /// <param name="callback" type="void -> void">The callback to call on the end of the next render frame</param>
        /// <param name="hideOnRenderFrameFromLog" type="Boolean" optional="true">This is true if we should hide this call from the trace logs (this is to stop infinite log scenarios, aka trace window render frame calls)</param>

        var currentCallback = _onEndOfRenderFrameCallbacks[guid];

        if (!currentCallback)
        {
            _onRenderFrameCallbacksCounts++;
        }
        _onRenderFrameCallsCount++;

        _traceOnRenderFrame = _traceOnRenderFrame || !hideOnRenderFrameFromLog;

        _onEndOfRenderFrameCallbacks[guid] = callback;

        _safeStartRenderFrame();
    }

    function _safeStartRenderFrame()
    {
        // Only start a render frame if we dont have one
        if (!_hasPendingRequestFrame)
        {
            _hasPendingRequestFrame = true;
            _lastRequestAnimationFrameTime = (new Date()).getTime();
            safeRequestAnimationFrame(_executeOnRenderFrame);
        }
    }

    function _doOnRenderFrameEveryXFrames(guid, callback, everyXFramesCount, hideOnRenderFrameFromLog)
    {
        /// <summary>
        /// This will call the passed callback every X render frames, if the guid is already registered it will
        /// overwrite that callback with the passed one
        /// </summary>
        /// <param name="guid" type="String">The guid for the current callback</param>
        /// <param name="callback" type="void -> void">The callback to call on render frame</param>
        /// <param name="everyXFramesCount" type="Number">The number of render frames before the callback is called</param>
        /// <param name="hideOnRenderFrameFromLog" type="Boolean" optional="true">This is true if we should hide this call from the trace logs (this is to stop infinite log scenarios, aka trace window render frame calls)</param>

        // Setup the render frame count if one was not set
        if (_renderFramesCount[guid] === undefined)
        {
            _renderFramesCount[guid] = 0;
            _renderFramesDurationSum[guid] = 0;
        }

        function renderFrameCallback(duration)
        {
            _renderFramesDurationSum[guid] += duration;

            if (_renderFramesCount[guid] % everyXFramesCount === 0)
            {
                _renderFramesCount[guid] = 0;
                callback(_renderFramesDurationSum[guid]);
            }
            else
            {
                // This will make sure we get a request if we didnt have one off of the start
                _doOnRenderFrame(guid, renderFrameCallback, hideOnRenderFrameFromLog);
            }

            _renderFramesCount[guid]++;
        }

        _doOnRenderFrame(guid, renderFrameCallback, hideOnRenderFrameFromLog);
    }
})();