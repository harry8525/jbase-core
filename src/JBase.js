(function ()
{
    var _instance = 1;

    defineNamespace("JBase", {
        disposables: [],

        dispose: function ()
        {
            /// <summary>Disposes all registered disposables in JBase.disposables array.</summary>

            var count = JBase.disposables.length;

            for (var i = 0; i < count; i++)
            {
                this.disposables[i].dispose();
            }
            this.disposables = [];
        }
    });
})();
