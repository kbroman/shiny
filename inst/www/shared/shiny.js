(function() {

  var $ = jQuery;

  var ShinyApp = window.ShinyApp = function() {
    this.$socket = null;
    this.$bindings = {};
    this.$values = {};
    this.$pendingMessages = [];
  };

  (function() {

    this.connect = function(initialInput) {
      if (this.$socket)
        throw "Connect was already called on this application object";

      this.$socket = this.createSocket();
      this.$initialInput = initialInput;
    };

    this.createSocket = function () {
      var self = this;

      var socket = new WebSocket('ws://' + window.location.host, 'shiny');
      socket.onopen = function() {
        socket.send(JSON.stringify({
          method: 'init',
          data: self.$initialInput
        }))

        while (self.$pendingMessages.length) {
          var msg = self.$pendingMessages.shift();
          socket.send(msg);
        }
      };
      socket.onmessage = function(e) {
        self.dispatchMessage(e.data);
      };
      socket.onclose = function() {
        $(document.body).addClass('disconnected');
      };
      return socket;
    };

    this.sendInput = function(values) {
      var msg = JSON.stringify({
        method: 'update',
        data: values
      });

      if (this.$socket.readyState == WebSocket.CONNECTING) {
        this.$pendingMessages.push(msg);
      }
      else {
        this.$socket.send(msg);
      }
    };

    this.receiveOutput = function(name, value) {
      var oldValue = this.$values[name];
      this.$values[name] = value;
      if (oldValue === value)
        return;

      var binding = this.$bindings[name];
      if (binding) {
        binding.onValueChange(value);
      }

      return value;
    };

    this.dispatchMessage = function(msg) {
      var msgObj = JSON.parse(msg);
      for (key in msgObj) {
        this.receiveOutput(key, msgObj[key]);
      }
    };

    this.bind = function(id, binding) {
      if (!id)
        throw "Can't bind an element with no ID";
      if (this.$bindings[id])
        throw "Duplicate binding for ID " + id;
      this.$bindings[id] = binding;
      return binding;
    };
  }).call(ShinyApp.prototype);


  var LiveTextBinding = function(el) {
    this.el = el;
  };
  (function() {
    this.onValueChange = function(data) {
      $(this.el).text(data);
    };
  }).call(LiveTextBinding.prototype);

  var LivePlotBinding = function(el) {
    this.el = el;
  };
  (function() {
    this.onValueChange = function(data) {
      if (this.el.tagName == 'IMG') {
        this.el.src = data ? data : '';
      }
      else {
        $(this.el).empty();
        if (!data)
          return;
        var img = document.createElement('img');
        img.src = data;
        this.el.appendChild(img);
      }
    };
  }).call(LivePlotBinding.prototype);

  var LiveHTMLBinding = function(el) {
    this.el = el;
  };
  (function() {
    this.onValueChange = function(data) {
      $(this.el).html(data)
    };
  }).call(LiveHTMLBinding.prototype);
  
  $(function() {

    var shinyapp = window.shinyapp = new ShinyApp();

    $('.live-text').each(function() {
      shinyapp.bind(this.id, new LiveTextBinding(this));
    });
    $('.live-plot').each(function() {
      shinyapp.bind(this.id, new LivePlotBinding(this));
    });
    $('.live-html').each(function() {
      shinyapp.bind(this.id, new LiveHTMLBinding(this));
    });



    // Input bindings

    // TODO: This all needs to be refactored to be more modular, extensible

    function elementToValue(el) {
      if (el.type == 'checkbox')
        return el.checked ? true : false;
      else
        return $(el).val();
    }

    // Holds pending changes for deferred submit
    var pendingData = {};

    var deferredSubmit = false;
    $('input[type="submit"], button[type="submit"]').each(function() {
      deferredSubmit = true;
      $(this).click(function(event) {
        event.preventDefault();
        shinyapp.sendInput(pendingData);
      });
    });

    function onInputChange(name, value) {
      if (deferredSubmit)
        pendingData[name] = value;
      else {
        var data = {};
        data[name] = value;
        shinyapp.sendInput(data);
      }
    }

    var initialValues = {};
    $('input[type!="submit"], select').each(function() {
      var input = this;
      var name = input['data-input-id'] || input.name || input.id;
      var value = elementToValue(input);
      // TODO: validate name is non-blank, and no duplicates
      // TODO: If submit button is present, don't send anything
      //   until submit button is pressed
      initialValues[name] = value;
      $(input).bind('change keyup input', function() {
        var newValue = elementToValue(input);
        if (value !== newValue) {
          value = newValue;
          onInputChange(name, value);
        }
      });
    });

    shinyapp.connect(initialValues);
  });
})();
