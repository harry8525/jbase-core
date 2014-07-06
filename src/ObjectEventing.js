(function ()
{
    /// <summary>
    /// Simple object eventing mixin. To use:
    ///
    ///   mix(Obj.prototype, Shared.ObjectEventing);
    ///
    /// This provides the following methods:
    ///
    ///   addObjectListener: adds an object listener
    ///   removeObjectListener: removes an object listener
    ///   clearObjectListeners: clears all object listeners
    ///   addChangeListener: add a standard change listener
    ///   removeChangeListener: remove a change listener
    ///
    /// This will add a dispose method to your implementation which will
    /// call clearObjectListeners. (Dispose methods get appended instead of replace
    /// so you don't have to worry about mix replacing your existing dispose.)
    ///
    /// There are also some global methods added to window:
    ///
    /// raiseEvent(object, eventName, args) - raise an event
    /// change(object) - raise a change event
    /// </summary>

    var c_changedEvent = "change";

    defineNamespace(
        "Shared.ObjectEventing",
        {
            addObjectListener: function (object, eventName, callback, apiId)
            {
                /// <summary>Add an object listener.</summary>
                /// <param name="object">Object to listen to.</param>
                /// <param name="eventName" type="String">Event name.</param>
                /// <param name="callback" type="Function">Callback to call.</param>
                /// <param name="apiId" type="String" optional="true">Optional api id to use for qos logging.</param>

                var _this = this;
                var id;
                var list;
                var listener = {
                    object: object,
                    eventName: eventName,
                    parent: _this,
                    callback: callback,
                    apiId: apiId
                };

                // add reference to dispose.
                /* @disable(0092) */
                id = getId(object);
                _this.__objectListeners = _this.__objectListeners || {};
                _this.__objectListeners[eventName] = _this.__objectListeners[eventName] || {};
                list = _this.__objectListeners[eventName][id] = _this.__objectListeners[eventName][id] || [];
                list.push(listener);

                id = getId(_this);
                object.__eventCallbacks = object.__eventCallbacks || {};
                object.__eventCallbacks[eventName] = object.__eventCallbacks[eventName] || {};
                list = object.__eventCallbacks[eventName][id] = object.__eventCallbacks[eventName][id] || [];
                list.push(listener);
                /* @restore(0092) */
            },

            removeObjectListener: function (object, eventName)
            {
                /// <summary>Remove an object listener.</summary>
                /// <param name="object">Object to listen to.</param>
                /// <param name="eventName" type="String">Event name.</param>

                var _this = this;
                var listeners = _this.__objectListeners;
                var callbacks = object.__eventCallbacks;

                if (listeners)
                {
                    var eventListeners = listeners[eventName];

                    if (eventListeners)
                    {
                        delete eventListeners[getId(object)];
                    }
                }

                if (callbacks)
                {
                    var eventCallbacks = callbacks[eventName];

                    if (eventCallbacks)
                    {
                        delete eventCallbacks[getId(_this)];
                    }
                }
            },

            addChangeListener: function (object, callback, apiId)
            {
                /// <summary>Add a change listener.</summary>
                /// <param name="object">Object to listen to.</param>
                /// <param name="callback" type="Function">Callback to call.</param>
                /// <param name="apiId" type="String" optional="true">Optional api id to use for qos logging.</param>

                this.addObjectListener(object, c_changedEvent, callback, apiId);
            },

            removeChangeListener: function (object)
            {
                /// <summary>Remove a change listener.</summary>
                /// <param name="object">Object to listen to.</param>

                this.removeObjectListener(object, c_changedEvent);
            },

            clearObjectListeners: function ()
            {
                /// <summary>Clear all object listeners.</summary>

                var listeners = this.__objectListeners;
                var thisId = getId(this);

                if (listeners)
                {
                    for (var eventName in listeners)
                    {
                        var eventListeners = listeners[eventName];

                        for (var objectName in eventListeners)
                        {
                            var listenerList = eventListeners[objectName];

                            for (var i = 0; i < listenerList.length; i++)
                            {
                                delete listenerList[i].object.__eventCallbacks[eventName][thisId];
                            }
                        }
                    }
                }

                delete this.__objectListeners;
            },

            dispose: function ()
            {
                ///  <summary>Dispose the event listeners.</summary>

                this.clearObjectListeners();
            }
        }
    );

    mix(window, {
        /// <summary>Eventing methods for binding/unbinding callbacks to simple objects, as well as managing change events.</summary>

        raiseEvent: function (object, eventName, eventArgs, shouldBubble)
        {
            /// <summary>Raises a given event.</summary>
            /// <param name="object" type="Object">Object to raise event for.</param>
            /// <param name="eventName" type="String">Name of event to raise.</param>
            /// <param name="eventArgs" type="Object" optional="true">Object to pass into callbacks.</param>
            /// <param name="shouldBubble" type="Boolean" optional="true">
            /// If true and object has a parent property, will try to fire the event recursively up the tree until no parent
            /// is available or the callback returns false.
            /// </param>

            /* @disable(0092) */
            var callbacks = (object.__eventCallbacks && object.__eventCallbacks[eventName]) ? object.__eventCallbacks[eventName] : null;
            var /* @dynamic */qos = window['Qos'];
            /* @restore(0092) */

            if (callbacks)
            {
                for (var objectName in callbacks)
                {
                    var callbackList = callbacks[objectName];

                    for (var i = 0; i < callbackList.length; i++)
                    {
                        var callbackEntry = callbackList[i];
                        var callback = callbackEntry.callback;

                        if (qos && callbackEntry.apiId)
                        {
                            // Ensure the instrumented callback is created.
                            callback = qos.instrument(qos.createContext(callbackEntry.apiId), callback);
                        }

                        if (callback.call(callbackEntry.parent || window, eventArgs) === false)
                        {
                            // Prevent bubbling if the callback returns false.
                            return false;
                        }
                    }
                }
            }

            /* @disable(0092) */
            if (shouldBubble && object.parent)
            {
                raiseEvent(object.parent, eventName, eventArgs, shouldBubble);
            }
            /* @restore(0092) */

            return true;
        },

        hasObservers: function (object, eventName)
        {
            /// <summary>Determines if an object has observers for the given event. Useful for optimizing flows that should only execute if observers care.</summary>
            /// <returns type="Boolean">True if it does.</returns>

            var callbacks = (object && object.__eventCallbacks) ? object.__eventCallbacks[eventName] : null;
            var hasObservers = false;

            for (var id in callbacks)
            {
                hasObservers = true;
                break;
            }

            return hasObservers;
        },

        raiseEventWithProcessing: function (object, eventName, processingFunction, eventArgs, shouldBubble)
        {
            /// <summary>Raises a given event with processing.</summary>
            /// <param name="object" type="Object">Object to raise event for.</param>
            /// <param name="eventName" type="String">Name of event to raise.</param>
            /// <param name="processingFunction" type="Object, Object -> Boolean">The function that will process each call back result.</param>
            /// <param name="eventArgs" type="Object">Object to pass into callbacks.</param>
            /// <param name="shouldBubble" type="Boolean" optional="true">
            ///     If true and object has a parent property, will try to fire the event recursively up the tree until no parent
            ///     is available or the callback returns false.
            /// </param>

            /* @disable(0092) */
            var callbacks = (object.__eventCallbacks && object.__eventCallbacks[eventName]) ? object.__eventCallbacks[eventName] : null;
            /* @restore(0092) */

            if (callbacks)
            {
                for (var objectName in callbacks)
                {
                    var callbackList = callbacks[objectName];

                    for (var i = 0; i < callbackList.length; i++)
                    {
                        var callbackEntry = callbackList[i];

                        var returnValue = callbackEntry.callback.call(callbackEntry.parent || window, eventArgs);

                        // if the processing function returns false we should stop
                        if (processingFunction(returnValue, eventArgs) === false)
                        {
                            return;
                        }
                    }
                }
            }

            /* @disable(0092) */
            if (shouldBubble && object.parent)
            {
                raiseEventWithProcessing(object.parent, eventName, processingFunction, eventArgs, shouldBubble);
            }
            /* @restore(0092) */
        },

        change: function (object, eventArgs, shouldBubble)
        {
            /// <summary>Raises a standard change event on a given object.</summary>
            /// <param name="object" type="Object">Object to raise event for.</param>
            /// <param name="eventArgs" type="Object" optional="true">Object to pass into callbacks.</param>
            /// <param name="shouldBubble" type="Boolean" optional="true">
            /// If true and object has a parent property, will try to fire the event recursively up the tree until no parent
            /// is available or the callback returns false.
            /// </param>

            raiseEvent(object, c_changedEvent, eventArgs, shouldBubble);
        }
    });

})();