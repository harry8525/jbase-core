(function ()
{
    var c_querySelectorAvailable = !!document.querySelector;
    var c_useInnerText = typeof document.textContent === "undefined";

    // ===========================================
    // Public helper methods.

    mix(window, {
        /// <summary>Dom utilities to be mixed into the window definition.</summary>

        setText: c_useInnerText ? _setText_ie : _setText,

        getText: c_useInnerText ? _getText_ie : _getText,

        setHtml: function (element, html)
        {
            /// <summary>Sets html on an element. (In modern apps, we override this method since setting innerHTML directly is prohibited.)</summary>
            /// <param name="element" type="HTMLElement">Element to innerHTML into.</param>
            /// <param name="html" type="String">Markup to inject.</param>

            element.innerHTML = html;
        },

        getHtml: function (element)
        {
            /// <summary>Gets html on an element.</summary>
            /// <param name="element" type="HTMLElement">Element to innerHTML into.</param>
            /// <returns type="String">Inner html markup.</returns>

            return element.innerHTML;
        },

        getRect: function (element)
        {
            /// <summary>Gets the bounding client rect for the given element.</summary>
            /// <param name="element" type="HTMLElement">Element to measure.</param>
            /// <returns type="*">Client rect for element.</returns>

            var rect = /* @static_cast(*) */ null;
            
            if (element)
            {
                try
                {
                    /* @disable(0092) */
                    rect = element.getBoundingClientRect();
                    /* @restore(0092) */
                }
                catch (e)
                {
                    rect = { left: 0, top: 0, width: 0, height: 0 };
                }

                if (rect.width === undefined)
                {
                    // IE 8 and below provide right/bottom but not width/height.
                    rect = {
                        left: rect.left,
                        top: rect.top,
                        width: rect.right - rect.left,
                        height: rect.bottom - rect.top
                    };
                }
            }

            return rect;
        },

        byClass: c_querySelectorAvailable ? _byClassQuerySelector : _byClassManualSearch,

        byId: function (id, relativeElement)
        {
            /// <summary>Shortcut to document.getElementById.</summary>
            /// <param name="id" type="String">Id of element.</param>
            /// <param name="relativeElement" type="HTMLElement" optional="true">Relative element.</param>
            /// <returns type="HTMLElement">Match or null.</returns>

            relativeElement = (/* @static_cast(Boolean) */relativeElement && /* @static_cast(Boolean) */relativeElement.getElementById) ? relativeElement : document;

            return relativeElement.getElementById(id);
        },

        ce: function (elementType, elementHtml)
        {
            /// <summary>Shortcut for creating an element.</summary>
            /// <param name="elementType" type="String">Name of element tag to create.</param>
            /// <param name="elementHtml" type="String" optional="true">Content to inject into element.</param>
            /// <returns type="HTMLElement">Created element.</returns>

            var element = document.createElement(elementType);

            elementHtml && setHtml(element, elementHtml);

            return element;
        },

        isInputElement: function (element)
        {
            /// <summary>Tests an element if it's a input element.</summary>
            /// <param name="element" type="HTMLElement">Element to test.</param>
            /// <returns type="Boolean">True if the element is a input element.</returns>

            var tagName = element.tagName.toLowerCase();
            var typeAttribute = element.getAttribute("type");

            return tagName === "textarea" || tagName === "select" || (tagName === "input" && typeAttribute == "text" || typeAttribute == "password");
        },

        generateAttributesString: /* @varargs */function ()
        {
            /// <summary>Given incoming arguments list of name/value pairs, build an element attribute string.</summary>
            /// <returns type="String">Attribute string, e.g. 'href="blah"'</returns>

            var argLength = arguments.length;
            var attributes = "";

            for (var i = 1; i < argLength; i += 2)
            {
                var name = arguments[i - 1];
                var value = arguments[i];

                switch (name)
                {
                    case "aria-expanded":
                    case "aria-selected":
                    case "aria-checked":
                    case "aria-pressed":
                        value = (typeof value == "string") ? value : String(!!value);
                        break;

                    case "checked":
                    case "disabled":
                        if (value)
                        {
                            value = name;
                        }
                        else
                        {
                            name = null;
                        }
                        break;
                }

                name && (attributes += name + '="' + htmlAttributeEncode(value) + '\" ');
            }

            return attributes ? ' ' + attributes : '';
        },

        generateClassAttribute: /* @varargs */function ()
        {
            /// <summary>Given incoming arguments list of name/value pairs, build an element class string.</summary>

            var classAttribute = "";
            var argLength = arguments.length;

            for (var i = 1; i < argLength; i += 2)
            {
                var name = arguments[i - 1];
                var value = arguments[i];

                value && (classAttribute += " " + name);
            }

            return classAttribute;
        },

        generateStyleAttribute: /* @varargs */function ()
        {
            /// <summary>Generates a style attribute string given incoming arguments of (name, value, name, value) items.</summary>
            /// <param name="arguments" type="Array">Arguments will be parsed to build the style attribute.</param>
            /// <returns type="String">Style attribute string.</returns>

            var argLength = arguments.length;
            var style = "";

            for (var i = 1; i < argLength; i += 2)
            {
                var styleItem = processStyleAttribute(arguments[i - 1], arguments[i]);

                (styleItem) && (style += styleItem);
            }

            return style;
        },

        processStyleAttribute: function (name, value)
        {
            /// <summary>Given a name/value pair, return "name:value;" string to be appended into a style attribute.</summary>

            var style = "";

            switch (name)
            {
                case "display":

                    if (value && value != "false")
                    {
                        value = "block";
                    }
                    else
                    {
                        value = "none";
                    }

                    break;

                case "display.inline":

                    if (value && value != "false")
                    {
                        value = "inline";
                    }
                    else
                    {
                        value = "none";
                    }

                    // Clear the default value and set our own
                    name = null;
                    style = 'display:' + value + ';';

                    break;

                case "display.inlineblock":

                    if (value && value != "false")
                    {
                        value = "inline-block";
                    }
                    else
                    {
                        value = "none";
                    }

                    // Clear the default value and set our own
                    name = null;
                    style = 'display:' + value + ';';

                    break;

                case "visibility":
                    if (value === true)
                    {
                        value = "visible";
                    }
                    else if (value === false)
                    {
                        value = "hidden";
                    }
                    break;

                case "opacity":
                    style = "filter:alpha(opacity=" + Math.round(value * 100) + ");";
                    break;

                case "width":
                case "height":
                case "left":
                case "right":
                case "top":
                case "bottom":
                    (value === undefined) && (name = null);
                    break;
                case "width.px":
                case "height.px":
                case "left.px":
                case "right.px":
                case "top.px":
                case "bottom.px":
                    name = name.replace('.px', '');
                    (value === undefined) && (name = null);
                    value += "px";
                    break;
            }

            name && (style += name + ":" + value + ";");

            return style;
        },

        closestWithClass: _closestWithClass,
        hasClass: _hasClass,
        toggleClass: _toggleClass,
        htmlEncode: _htmlEncode,
        htmlAttributeEncode: _htmlAttributeEncode
    });

    // End: Public helper methods.
    // ===========================================

    function _closestWithClass(element, className)
    {
        /// <summary>This test if the element has the class name.</summary>
        /// <param name="element" type="HTMLElement">Element with class.</param>
        /// <param name="className" type="String">Classname to toggle.</param>
        /// <returns type="HTMLElement">This returns the closest element with the class name</returns>

        while (/* @static_cast(Boolean) */element && element != /* @static_cast(HTMLElement) */window)
        {
            if (_hasClass(element, className))
            {
                break;
            }

            element = element.parentNode;
        }

        return element;
    }

    function _generateClassNames(element)
    {
        /// <summary>Generates the class name look up hash.</summary>
        /// <param name="element" type="HTMLElement">Element with class.</param>

        // create our cache
        /* @disable(0092) */
        if (!element._classNames)
        {
            element._classNames = {};
            var classes = (element.className && element.className.split(' ')) || [];

            for (var x = 0; x < classes.length; x++)
            {
                element._classNames[classes[x]] = true;
            }
        }
    }

    function _hasClass(element, className)
    {
        /// <summary>This test if the element has the class name.</summary>
        /// <param name="element" type="HTMLElement">Element with class.</param>
        /// <param name="className" type="String">Classname to toggle.</param>
        /// <returns type="Boolean">This returns true if the class name is on the element</returns>

        var returnValue = false;

        if (element)
        {
            _generateClassNames(element);

            // See if its stored in our hash
            returnValue = element._classNames[className] != undefined;
        }

        return returnValue;
    }

    function _toggleClass(element, className, shouldBeEnabled, isSynchronous)
    {
        /// <summary>Toggles a class on/off.</summary>
        /// <param name="element" type="HTMLElement">Element with class.</param>
        /// <param name="className" type="String">Classname to toggle.</param>
        /// <param name="shouldBeEnabled" type="Boolean" optional="true">Enable state of the class. If not provided, will toggle it.</param>
        /// <param name="isSynchronous" type="Boolean" optional="true">Change state now or on render frame (default).</param>

        if (element)
        {
            // make sure we have our cache
            _generateClassNames(element);

            var classNames = element._classNames;

            isEnabled = classNames[className];
            (shouldBeEnabled === undefined) && (shouldBeEnabled = !isEnabled);

            var changed = false;
            if (!isEnabled && shouldBeEnabled)
            {
                classNames[className] = true;
                changed = true;
            }
            else if (isEnabled && !shouldBeEnabled)
            {
                delete classNames[className];
                changed = true;
            }

            // only update if changed so we dont force a redraw
            if (changed)
            {
                var newClasses = [];

                for (var i in classNames)
                {
                    newClasses.push(i);
                }

                element._newClassName = newClasses.join(" ");

                if (isSynchronous)
                {
                    element.className = element._newClassName;
                }
                else
                {
                    /* @disable(0092) */
                    // Toggle the class in a render frame
                    doOnRenderFrame('_renderFrameToggleClass_' + getId(element), function ()
                    {
                        /* @restore(0092) */
                        element.className = element._newClassName;
                    });
                }
            }
        }
    }

    function _setText(element, text)
    {
        /// <summary>Sets the text value of an element via textContent.</summary>
        /// <param name="element" type="HTMLElement">Element to set.</param>
        /// <param name="text" type="String">Text to set.</param>

        element.textContent = text;
    }

    function _setText_ie(element, text)
    {
        /// <summary>Sets the text value of an element via innerText.</summary>
        /// <param name="element" type="HTMLElement">Element to set.</param>
        /// <param name="text" type="String">Text to set.</param>

        element.innerText = text;
    }

    function _getText(element)
    {
        /// <summary>Gets the text value of an element via textContent.</summary>
        /// <param name="element" type="HTMLElement">Element to get text from.</param>
        /// <returns type="String">Text of element.</returns>

        return element.textContent;
    }

    function _getText_ie(element)
    {
        /// <summary>Gets the text value of an element via innerText.</summary>
        /// <param name="element" type="HTMLElement">Element to get text from.</param>
        /// <returns type="String">Text of element.</returns>

        return element.innerText;
    }

    function _htmlAttributeEncode(str)
    {
        /// <summary>Encodes a string to be safe to use as an attribute value in an html string.</summary>

        /* @disable(0092) */
        return str ? String(str).encodeHtmlAttribute() : '';
        /* @restore(0092) */
    }

    function _htmlEncode(str)
    {
        /// <summary>Encodes a string to be safe to use as an html element text value.</summary>
        /// <param name="str" type="String">String to encode.</param>
        /// <returns type="String">Encoded result.</returns>

        /* @disable(0092) */
        return str ? String(str).encodeHtml() : '';
        /* @restore(0092) */
    }

    function _byClassQuerySelector(className, element)
    {
        /// <summary>Searches subchildren of an element for a child element that has the given class name.</summary>
        /// <param name="className" type="String">Class name to search for.</param>
        /// <param name="element" type="HTMLElement">Element to search.</param>
        /// <returns type="HTMLElement">Element if found, or null.</returns>

        element = element || document;

        return /* @static_cast(HTMLElement) */element.querySelector("." + className);
    }

    function _byClassManualSearch(className, element)
    {
        /// <summary>Searches subchildren of an element for a child element that has the given class name. NOTE: This can be dangerously slow!</summary>
        /// <param name="className" type="String">Class name to search for.</param>
        /// <param name="element" type="HTMLElement">Element to search.</param>
        /// <returns type="HTMLElement">Element if found, or null.</returns>

        element = element || document.body;

        var current;
        var classCheck = new RegExp("(^|\\s)" + className + "(\\s|$)");
        var matchedElement = /* @static_cast(HTMLElement) */null;
        var children = element.childNodes;
        var i;

        for (i = 0; i < children.length; i++)
        {
            current = children[i];
            if (classCheck.test(current.className))
            {
                matchedElement = current;
                break;
            }
        }

        for (i = 0; i < children.length; i++)
        {
            var result = _byClassManualSearch(children[i], className);

            if (result)
            {
                matchedElement = result;
                break;
            }
        }

        return matchedElement;
    }
})();