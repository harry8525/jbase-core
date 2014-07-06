(function ()
{
    var c_maxStyleContentSize = 4000;

    var /* @type(Boolean) */ _useCssText;
    // Variable to cache styles loaded to early, so that we can load them when the window is loaded.
    var /* @type(HTMLElement) */ _head;
    var /* @type(HTMLElement) */ _lastStyleElement;
    var _lastStyleContent = "";
    var _styleText = "";

    function shouldUseCssText()
    {
        /// <summary>
        /// Checks to see if styleSheet exists as a property off of a style element.
        /// This will determine if style registration should be done via cssText (<= IE9) or not
        /// </summary>

        if (_useCssText === undefined)
        {
            var emptyStyle = document.createElement("style");
            emptyStyle.type = "text/css";

            _useCssText = !!emptyStyle["styleSheet"];
        }

        return _useCssText;
    }

    function _registerStyle(styleText)
    {
        /// <summary>Registers a set of style text. If it is registered too early, we will register it when the window.load event is fired.</summary>
        /// <param name="styleText" type="String">Style to register.</param>

        _head = _head || document.getElementsByTagName('head')[0];
        
        if (_head)
        {
            var styleElement = document.createElement("style");

            styleElement.type = "text/css";
            styleElement.appendChild(document.createTextNode(styleText));
            _head.appendChild(styleElement);
        }
        else
        {
            _styleText += styleText;
        }
    }

    function _registerStyleIE(styleText)
    {
        /// <summary>Registers a set of style text, for IE 9 and below, which has a ~30 style element limit so we need to register slightly differently.</summary>
        /// <param name="styleText" type="String">Style to register.</param>

        _head = _head || document.getElementsByTagName('head')[0];

        if (_head)
        {
            if (!_lastStyleElement || (_lastStyleContent.length + styleText.length) > c_maxStyleContentSize)
            {
                _lastStyleContent = "";
                _lastStyleElement = document.createElement("style");
                _lastStyleElement.type = "text/css";
                _head.appendChild(_lastStyleElement);
            }

            _lastStyleContent += styleText;
            _lastStyleElement["styleSheet"].cssText = _lastStyleContent;
        }
        else
        {
            _styleText += styleText;
        }
    }

    // set register style
    window.registerStyle = shouldUseCssText() ? _registerStyleIE : _registerStyle;

    // Add an on load listener
    addListener(window, "load", function ()
    {
        /// <summary>We will asynchronously track when we can dynamically add styles since in some browsers we can't add them immediately.</summary>

        if (/* @static_cast(Boolean) */_styleText && /* @static_cast(Boolean) */document.body)
        {
            var styles = _styleText;

            // Clear the style text before attempting to register the style.
            _styleText = "";

            registerStyle(styles);
        }
    });
})();