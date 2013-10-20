var should = require('should');
var nock = require('nock');
var sinon = require('sinon');
var _ = require('underscore');

var Charon = require('../index.js');

var DefaultClient = Charon.ClientFactory();

describe('ResourceManager', function () {

  describe('linkClient', function () {

    it('should set client on instance property', function () {
      var resourceMgr = DefaultClient.ResourceManagerFactory();
      resourceMgr.client.should.equal(DefaultClient);
    });

    it('should define function-getters for serviceCallParams', function () {
      var Client = Charon.ClientFactory({
        serviceCallParams: ["foo", "bar"]
      });
      Client.initialize({ foo: "fooValue", bar: "barValue" });
      var resourceMgr = Client.ResourceManagerFactory();
      resourceMgr.should.have.property("foo");
      resourceMgr.foo.should.be.a.Function;
      resourceMgr.foo().should.equal("fooValue");
    });

    it('should inherit all functions from client by reference', function () {
      var testFn = function () { return "this is a test"; };
      var testUrl = function () { return "this is a test URL"; };
      var Client = Charon.ClientFactory({
        testFn: testFn,
        serviceCallParams: ["url"],
        url: testUrl
      });
      var resourceMgr = Client.ResourceManagerFactory();
      resourceMgr.should.have.property('testFn');
      resourceMgr.testFn.should.equal(testFn);
      // url is service param, but it should still be shared with resource
      // manager by reference since it is a function on the client
      resourceMgr.should.have.property('url');
      resourceMgr.url.should.equal(testUrl);
    });

    it('should only set function or serviceCallParam properties', function () {
      var testFn = function () { return "this is a test"; };
      var Client = Charon.ClientFactory({
        testFn: testFn,
        serviceCallParams: ["foo"],
        foo: "fooValue",
        bar: "barValue"
      });
      var resourceMgr = Client.ResourceManagerFactory();
      resourceMgr.should.have.property('testFn');
      resourceMgr.should.have.property('foo');
      resourceMgr.should.not.have.property('bar');
      
    });

    it('should use prototype properties over client properties', function () {
      var clientTestFn = function () { return "this is a test"; };
      var Client = Charon.ClientFactory({
        testFn: clientTestFn,
        serviceCallParams: ["foo"],
        foo: "testValue1"
      });
      var resourceMgrTestFn = function () { return "this is a different test"; };
      var resourceMgr = Client.ResourceManagerFactory({
        testFn: resourceMgrTestFn,
        foo: "testValue2"
      });
      resourceMgr.testFn.should.equal(resourceMgrTestFn);
      resourceMgr.foo.should.equal("testValue2");
    });

  });

  describe('defineServiceCall', function () {
    var testRequestSpecProps = {
      url: "http://example.com/",
      method: "GET",
      headers: { "test": "testHeaderValue" },
      body: undefined, // must be undefined because method is GET
      timeout: 42
    };

    var testPostRequestSpecProps = {
      url: "http://example.com/",
      method: "POST",
      headers: { "test": "testHeaderValue" },
      body: { "foo": "bartest" },
      timeout: 42
    };

    it('should invoke callback with RuntimeError if not initialized', function () {
      var Client = Charon.ClientFactory();
      // do NOT initialize
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall();
      var spyCallback = sinon.spy();
      Client.ResourceMgr.serviceCall(spyCallback);
      spyCallback.getCall(0).args[0].should.be.an.instanceOf(Charon.RuntimeError);
    });

    it('should use service param defaults from Client', function () {
      var Client = Charon.ClientFactory(_.extend({}, testRequestSpecProps, {
        submitRequest: sinon.spy()
      }));
      Client.initialize();
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall();
      Client.ResourceMgr.serviceCall();
      Client.submitRequest.getCall(0).args[0].should.eql(testRequestSpecProps);
    });

    it('should use body default from Client for request methods that have a body', function () {
      var Client = Charon.ClientFactory(_.extend({}, testPostRequestSpecProps, {
        submitRequest: sinon.spy()
      }));
      Client.initialize();
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall();
      Client.ResourceMgr.serviceCall();
      Client.submitRequest.getCall(0).args[0].should.eql(testPostRequestSpecProps);
    });

    it('should use service param defaults from ResourceManager', function () {
      var Client = Charon.ClientFactory({ submitRequest: sinon.spy() });
      Client.initialize();
      Client.ResourceMgr = Client.ResourceManagerFactory(testRequestSpecProps);
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall();
      Client.ResourceMgr.serviceCall();
      Client.submitRequest.calledWith(testRequestSpecProps).should.be.true;
    });

    it('should prioritize params in service call definition', function () {
      var Client = Charon.ClientFactory({ submitRequest: sinon.spy() });
      Client.initialize();
      Client.ResourceMgr = Client.ResourceManagerFactory(testRequestSpecProps);

      var modifiedTestRequestSpecProps = _.extend({}, testRequestSpecProps,
        { url: "testUrl2" });
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall(
                                                modifiedTestRequestSpecProps);
      Client.ResourceMgr.serviceCall();
      Client.submitRequest.calledWith(modifiedTestRequestSpecProps)
                                                          .should.be.true;
    });

    it('should use body param from service call for request methods that have a body', function () {
      var Client = Charon.ClientFactory(_.extend({}, _.omit(testPostRequestSpecProps, 'body'), {
        submitRequest: sinon.spy()
      }));
      var dataParam = { "sed": "awk" };
      var expectedRequestSpecProps = _.extend({}, testPostRequestSpecProps,
                                              { body: dataParam });
      Client.initialize();
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall();
      Client.ResourceMgr.serviceCall(dataParam);
      Client.submitRequest.getCall(0).args[0].should.eql(expectedRequestSpecProps);
    });

    it('should call responseMiddleware with err on error', function (done) {
      var Client = Charon.ClientFactory();
      Client.initialize({
        responseMiddleware: sinon.spy(Client.responseMiddleware)
      });
      Client.ResourceMgr = Client.ResourceManagerFactory();
       // URL should cause failure before request is sent
      var modifiedTestRequestSpecProps = _.extend({}, testRequestSpecProps,
        { url: "testUrl2" });
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall(
                                                modifiedTestRequestSpecProps);
      Client.ResourceMgr.serviceCall({}, function (err, data) {
        Client.responseMiddleware.calledOn(Client.ResourceMgr).should.be.true;
        should.exist(err);
        err.should.be.an.instanceOf(Charon.Error);
        Client.responseMiddleware.calledWith(err).should.be.true;
        done();
      });
    });

    it('should call responseMiddleware with data on success', function (done) {
      var Client = Charon.ClientFactory();
      Client.initialize({
        responseMiddleware: sinon.spy(Client.parseResource)
      });
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall(
                                                testRequestSpecProps);
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      Client.ResourceMgr.serviceCall({}, function (err, data) {
        Client.responseMiddleware.calledOn(Client.ResourceMgr).should.be.true;
        should.not.exist(Client.responseMiddleware.getCall(0).args[0]);
        Client.responseMiddleware.getCall(0).args[1].should.eql({
          body: { data: "foo" },
          statusCode: 200,
          headers: {},
          requestSpec: testRequestSpecProps
        });
        done();
      });
    });

    it('should call parseResource with err on error', function (done) {
      var Client = Charon.ClientFactory();
      Client.initialize({
        parseResource: sinon.spy(Client.parseResource)
      });
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall(
                                                testRequestSpecProps);
      nock('http://example.com').get('/').reply(400);
      Client.ResourceMgr.serviceCall({}, function (err, data) {
        Client.parseResource.calledOn(Client.ResourceMgr).should.be.true;
        should.exist(err);
        err.should.be.an.instanceOf(Charon.Error);
        Client.parseResource.calledWith(err).should.be.true;
        done();
      });
    });

    it('should call parseResource with data on success', function (done) {
      var Client = Charon.ClientFactory();
      Client.initialize({
        parseResource: sinon.spy(Client.parseResource)
      });
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall(
                                                testRequestSpecProps);
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      Client.ResourceMgr.serviceCall({}, function (err, data) {
        Client.parseResource.calledOn(Client.ResourceMgr).should.be.true;
        should.not.exist(Client.parseResource.getCall(0).args[0]);
        Client.parseResource.getCall(0).args[1].should.eql({
          body: { data: "foo" },
          statusCode: 200,
          headers: {},
          requestSpec: testRequestSpecProps
        });
        done();
      });
    });

    it('should invoke callback with err on error', function (done) {
      var Client = Charon.ClientFactory();
      Client.initialize();
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall(
                                                testRequestSpecProps);
      nock('http://example.com').get('/').reply(400);
      var callback = sinon.spy(function (err, data) {
        callback.calledOn(Client.ResourceMgr).should.be.true;
        should.exist(err);
        should.not.exist(data);
        err.should.be.an.instanceOf(Charon.Error);
        done();
      });
      Client.ResourceMgr.serviceCall({}, callback);
    });

    it('should invoke callback with data on success', function (done) {
      var Client = Charon.ClientFactory();
      Client.initialize();
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall(
                                                testRequestSpecProps);
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      var callback = sinon.spy(function (err, data) {
        callback.calledOn(Client.ResourceMgr).should.be.true;
        should.not.exist(err);
        data.should.eql({ data: "foo" });
        done();
      });
      Client.ResourceMgr.serviceCall({}, callback);
    });

    it('should use parseResource to transform data', function (done) {
      var Client = Charon.ClientFactory({
        parseResource: function (err, responseSpec, next) {
          next(null, { data2: responseSpec.body.data + 'bar' });
        }
      });
      Client.initialize();
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.serviceCall = Client.ResourceMgr.defineServiceCall(
                                                testRequestSpecProps);
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      Client.ResourceMgr.serviceCall({}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.should.eql({ data2: "foobar" });
        done();
      });
    });

  });

  describe('declareServiceCalls', function () {
    it('should define and set multiple service calls', function () {
      var Client = Charon.ClientFactory();
      Client.initialize();
      Client.ResourceMgr = Client.ResourceManagerFactory();
      Client.ResourceMgr.declareServiceCalls({
        "serviceCall1": {},
        "serviceCall2": {}
      });
      should.exist(Client.ResourceMgr.serviceCall1);
      Client.ResourceMgr.serviceCall1.should.be.a.Function;
      should.exist(Client.ResourceMgr.serviceCall2);
      Client.ResourceMgr.serviceCall2.should.be.a.Function;
    });
  });

});
