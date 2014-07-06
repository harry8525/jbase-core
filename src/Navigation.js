(function ()
{
    /// <summary>Navigation helper class. You must instantiate it to use.</summary>

    var history = /* @static_cast(*) */ window["history"];
    var c_supportsHistoryApi = history && !!history.pushState;

    // Regex used for replacing the wreply param in a login url.
    var c_wreplyRegEx = new RegExp('wreply=[^&]*');

    defineClass(
        "Shared.Navigation",
        function ()
        {
            /// <summary>Wraps navigation flow.</summary>

            // Workaround.
            $Do.when("BeforeUnloadManager.attach", 0, bind(this, this.change));

            this.addElementListener(window, "hashchange", this.change);
            this.addElementListener(window, "popstate", this.change);

            this._updateViewParams();
        },
        {
            __isObservable: true,

            _shouldRebaseHashes: true,
            _viewParams: /* @static_cast(*) */ null,
            _viewParamsString: /* @static_cast(String) */ null,

            getViewParams: /* @bind(Shared.Navigation) */ function ()
            {
                /// <summary>Gets the current view params.</summary>

                return this._viewParams;
            },

            getViewParamsString: /* @bind(Shared.Navigation) */ function ()
            {
                return this._viewParamsString;
            },

            getUrl:  /* @bind(Shared.Navigation) */function ()
            {
                return document.URL;
            },

            push:  /* @bind(Shared.Navigation) */function (viewParams)
            {
                /// <summary>Adds an entry to the navigation stack.</summary>
                /// <param name="viewParams">An object containing the params to use, or a string to parse query params from.</param>

                var params = (typeof (viewParams) == "string") ? viewParams : _viewParamsToString(viewParams);

                if (c_supportsHistoryApi)
                {
                    history.pushState({}, null, "?" + params);
                    this.change();
                }
                else
                {
                    document.location.hash = params;
                }
            },

            pop: /* @bind(Shared.Navigation) */function ()
            {
                /// <summary>Goes back an entry in the navigation stack.</summary>

                if (c_supportsHistoryApi)
                {
                    history.back();
                }
            },

            replace:  /* @bind(Shared.Navigation) */function (viewParams)
            {
                /// <summary>Replaces the current set of view params without adding to the nav stack.</summary>

                var params = (typeof (viewParams) == "string") ? viewParams : _viewParamsToString(viewParams);

                if (c_supportsHistoryApi)
                {
                    history.replaceState({}, null, "/?" + params);
                    this.change();
                }
                else
                {
                    document.location.hash = params;
                }
            },

            change:  /* @bind(Shared.Navigation) */function ()
            {
                /// <summary>Re-evaluates view parameters and fires a change event if they change.</summary>

                var oldParams = this._viewParams;

                if (this._updateViewParams())
                {
                    change(this, this._viewParams);
                }
            },

            navigateTo: /* @bind(Shared.Navigation) */function (url, frameId)
            {
                /// <summary>Navigate to url.</summary>

                $BSI.navigateTo(url, frameId);
            },

            reload: /* @bind(Shared.Navigation) */function ()
            {
                /// <summary>Reloads the current page.</summary>

                window.location.reload();
            },
            
            authenticate: /* @bind(Shared.Navigation) */function ()
            {
                /// <summary>Redirects to auth page.</summary>

                var authUrl = FilesConfig.si.replace(c_wreplyRegEx, "wreply=" + this.getUrl().encodeUrl());

                this.navigateTo(authUrl, "_top");
            },

            _updateViewParams: /* @bind(Shared.Navigation) */ function ()
            {
                /// <summary>Updates the view params.</summary>

                var paramsString = "";
                var hasChanged = false;
                var location = window.document.location;
                var replaceParams;

                if (location.hash.length > 1)
                {
                    paramsString = location.hash.substr(1);
                    if (c_supportsHistoryApi && this._shouldRebaseHashes)
                    {
                        replaceParams = paramsString;
                    }
                }
                else if (location.search.length > 1)
                {
                    paramsString = location.search.substr(1);
                }

                if (paramsString != this._viewParamsString)
                {
                    this._viewParams = {};
                    this._viewParamsString = paramsString || "";
                    hasChanged = true;

                    if (this._viewParamsString)
                    {
                        var paramParts = this._viewParamsString.split("&");

                        for (var i = 0; i < paramParts.length; i++)
                        {
                            var param = paramParts[i].split("=");

                            this._viewParams[param[0]] = decodeURIComponent(param[1]);
                        }
                    }
                }

                // If we have found params to replace

                if (replaceParams)
                {
                    this.replace(replaceParams);
                }

                return hasChanged;
            }
        },
        {},
        Shared.ElementEventing);

    function _viewParamsToString(viewParams)
    {
        /// <summary>Parses a view params object ( { a: "b", c: "d" } ) into a query param string (e.g. "a=b&c=d" ).</summary>

        var paramsString = "";
        var isFirstParam = true;

        for (var param in viewParams)
        {
            if (isFirstParam) {
                isFirstParam = false;
            }
            else {
                paramsString += "&";
            }

            paramsString += param + "=" + (viewParams[param] || "").encodeURIComponent();
        }

        return paramsString;
    }
})();
