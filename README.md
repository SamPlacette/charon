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

* all service communication happens over HTTP
* all services are resource-centric (ReSTful) in nature
* all data is JSON-serializable
* node.js only

Todo: Make it better
--------------------

* tests
* documentation
* transparent caching
* isomorphic browser / mobile / server execution
* HATEOAS integration
