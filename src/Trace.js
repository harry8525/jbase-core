(function ()
{
    // When we reach max traces, we truncate to min.
    var c_minTraces = 80;
    var c_maxTraces = 200;
    var c_maxFrames = 50;
    var c_blankString = "";
    var c_defaultCategory = "default";

    // Member variables.
    var _traceCounter = 0;
    var _categories = {};
    var _categoriesArray = [];

    var _traceContext = [];
    var _allTraces = [];
    var _startFrameTime;
    var _frameCount = 0;
    var _frames = [];

    var _frameTotalTime = 0;

    _traceContext.push({ children: _allTraces });

    _frames.__isObservable = true;

    var _startTime = -1;

    // Create the Trace namespace.
    defineNamespace(
        "Trace",
        {
            /// <summary>Trace namespace for tracing messages.</summary>

            events: _allTraces,
            frames: _frames,
            averageFrameTime: 0,
            categories: _categoriesArray,

            register: function (category, details)
            {
                /// <summary>Registers a trace category with a given defaults property bag.</summary>
                /// <param name="category" type="String">Category name.</param>
                /// <param name="details" type="Object" optional="true">Category details object to be mixed into the category definition.</param>

                if (!_categories[category])
                {
                    var categoryItem = {
                        name: category,
                        isEnabled: true,
                        isVisible: true,
                        __isObservable: true // Makes the value observable
                    };

                    details && mix(categoryItem, details);

                    _categories[category] = categoryItem;
                    _categoriesArray.push(categoryItem);

                    _fireChange(_categoriesArray);
                }
            },

            startFrame: function ()
            {
                /// <summary>
                /// This starts the frame timer
                /// </summary>

                _startFrameTime = (new Date()).getTime();
            },

            endFrame: function ()
            {
                /// <summary>
                /// Ends the frame timer and adds the frame to the queue
                /// </summary>

                if (_startFrameTime)
                {
                    var frameData = { key: _frameCount++, time: (new Date()).getTime() - _startFrameTime };

                    _frames.push(frameData);

                    _frameTotalTime += frameData.time;

                    if (_frames.length > c_maxFrames)
                    {
                        _frameTotalTime -= _frames[0].time;

                        _frames.splice(0, 1);
                    }

                    Trace.averageFrameTime = _frameTotalTime / _frames.length;

                    _fireChange(_frames);
                }
            },

            log: function (message, category, options)
            {
                /// <summary>Logs a given trace message.</summary>
                /// <param name="message" type="String">Message to display.</param>
                /// <param name="category" type="String" optional="true">Category name.</param>
                /// <param name="options" type="Object" optional="true">Bag of optional parameters.</param>
                /// <returns>Trace message structure (which you can use logTo to trace under.)</returns>

                return Trace.logTo(_traceContext[0], message, category, options);
            },

            logTo: function (parentTrace, message, category, options)
            {
                /// <summary>Logs a given trace message under another trace.</summary>
                /// <param name="parentTrace">Parent trace to log a trace message under.</param>
                /// <param name="message" type="String">Message to display.</param>
                /// <param name="category" type="String" optional="true">Category name.</param>
                /// <param name="options" type="Object" optional="true">Bag of optional parameters.</param>
                /// <returns>Trace message structure.</returns>

                var trace = {
                    children: []
                };

                // add category if necessary.
                category = category || c_defaultCategory;
                Trace.register(category);
                var isCategoryEnabled = _categories[category].isEnabled;

                if (isCategoryEnabled)
                {
                    var startTime = new Date();

                    (_startTime == -1) && /* @static_cast(Boolean) */(_startTime = /* @static_cast(Number) */startTime);

                    if (parentTrace)
                    {
                        parentTrace.duration = startTime - parentTrace.startTime;
                    }

                    trace = {
                        key: _traceCounter++,
                        category: category,
                        message: message || c_blankString,
                        timeStamp: startTime - _startTime,
                        startTime: startTime,
                        children: [],
                        __isObservable: true
                    };

                    trace.children.__isObservable = true;

                    /* @disable(0092) */
                    var dataBundle = options && options.dataBundle;
                    if (dataBundle)
                    {
                        trace.dataBundle = options.shouldSynchronizeSerialization ?
                            Object.toJSON(dataBundle, undefined, 2, true, true) :
                            dataBundle;
                    }
                    /* @restore(0092) */

                    if (parentTrace)
                    {
                        parentTrace.children.unshift(trace);
                        _fireChange(parentTrace);
                        _notifyUpdates(parentTrace.children);
                    }
                }

                return trace;
            },

            startContext: function (message, category)
            {
                /// <summary>Starts a new global trace context, under which all further traces will be logged in a heirarchy. Call endContext when complete.</summary>
                /// <param name="message" type="String">Message to display.</param>
                /// <param name="category" type="String" optional="true">Category name.</param>
                /// <returns>Trace message structure.</returns>

                var trace = Trace.log(message, category);

                _traceContext.unshift(trace);

                return trace;
            },

            endContext: function ()
            {
                /// <summary>Pops the current context off the stack.</summary>

                var currentTime = new Date().getTime();
                var trace = _traceContext.shift();

                /* @disable(0092) */
                trace.duration = currentTime - trace.startTime;
                /* @restore(0092) */

                _fireChange(trace);
            },

            clearEvents: function ()
            {
                /// <summary>Clears traces.</summary>

                /* @disable(0092) */
                this.events.length = 0;
                /* @restore(0092) */

                _fireChange(this.events);

                _startTime = -1;
            }
        });

    function _fireChange(object)
    {
        /// <summary>Fires the change event on the object.</summary>
        /// <param name="object" type="Object">The object to fire the change event on.</param>

        // raise event.
        /* @disable(0092) */
        window.change && window.change(object);
        /* @restore(0092) */
    }

    function _notifyUpdates(collection)
    {
        /// <summary>Notify traces.Logs a given trace message.</summary>
        /// <param name="collection" type="Array">Array to change.</param>

        // truncate the log if necessary after the change event gives the listener an opportunity to not miss any events.
        (collection.length > c_maxTraces) && (/* @static_cast(Boolean) */collection.splice(c_minTraces, collection.length - c_minTraces));

        // raise event.
        _fireChange(collection);
    }

})();