var nock = require('nock');
var should = require('should');
var sinon = require('sinon');
var _ = require('underscore');

var Charon = require('../index.js');

var DefaultClient = new Charon.Client();
DefaultClient.initialize({
  testConfigValue: "this-is-a-test-config-value"
});

describe('Charon.Client', function () {

  describe('Charon.Client#constructor', function () {
    it('should apply constructor overrides to instance properties', function () {
      var Client = new Charon.Client({
        foo: "bar",
        headers: { "donatello": "purple" }
      });
      Client.foo.should.equal("bar");
      Client.headers.donatello.should.equal("purple");
    });
  });

  describe('Charon.Client#initialize', function () {
    var Client = new Charon.Client({
      getFoo: function () { return "bar" },
      bar: "static bar",
      getBaz: function () { return [ "donatello", "purple" ] }
    });
    Client.initialize({
      baz: "gem",
      getFoo: function () { return "oof"; },
      getBaz: "static getBaz"
    });

    var newClient = new Charon.Client();

    it('should apply function params to instance properties', function () {
      Client.should.have.property('getFoo');
      Client.getFoo().should.equal('oof');
      Client.should.have.property('bar', 'static bar')
      Client.should.have.property('getBaz');
      Client.getBaz().should.eql([ 'donatello', 'purple' ]);
    });

    it('should not have config set before initialization', function () {
      newClient.getConfig().should.eql({});
    });

    it('should apply non-function params to config', function () {
      Client.should.have.property('getConfig');
      Client.getConfig().should.have.property('baz', 'gem');
      Client.getConfig().should.have.property('getBaz', 'static getBaz');
    });

    it('should set `isInitialized` to `true`', function () {
      var Client = new Charon.Client();
      Client.isInitialized().should.equal(false);
      Client.initialize();
      Client.isInitialized().should.equal(true);
    });

  });


  describe('Charon.Client#submit', function () {
    it('should invoke callback with RuntimeError if not initialized', function () {
      var Client = new Charon.Client();
      // Do NOT initialize
      var spyCallback = sinon.spy();
      Client.submit(spyCallback);
      spyCallback.getCall(0).args[0].should.be.an.instanceOf(Charon.RuntimeError);
    });

    it('should use request param getter methods from Client', function (done) {
      var Client = new Charon.Client({
        getUrl: function () { return 'foo://bar'; },
        getMethod: function () { return 'BORT'; },
        getTimeout: function () { return 42; },
        getHeaders: function () { return 'not even a header' },
        getBody: function () { return 'it\'s lonely in outer space'; },
      });
      Client.initialize({
        transmit: sinon.spy(function () {
          Client.transmit.getCall(0).args[0].should.eql({
            url: 'foo://bar',
            method: 'BORT',
            headers: 'not even a header',
            body: 'it\'s lonely in outer space',
            timeout: 42
          });
          done();
        })
      }).submit();
    });

    it('should use the href and method from a given link', function (done) {
      var Client = new Charon.Client({
        transmit: sinon.spy(Charon.Client.prototype, 'transmit')
      });
      Client.initialize();
      Client.submit({
          link: {
            href: 'http://example.com/',
            method: 'HEAD'
          }
        },
        function () {
          Client.transmit.getCall(0).args[0].url.should.eql('http://example.com/');
          Client.transmit.getCall(0).args[0].method.should.eql('HEAD');
          done();
        }
      );
    });

    it('should skip response/resourceMiddleware on internal error', function (done) {
      var Client = new Charon.Client();
      Client.initialize({
        responseMiddleware: sinon.spy(Client.responseMiddleware),
        resourceMiddleware: sinon.spy(Client.resourceMiddleware)
      });
       // URL should cause failure before request is sent
      Client.submit({ link: { href: 'testUrl2' } }, function (err, data) {
        Client.responseMiddleware.calledOn(Client).should.be.false;
        Client.resourceMiddleware.calledOn(Client).should.be.false;
        should.exist(err);
        err.should.be.an.instanceOf(Charon.Error);
        done();
      });
    });

    it('should call responseMiddleware with data on success', function (done) {
      var Client = new Charon.Client();
      Client.initialize({
        responseMiddleware: sinon.spy(Client.responseMiddleware),
        resourceMiddleware: sinon.spy(Client.resourceMiddleware)
      });
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      Client.submit({ link: { href: 'http://example.com/' } }, function (err, data) {
        Client.responseMiddleware.calledOn(Client).should.be.true;
        Client.resourceMiddleware.calledOn(Client).should.be.true;
        // First arg sent to middleware (err) should be null
        should.not.exist(Client.responseMiddleware.getCall(0).args[0]);
        should.not.exist(Client.resourceMiddleware.getCall(0).args[0]);
        var response = Client.responseMiddleware.getCall(0).args[1];
        response.should.have.property('body');
        response.body.should.have.property('data', 'foo');
        response.should.have.property('statusCode', 200);
        response.should.have.property('headers');
        done();
      });
    });

    it('should skip responseMiddleware if error detected in response', function (done) {
      var Client = new Charon.Client();
      Client.initialize({
        resourceMiddleware: sinon.spy(Client.resourceMiddleware)
      });
      nock('http://example.com').get('/').reply(400);
      Client.submit({ link: { href: 'http://example.com/' } }, function (err, data) {
        should.exist(err);
        err.should.be.an.instanceOf(Charon.ConsumerError);
        Client.resourceMiddleware.calledOn(Client).should.be.false;
        done();
      });
    });

    it('should call resourceMiddleware with response on success', function (done) {
      var Client = new Charon.Client();
      Client.initialize({
        resourceMiddleware: sinon.spy(Client.resourceMiddleware)
      });
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      Client.submit({ link: { href: 'http://example.com/' } }, function (err, data) {
        Client.resourceMiddleware.calledOn(Client).should.be.true;
        // First arg (err) to middleware should be null
        should.not.exist(Client.resourceMiddleware.getCall(0).args[0]);
        var response = Client.resourceMiddleware.getCall(0).args[1]._getResponse();
        response.should.have.property('body');
        response.body.should.have.property('data', 'foo');
        response.should.have.property('statusCode', 200);
        response.should.have.property('headers');
        done();
      });
    });

    it('should use resourceMiddleware to transform data', function (done) {
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      var Client = (new Charon.Client({
        resourceMiddleware: function (err, resource, next) {
          resource.data2 = resource._getResponse().body.data + 'bar';
          next(null, resource);
        }
      })).initialize();
      Client.submit({ link: { href: 'http://example.com/' } },
        function (err, data) {
          should.not.exist(err);
          should.exist(data);
          data.should.eql({ data2: "foobar" });
          done();
        }
      );
    });

    it('should use resourceMiddleware to create links', function (done) {
      var Client = (new Charon.Client({
        resourceMiddleware: function (err, resource, next) {
          resource._getLinks().push(
            { rel: "self", href: 'http://example.com/bar' }
          );
          resource.value = 'test';
          next(null, resource);
        }
      })).initialize();
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      Client.submit({ link: { 'href': 'http://example.com/' } },
        function callback (err, resource) {
          should.not.exist(err);
          should.exist(resource);
          resource.should.eql({ value: 'test' });
          should.exist(resource.getLinks);
          resource.getLinks.should.be.an.instanceOf.Function;
          resource.getLinks().should.eql([
            { rel: "self", href: 'http://example.com/bar' } ]);
          done();
        }
      );
    });

    it('should invoke callback with data on success', function (done) {
      var Client = (new Charon.Client()).initialize();
      var callback = sinon.spy(function (err, data) {
        callback.calledOn(Client).should.be.true;
        should.not.exist(err);
        data.should.eql({ data: "foo" });
        done();
      });
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      Client.submit({ link: { href: 'http://example.com/' } }, callback);
    });

  });

  describe('Charon.Client#createExtension', function () {

    var MyClient = new Charon.Client({
      testFn: function () { return  "this-is-a-test-config-value"; },
      otherFn: function () { return "otherVal" }
    });
    var MySubclient = MyClient.createExtension({
      otherFn: function () { return "subVal"; }
    });
    var ThirdClient = MySubclient.createExtension({
      thirdFn: function () { return "123"; }
    });

    it('should apply behavior overrides and inherit defaults', function () {
      MySubclient.otherFn().should.equal("subVal");
      MyClient.otherFn().should.equal("otherVal");
      MyClient.testFn().should.equal("this-is-a-test-config-value");
      ThirdClient.testFn().should.equal("this-is-a-test-config-value");
      ThirdClient.thirdFn().should.equal("123");
      should.not.exist(MySubclient.thirdFn);
    });

    it('should set config values for client and extensions during initialize', function () {
      MyClient.initialize({
        testConfigValue: "initVal",
        otherConfigValue: "initVal2"
      });
      MyClient.getConfig().should.eql({
        testConfigValue: "initVal",
        otherConfigValue: "initVal2"
      });
      MySubclient.getConfig().should.eql({
        testConfigValue: "initVal",
        otherConfigValue: "initVal2"
      });
    });

    it('should create instance of Charon.Client', function () {
      MySubclient.should.be.an.instanceOf(Charon.Client);
    });

  });

  describe('Charon.Client#responseMiddleware', function () {

    it('should invoke callback with err on HTTP error code by default', function (done) {
      nock('http://example.com').get('/').reply(400);
      var Client = (new Charon.Client());
      Client.initialize({
        responseMiddleware: sinon.spy(Client.responseMiddleware)
      });
      var callback = sinon.spy(function (err, data) {
        Client.responseMiddleware.calledOn(Client).should.be.true;
        should.exist(err);
        should.not.exist(data);
        err.should.be.an.instanceOf(Charon.ConsumerError);
        done();
      });
      Client.submit({ link: { href: 'http://example.com/' } }, callback);
    });

  });

  describe('Charon.Client#resourceMiddleware', function () {

    it('should create self link by default', function (done) {
      var Client = new Charon.Client();
      Client.initialize();
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      Client.submit({ link: { href: 'http://example.com/' } },
        function (err, resource) {
          should.not.exist(err);
          should.exist(resource);
          resource.should.eql({ data: "foo" });
          should.exist(resource.getLinks);
          resource.getLinks.should.be.an.instanceOf.Function;
          resource.getLinks().should.eql([
            { rel: 'self',
              href: 'http://example.com/' }
          ]);
          done();
        }
      );
    });

  });

  describe('Charon.Client#declareServices', function () {

    it('should create/assign service submission functions', function (done) {
      var Client = (new Charon.Client()).initialize();
      Client.createExtension = sinon.spy(Client.createExtension);
      var fooSpy = sinon.spy(function (params, callback) {
        callback(null, 'foo');
      });
      var barSpy = sinon.spy(function (params, callback) {
        callback(new Error('bar'));
      });
      Client.declareServices({
        foo: { execute: fooSpy },
        bar: { execute: barSpy }
      });
      // Should create two new subclients
      Client.createExtension.callCount.should.eql(2);
      Client.foo(function (err, data) {
        // Should invoke in context of new subclient, not on parent client
        fooSpy.calledOn(Client).should.be.false;
        // Should use given `execute` method to shortcut callback
        should.not.exist(err);
        data.should.eql('foo');
        Client.bar(function (err, data) {
        // Should invoke in context of new subclient, not on parent client
          barSpy.calledOn(Client).should.be.false;
        // Should use given `execute` method to shortcut callback
          should.exist(err);
          should.not.exist(data);
          err.should.be.an.Error
          err.message.should.eql('bar');
          done();
        });
      });
    });
  });

/* replace with declareServices / client extension tests
  describe('ResourceManagerFactory', function () {


    it('should apply overrides to created instance', function () {
      var resourceMgr = DefaultClient.ResourceManagerFactory({
        foo: "bar",
        testProp: "testValue"
      });
      resourceMgr.should.have.property('foo', 'bar');
      resourceMgr.should.have.property('testProp', 'testValue');
      var proto = resourceMgr.constructor.prototype;
      proto.should.have.property('foo', 'bar');
      proto.should.have.property('testProp', 'testValue');
    });

  });
*/

});
