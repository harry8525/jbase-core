(function ()
{
    window.addListener = function(element, eventName, callback, captureMouse)
    {
        /// <summary>Add an event listener to an element.</summary>
        /// <param name="element" type="HTMLElement">Element to add the listener to.</param>
        /// <param name="eventName" type="String">Name of event.</param>
        /// <param name="callback" type="Function">Callback to call.</param>
        /// <param name="captureMouse" type="Boolean" optional="true">Whether or not the mouse should be captured.</param>

        if (!element.addEventListener)
        {
            /* @disable(0092) */
            element.attachEvent("on" + eventName, callback);
            /* @restore(0092) */
        }
        else
        {
            element.addEventListener(eventName, callback, !!captureMouse);
        }
    };

    window.removeListener = function(element, eventName, callback, captureMouse)
    {
        /// <summary>Remove an event listener to an element.</summary>
        /// <param name="element" type="HTMLElement">Element to remove the listener from.</param>
        /// <param name="eventName" type="String">Name of event.</param>
        /// <param name="callback" type="Function">Callback to remove.</param>
        /// <param name="captureMouse" type="Boolean" optional="true">Whether or not the mouse should be captured.</param>

        if (!element.removeEventListener)
        {
            /* @disable(0092) */
            element.detachEvent("on" + eventName, callback);
            /* @restore(0092) */
        }
        else
        {
            element.removeEventListener(eventName, callback, !!captureMouse);
        }
    };
})();