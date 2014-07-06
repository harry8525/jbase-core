(function ()
{
    /// <summary>
    /// A Resourcable is something that can provide or consume resources. (E.g. a Control or DataContext)
    /// 
    /// Usage:
    ///
    /// 1. Mix Resourcable into a class definition, for example BaseControl.
    /// 2. From instances of said class, you expose resouces like: this.exposeResources({ foo: new Foo(), bar: new Bar() });
    /// 3. From within the class or any children (that have a parent property pointing to the parent), you can access the resource like this.getResource("foo").
    ///
    /// This provides a generic way to expose something, access it below in a node heirarchy, or override it within the heirarchy layering.
    /// Example: an "App" control can expose a default "SelectionManager" resource, but a popover which uses its own "selectionManager" can expose a new one and
    /// have sub controls resolve that instead.
    /// </summary>

    defineNamespace(
    "Shared.Resourcable",
    {
        ///#DEBUG
        parent: /* @static_cast(*) */ null,
        __resources: /* @static_cast(Object) */ null,
        ///#ENDDEBUG

        exposeResources: function (resources)
        {
            /// <summary>Exposes a collection of named resources at the current object.</summary>
            /// <param name="resources" type="Object">Resources to expose.</param>

            this.__resources = this.__resources || {};
            mix(this.__resources, resources);
        },

        getResource: function (resourceName)
        {
            /// <summary>Gets a given resource from "this" or an ancestor (referenced via the "parent" member.)</summary>
            /// <param name="resourceName" type="String">Name of resource to resolve.</param>

            var resource = _findResource(this, resourceName);

            Debug.assert(resource, "The \"" + this["__className"] + "\" class could not find the resource \"" + resourceName + "\" exposed from itself or any of its ancestors.");

            return resource;
        }
    });

    function _findResource(obj, resourceName)
    {
        /// <summary>Recurse up the parent tree, ensuring that we return the reference and cache it under all ancestors for fast lookup.</summary>

        obj.__resources = obj.__resources || {};

        var resource = obj.__resources[resourceName];

        if (!resource && obj.parent)
        {
            resource = obj.__resources[resourceName] = _findResource(obj.parent, resourceName);
        }

        return resource;
    }
})();