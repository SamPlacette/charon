Charon
======

Charon is a little API client factory, created to abstract away some of the
nitty gritty aspects of interacting with a ReST API over HTTP. At its core,
Charon is a means of organizing an API domain into a single client-namespace
with a hierarchical set of services and a consistent interface.

But wait, there's more!

* Charon makes it easy to define common behaviors, such as including
authorization headers in requests or unpacking response envelopes, and it
allows you to apply those behaviors to all, or just some, endpoints in your
REST API.
* Charon translates HTTP error codes into error instances in a consistent way,
so your app code doesn't have to.
* Charon uses configurable middleware to parse responses, so you can easily add
additional functionality without having to rewrite the whole thing.

Don't call it a framework
-----------------------------

Charon is a simple library focused on abstracting RESTful service calls.
Service methods have a familiar ``(data, [options,] callback)`` signature, and
callbacks are called with ``(err, data)`` - that's the _only_  your
application code should interact with. 

Charon is designed to produce stateless clients, and data is passed around as
plain old JSON-serializable objects with no getter/setter functions or any
other monkey business. Because Charon isn't a framework and isn't tied to any
framework, you should be able to integrate it into pretty much any app (or
your favorite framework) without too many complications.

Assumptions
-----------

* all service communication happens over HTTP, or something like it
* all service communications are asynchronous
* all data is JSON-serializable
* works with node.js only

Todo: Make it better
--------------------

* documentation
* streamlined logging
* transparent caching according to response headers
* isomorphic browser / mobile / server execution
* HATEOAS integration

Example client definition and usage
----------------------------------------------------

```javascript

// Create a client for our business's REST API.
var CandyShop = Charon.ClientFactory({
  // Let's give it some default behavior that all services require
  headers: { "X-Password": "I like candy" }
});

// Now let's create a ResourceManager to contain several services which
// act on the same resource type.
CandyShop.Lollipop = CandyShop.ResourceManagerFactory({
  // default URL. ":flavor" placeholder is substituted with data or
  // options provided to service call. Note, ``url`` can also be a function
  // if you want to get all control-freak about it.
  url: "/lollipop/:flavor"
});

// We'll declare some basic CRUD services for our ResourceManager
// (note, all share the ResourceManager's default URL method)
CandyShop.Lollipop.declareServiceCalls({
  "get": { method: "GET" },
  "save": { method: "PUT" },
  "delete": { method: "DELETE" },
  // Let's get a little fancy with search
  "search": {
    method: "GET",

    // URL override
    url: "/lollipop/search?color=:color",

    // Extend the headers too, why not
    headers: _.extend({}, CandyShop.headers, { "X-Likes-Candy": "True" }),

    // To make things interesting, let's say the search response is noisy,
    // with lots of metadata we don't care about. We can define our own
    // ``parseResource`` method here to pull the resource out of the response.
    parseResource: function (err, response, next) {
      if (err) { next(err); return; }
      next(null, response.body.result.items);
    }
  }
});

// Clients can be initialized with dynamic configuration data. This should
// only be done once, when your app is starting up (aka "bootstrap" phase).
CandyShop.initialize({ rootUrl: "http://www.mycandyshopapi.com/v3.42" });

// Service calls accept a ``data`` object param and an ``options`` object
// param. ``data`` should generally be limited to stuff that you consider part
// of the resource definition, while options should generally be optional.
// Following these rough rules of thumb are not required, but will make your
// client more consistent.
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
  // Find other lollies that look like this one
  // Note distinction between data and options in this call
  CandyShop.Lollipop.search({ color: myLolly.color }, { limit: 10 },
    function (err, lollipops) {
      lollipops.forEach(function (lolly) {
        if (lolly.yucky) {
          CandyShop.Lollipop.delete(lolly, function (err) {
            console.log("Yucky lolly " + lolly.flavor + " has been deleted");
          });
        }
      });
    }
  );
});
```
