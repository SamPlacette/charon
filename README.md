Charon
======

A little API client factory to abstract away some of the nitty gritty aspects
of interacting with a ReST API over HTTP.

Etymology
---------

Like the mythological Styx river guide, this client factory provides
direction and guidance to sinners navigating the nebulous ether separating
the client from the server (where requests go to die).

Assumptions
-----------

* all service communication happens over HTTP, or something like it
* all data is JSON-serializable
* node.js only

Todo: Make it better
--------------------

* tests
* documentation
* transparent caching
* isomorphic browser / mobile / server execution
* HATEOAS integration

Examples
-------------

```javascript

// Create a client. Let's give it some default behavior that all services share
var CandyShop = Charon.ClientFactory({
  headers: { "X-Password": "I like candy" }
});

CandyShop.Lollipop = CandyShop.ResourceManagerFactory({
  // default URL. ":flavor" placeholder is substituted with data or
  // options provided to service call. Note, ``url`` can also be a function
  // if you want to get all control-freak about it.
  url: "/lollipop/:flavor"
});

CandyShop.Lollipop.declareServiceCalls({
  // basic CRUD (note, all share client's default URL method)
  "get": { method: "GET" },
  "save": { method: "PUT" },
  "delete": { method: "DELETE" },
  // get a little fancy with search
  "search": {
    method: "GET",
    // URL override
    url: "/lollipop/search?color=:color",
    // extend the headers too, why not
    headers: _.extend({}, CandyShop.headers, { "X-LikesCandy": "True" }),
    // pull results out of noisy service response
    parseResource: function (err, responseSpec, next) {
      if (err) { next(err); return; }
      next(null, responseSpec.body.result.items);
    }
  }
});

CandyShop.initialize({ rootUrl: "http://www.mycandyshopapi.com" });

// Service calls accept a ``data`` object param and an ``options`` object
// param. ``data`` should generally be limited to stuff that you consider part
// of the resource definition, while options should generally be optional.
// Following these rough rules of thumb are not required, but will make your
// client more intuitive.
CandyShop.Lollipop.get({ flavor: "blueberry" }, function (err, myLolly) {
  // ``myLolly`` is a JSON-serializable POJO representing the resource
  if (myLolly.tastiness > 10) {
    myLolly.yummy = true;
    // ``myLolly`` can be passed to another service call, such as save, which
    // accepts a resource as data.
    CandyShop.Lollipop.save(myLolly, function (err, myLolly) {
      console.log("my " + myLolly.flavor + " lolly has been saved as yummy");
    });
  }
  // find other lollies that look like this one
  // Note distinction between data and options in this call
  CandyShop.Lollipop.search({ "color": myLolly.color }, { limit: 10 },
    function (err, lollipops) {
      lollipops.forEach(function (lolly) {
        if (lolly.yucky) {
          CandyShop.Lollipop.delete(lolly, function (err) {
            console.log("Yucky lolly " + lolly.flavor + " has been deleted");
          });
        }
      });
    });
});
```
