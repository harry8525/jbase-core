define(['EventGroup'], function(EventGroup) {

  describe('EventGroup', function() {
    it('can listen for a single raised event', function() {
      var foo = {
        onBarChanged: function(args) {
          this.argsReceived = args;
        }
      };
      var bar = {};

      foo.events = new EventGroup(foo);
      bar.events = new EventGroup(bar);

      foo.events.on(bar, 'change', foo.onBarChanged);
      bar.events.raise('change', 'argsProvided');

      expect(foo.argsReceived).toEqual('argsProvided');

      // All event handlers will be removed.
      foo.events.dispose();

      bar.events.raise('change', 'newArgs');
      expect(foo.argsReceived).toEqual('argsProvided');
    });

    it('can listen for a bubbled raised event', function() {
      var parent = {
        onAnythingChanged: function(args) {
          this.argsReceived = args;
        }
      };
      var child = {
        parent: parent
      };

      parent.events = new EventGroup(parent);
      child.events = new EventGroup(child);

      parent.events.on(parent, 'change', parent.onAnythingChanged);

      // Not providing true for bubbleEvent should not bubble the event to the parent.
      child.events.raise('change', 'argsProvided');
      expect(parent.argsReceived).toBeUndefined();

      // Passing true should.
      child.events.raise('change', 'argsProvided', true);
      expect(parent.argsReceived).toEqual('argsProvided');
    });

    it('can have 2 event handlers for the same event registered to the same group', function() {
      var control = {
        changeCount: 0,
        onChanged1: function() {
          this.changeCount++;
        },
        onChanged2: function() {
          this.changeCount++;
        }
      };

      control.events = new EventGroup(control);
      control.events.on(control, 'change', control.onChanged1);
      control.events.on(control, 'change', control.onChanged2);

      // Should call onChanged twice.
      control.events.raise('change');
      expect(control.changeCount).toEqual(2);

      // Remove one of them.
      control.events.off(control, 'change', control.onChanged2);
      control.events.raise('change');
      expect(control.changeCount).toEqual(3);

      // Remove the other.
      control.events.dispose();
      control.events.raise('change');
      expect(control.changeCount).toEqual(3);
    });
  });
});