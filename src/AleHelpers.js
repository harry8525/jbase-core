/// Copyright (C) Microsoft Corporation. All rights reserved.

(function ()
{
    var c_alePrefix = "live.shared.skydrive.";
    var c_marketInfoPrefix = "live.shared.marketinfo.";

    function safeGetString(id)
    {
        /// <summary>
        /// The safe get string method
        /// </summary>
        /// <param name="id" type="String">The id to get the string from</param>

        /* @disable(0092) */
        if (window.GetString)
        {
            /* @restore(0092) */
            /* @disable(0058) */
            return GetString(id);
            /* @restore(0058) */
        }
        else
        {
            return '';
        }
    }

    wLive.Core.AleHelpers = {
        getString: function (id)
        {
            return safeGetString(c_alePrefix + "shared." + id);
        },
        getPCString: function (id)
        {
            return safeGetString(c_alePrefix + "pc." + id);
        },
        getSkyString: function (id)
        {
            return safeGetString(c_alePrefix + id);
        },
        getMobileString: function (id)
        {
            return safeGetString(c_alePrefix + "mobile." + id);
        },
        getMarketInfoValue: function (id)
        {
            return safeGetString(c_marketInfoPrefix + id);
        }
    };
})();