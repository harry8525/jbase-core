
(function (jQuery)
{
    /// <summary>
    /// Element eventing mixin. To use:
    ///
    ///   mix(Obj.prototype, Shared.ElementEventing);
    ///
    /// This provides the following methods:
    ///
    ///   addElementListener: adds an element listener
    ///   removeElementListener: removes an element listener
    ///   clearElementListeners: clears all element listeners
    ///
    /// Additionally this will add a dispose method to your implementation which will
    /// call clearElementListeners. (Dispose methods get appended instead of replaced
    /// so you don't have to worry about mix replacing your existing dispose.)
    /// </summary>

    var WorkMonitor = Shared.WorkMonitor;

    defineNamespace(
        "Shared.ElementEventing",
        {
            addElementListener: function (element, eventName, callback, apiId)
            {
                /// <summary>Add an element listener.</summary>
                /// <param name="element" type="HTMLElement">Element to listen to for events.</param>
                /// <param name="eventName" type="String">Name of event.</param>
                /// <param name="callback" type="Function">Callback to execute. (Note callbacks will execute in the context of "this".)</param>
                /// <param name="apiId" type="String" optional="true">The apiId to use to instrument the callback function.</param>

                this.addTargetedListener(element, eventName, null, callback, apiId);
            },

            addTargetedListener: function (element, eventName, targetControlType, callback, apiId)
            {
                /// <summary>Add an element listener.</summary>
                /// <param name="element" type="HTMLElement">Element to listen to for events.</param>
                /// <param name="eventName" type="String">Name of event.</param>
                /// <param name="targetControlType" type="*">Target control type.</param>
                /// <param name="callback" type="Function">Callback to execute. (Note callbacks will execute in the context of "this".)</param>
                /// <param name="apiId" type="String" optional="true">The apiId to use to instrument the callback function.</param>

                var originalCallback = callback;
                var that = this;
                var targetControl = null;

                Debug.assert(callback, "addElementListener was called with a null callback");

                callback = function (ev)
                {
                    /* @disable(0092) */
                    if (!this.isDisposed)
                    {
                        /* @restore(0092) */

                        WorkMonitor.completeWork(WorkMonitor.startWork([WorkMonitor.StandardTags.UserInput, WorkMonitor.StandardTags.UserInput + '_' + eventName.toLowerCase()]));

                        return Qos.instrument(apiId ? Qos.createContext(apiId) : null, function ()
                        {
                            var currentElement = element;
                            var result;

                            if (targetControlType)
                            {
                                currentElement = ev.target;

                                while (currentElement)
                                {
                                    /* @disable(0092) */
                                    if (currentElement.control && currentElement.control.__fullName === targetControlType.prototype.__fullName)
                                    {
                                        targetControl = currentElement.control;
                                        break;
                                    }
                                    /* @restore(0092) */
                                    currentElement = currentElement.parentNode;

                                    if (currentElement.tagName === "BODY")
                                    {
                                        currentElement = null;
                                    }
                                }
                            }

                            if (currentElement)
                            {
                                ev.currentTarget = currentElement;
                                ev.targetControl = targetControl;

                                result = originalCallback.apply(that, arguments);

                                if (result === false && ev.preventDefault)
                                {
                                    ev.preventDefault();
                                    ev.returnValue = false;
                                }
                            }

                            return result;
                        }).apply(this, arguments);
                    }
                };

                var listener = {
                    element: element,
                    eventName: eventName,
                    originalCallback: originalCallback,
                    callback: callback,
                    callbackInstance: that
                };

                _addElementListener(listener);

                // add reference to dispose.
                /* @disable(0092) */
                that.__elementListeners = that.__elementListeners || [];
                that.__elementListeners.push(listener);
                /* @restore(0092) */
            },

            removeElementListener: function (element, eventName, callback)
            {
                /// <summary>Remove an element listener.</summary>
                /// <param name="element" type="HTMLElement">Element to remove listener from.</param>
                /// <param name="eventName" type="String">Name of event.</param>
                /// <param name="callback" type="Function">Callback.</param>

                var that = this;
                var listeners = that.__elementListeners || [];
                var listenerIndex = -1;
                var i = 0;

                for (; i < listeners.length && listenerIndex == -1; i++)
                {
                    var entry = listeners[i];

                    listenerIndex = (entry.element === element &&
                        entry.eventName === eventName &&
                        entry.originalCallback === callback &&
                        entry.callbackInstance === that) ? i : -1;
                }

                if (listenerIndex !== -1)
                {
                    _removeElementListener(listeners[listenerIndex]);
                    listeners.splice(listenerIndex, 1);
                }
            },

            clearElementListeners: function ()
            {
                /// <summary>Remove all element listeners this object has added.</summary>

                var listeners = this.__elementListeners;

                if (listeners && listeners.length)
                {
                    for (var i = 0; i < listeners.length; i++)
                    {
                        _removeElementListener(listeners[i]);
                    }
                }

                delete this.__elementListeners;
            },

            dispose: function ()
            {
                /// <summary>Dispose of listeners.</summary>

                this.clearElementListeners();
            }
        }
    );

    function _addElementListener(listener)
    {
        /// <summary>Add the actual listener.</summary>
        /// <param name="listener">Listener structure.</param>

        if (listener)
        {
            /* @disable(0136) */
            /* @disable(0058) */
            /* @disable(0092) */
            jQuery(listener.element).bind(listener.eventName, listener.callback);
            /* @restore(0092) */
            /* @restore(0058) */
            /* @restore(0136) */
        }
    }

    function _removeElementListener(listener)
    {
        /// <summary>Remove the listener.</summary>
        /// <param name="listener">Listener structure.</param>

        if (listener)
        {
            /* @disable(0136) */
            /* @disable(0058) */
            /* @disable(0092) */
            jQuery(listener.element).unbind(listener.eventName, listener.callback);
            /* @restore(0092) */
            /* @restore(0058) */
            /* @restore(0136) */
        }
    }

/* @disable(0092) */
})(window.originaljQuery || jQuery);
/* @restore(0092) */