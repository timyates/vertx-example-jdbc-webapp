/*
 * Copyright 2011-2012 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function DemoViewModel() {

  var that = this;
  var eb = new vertx.EventBus(window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/eventbus');
  that.items = ko.observableArray([]);

  eb.onopen = function() {

    // Get the static data

    eb.send('bloidonia.businessrules', {action: 'find', collection: 'albums', matcher: {} },
      function(reply) {
        if (reply.status === 'ok') {
          var albumArray = [];
          console.log( reply ) ;
          for (var i = 0; i < reply.result.length; i++) {
            albumArray[i] = new Album(reply.result[i]);
          }
          that.albums = ko.observableArray(albumArray);
          ko.applyBindings(that);
        } else {
          console.error('Failed to retrieve albums: ' + reply.message);
        }
      });
  };

  eb.onclose = function() {
    eb = null;
  };

  that.addToCart = function(album) {
    console.log("Adding to cart: " + JSON.stringify(album));
    for (var i = 0; i < that.items().length; i++) {
      var compare = that.items()[i];
      if (compare.album._id === album._id) {
        compare.quantity(compare.quantity() + 1);
        return;
      }
    }
    that.items.push(new CartItem(album));
  };

  that.removeFromCart = function(cartItem) {
    that.items.remove(cartItem);
  };

  that.total = ko.computed(function() {
    var tot = 0;
    for (var i = 0; i < that.items().length; i++) {
      var item = that.items()[i];
      tot += item.quantity() * item.album.price;
    }
    tot = '$' + tot.toFixed(2);
    return tot;
  });

  that.orderReady = ko.computed(function() {
    var or =  that.items().length > 0 && that.loggedIn;
    return or;
  });

  that.orderSubmitted = ko.observable(false);

  that.submitOrder = function() {

    if (!orderReady()) {
      return;
    }

    var orderItems = ko.toJS(that.items);
    var orderMsg = {
      action: "save",
      collection: "orders",
      document: {
        username: that.username(),
        items: orderItems
      }
    }

    eb.send('bloidonia.businessrules', orderMsg, function(reply) {
      if (reply.status === 'ok') {
        that.orderSubmitted(true);
        // Timeout the order confirmation box after 2 seconds
        // window.setTimeout(function() { that.orderSubmitted(false); }, 2000);
      } else {
        console.error('Failed to accept order');
      }
    });
  };

  that.username = ko.observable('');
  that.password = ko.observable('');
  that.loggedIn = ko.observable(false);

  that.login = function() {
    if (that.username().trim() != '' && that.password().trim() != '') {
      eb.login(that.username(), that.password(), function (reply) {
        if (reply.status === 'ok') {
          that.loggedIn(true);
        } else {
          that.loggedIn(false);
          alert('invalid login');
        }
      });
    }
  }

  function Album(json) {
    var that = this;
    that._id = json.ID;
    that.genre = json.GENRE;
    that.artist = json.ARTIST;
    that.title = json.TITLE;
    that.price = json.PRICE;
    that.formattedPrice = ko.computed(function() {
      return '$' + that.price.toFixed(2);
    });
  }

  function CartItem(album) {
    var that = this;
    that.album = album;
    that.quantity = ko.observable(1);
  }
})();