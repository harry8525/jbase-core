(function ()
{
    defineNamespace("Debug", {
        /// <summary>Extends the Debug namespace.</summary>

        /// <field type="Boolean">If true will throw on assert failures. Should be set to true for unit testing.</field>
        throwOnAssert: false,

        log: Trace.log,

        assert: function (expr, msg)
        {
            /// <summary>Ensures an expression is true.</summary>
            /// <param name="expr">Expression to evaluate.</param>
            /// <param name="msg">Message to display when the expression evaluates to false.</param>

            if (!expr)
            {
                if (Debug.throwOnAssert)
                {
                    /* @disable(0092) */
                    throw new Debug.AssertError(msg);
                    /* @restore(0092) */
                } else if (_showAssertDialog(msg))
                {
                    debugger;
                }
            }
        },

        fail: function (msg)
        {
            /// <summary>Throws a debug error message.</summary>
            /// <param name="msg">Message to display.</param>

            Debug.assert(false, msg);
        }
    });

    function _showAssertDialog(msg)
    {
        /// <summary>Render a dialog for an assert message.</summary>
        /// <param name="msg">Error to display.</param>
        /// <returns type="Boolean">True is the user wants to debug.</returns>

        var text = (msg || "") + "\n\n";

        return !window.confirm || !confirm("Debug assert failed!\n\n" + text + "\n\nPress \"Cancel\" to debug.");
    }

})();