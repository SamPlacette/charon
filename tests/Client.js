var nock = require('nock');
var should = require('should');
var request = require('request');

var Charon = require('../index.js');

var DefaultClient = Charon.ClientFactory();
DefaultClient.initialize({
  testConfigValue: "this-is-a-test-config-value"
});

describe('ClientFactory', function () {
  it('should apply constructor overrides to instance properties', function () {
    var Client = Charon.ClientFactory({
      foo: "bar",
      headers: { "donatello": "purple" }
    });
    Client.foo.should.equal("bar");
    Client.headers.donatello.should.equal("purple");
  });
});

describe('Client', function () {
  describe('initialize', function () {
    it('should apply options to instance properties', function () {
      var Client = Charon.ClientFactory({
        foo: "bar",
        headers: { "donatello": "purple" }
      });
      Client.initialize({
        baz: "gem",
        rootUrl: "http://foo.com/",
        headers: { "test": "header" }
      });
      Client.should.have.property('baz', 'gem');
      Client.rootUrl.should.equal("http://foo.com/");
      Client.headers.should.have.keys(['test']);
      Client.headers.should.have.property('test', 'header');
      Client.should.have.property('foo', 'bar');
    });

    it('should set `isInitialized` to `true`', function () {
      var Client = Charon.ClientFactory();
      Client.isInitialized.should.equal(false);
      Client.initialize();
      Client.isInitialized.should.equal(true);
    });
  });

  describe('invokeNext', function () {
    it('should call next with `this` context', function (done) {
      DefaultClient.invokeNext(null, null, function () {
        this.should.equal(DefaultClient);
        done();
      });
    });

    it('should pass err and omit data if error encountered', function (done) {
      DefaultClient.invokeNext("errorData", "successData", function (err, data) {
        err.should.equal("errorData");
        should.not.exist(data);
        done();
      });
    });

    it('should pass both err and data if err is falsey', function (done) {
      DefaultClient.invokeNext(null, "successData", function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.should.equal("successData");
        done();
      });
    });

  });

  describe('detectErrors', function () {

    it('should pass error to next', function (done) {
      DefaultClient.detectErrors("SomeError", "successData", function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.equal("SomeError");
        done();
      });
    });

    it('should throw appropriate error for HTTP status code', function () {
      var httpErrorCases = [
        { statusCode: 400, expectedError: Charon.ConsumerError },
        { statusCode: 418, expectedError: Charon.ConsumerError },
        { statusCode: 403, expectedError: Charon.RequestForbiddenError },
        { statusCode: 404, expectedError: Charon.ResourceNotFoundError },
        { statusCode: 409, expectedError: Charon.ResourceConflictError },
        { statusCode: 500, expectedError: Charon.ServiceError },
        { statusCode: 583, expectedError: Charon.ServiceError },
        { statusCode: undefined, expectedError: Charon.RuntimeError,
          expectedMessage: 'Unrecognized HTTP status code' },
        { statusCode: -18, expectedError: Charon.RuntimeError,
          expectedMessage: 'Unrecognized HTTP status code' },
        { statusCode: 601, expectedError: Charon.RuntimeError,
          expectedMessage: 'Unrecognized HTTP status code' },
        { statusCode: 100, expectedError: Charon.RuntimeError,
          expectedMessage: 'Unrecognized HTTP status code' }
      ];
      httpErrorCases.forEach(function (testCase) {
        DefaultClient.detectErrors(null, {
          statusCode: testCase.statusCode,
          testProperty: "testtoken"
        }, function (err, data) {
          should.exist(err);
          should.not.exist(data);
          err.should.be.an.instanceof(testCase.expectedError);
          err.message.should.equal(testCase.expectedMessage || '');
          err.data.should.eql({
            statusCode: testCase.statusCode,
            testProperty: "testtoken"
          });
        });
      });
    });

    it('should pass data on success status code', function () {
      var httpSuccessCases = [
        { statusCode: 200 },
        { statusCode: 204 },
        { statusCode: 299 }
      ];
 
      httpSuccessCases.forEach(function (testCase) {
        DefaultClient.detectErrors(null, {
          statusCode: testCase.statusCode,
          testProperty: "testtoken"
        }, function (err, data) {
          should.not.exist(err);
          should.exist(data);
          data.should.eql({
            statusCode: testCase.statusCode,
            testProperty: "testtoken"
          });
        });
      });
    });

    it('should invoke next in context', function () {
      DefaultClient.detectErrors(null, {
        statusCode: 200
      }, function (err, data) {
        this.should.equal(DefaultClient);
      });
    });

  });

  describe('templateUrl', function () {
    var urlTemplate = "/foo/:fooId/bar/:barId";

    it('should replace placeholders with data from params', function () {
      DefaultClient.templateUrl(urlTemplate, { fooId: 5 }, { barId: 42 })
        .should.equal("/foo/5/bar/42");
    });

    it('should use empty strings if no data in params', function () {
      DefaultClient.templateUrl(urlTemplate, { fooId: 5 })
        .should.equal("/foo/5/bar/");
      DefaultClient.templateUrl(urlTemplate, null, { barId: 42 })
        .should.equal("/foo//bar/42");
      DefaultClient.templateUrl(urlTemplate, null, {})
        .should.equal("/foo//bar/");
    });

    it('should not get stuck in circular loop', function () {
      DefaultClient.templateUrl(urlTemplate, { fooId: ":barId" }, { barId: ":barId" })
        .should.equal("/foo/:barId/bar/:barId");
    });

    it('should replace placeholders with data from config', function () {
      var urlTemplateWithConfigPlaceholder = ":testConfigValue" + urlTemplate;
      DefaultClient.templateUrl(urlTemplateWithConfigPlaceholder, { fooId: 5 }, { barId: 42 })
        .should.equal("this-is-a-test-config-value/foo/5/bar/42");
    });

    it('should accept a filename extension after a placeholder', function () {
      var urlTemplateWithExtension = urlTemplate + ".json";
      DefaultClient.templateUrl(urlTemplateWithExtension, { fooId: 5 }, { barId: 42 })
        .should.equal("/foo/5/bar/42.json");
    });

  });

  describe('submitRequest', function () {

    it('should invoke callback in context', function (done) {
      DefaultClient.submitRequest({}, function () {
        this.should.equal(DefaultClient);
        done();
      });
    });

    it('should invoke callback with RuntimeError on err', function (done) {
      // will cause client to pass error because domain does not exist
      DefaultClient.submitRequest(
        { url: 'foo://example.com/', requestSpecProp: "token" },
        function (err, data) {
          should.exist(err);
          should.not.exist(data);
          err.should.be.an.instanceof(Charon.RuntimeError);
          err.message.should.equal('HTTP client error');
          err.data.err.should.be.an.Error;
          err.data.err.message.should.equal("Invalid protocol");
          err.data.requestSpec.should.eql({
            url: 'foo://example.com/',
            requestSpecProp: "token"
          });
          done();
        }
      );
    });

    it('should invoke callback with ParseError on badly formatted response', function (done) {
      nock('http://example.com').get('/').reply(200,
        "%% This is not a JSON response {!#]",
        { "content-type": "application/json" }
      );
      DefaultClient.submitRequest(
        { url: 'http://example.com/', requestSpecProp: "token" },
        function (err, data) {
          should.exist(err);
          should.not.exist(data);
          err.should.be.an.instanceof(Charon.ParseError);
          err.message.should.equal('Failed to parse resource identified as JSON');
          err.data.err.should.be.an.Error;
          err.data.err.should.be.an.instanceOf.SyntaxError;
          err.data.responseSpec.body.should.eql("%% This is not a JSON response {!#]");
          err.data.responseSpec.requestSpec.should.eql({
            url: 'http://example.com/',
            requestSpecProp: "token"
          });
          done();
        }
      );
    });

    it('should invoke callback with TimeoutError if response is not received before timeout period', function (done) {
      DefaultClient.submitRequest(
        // short timeout ensures timeout will trigger before request is sent
        { url: 'http://example.com/', requestSpecProp: "token", timeout: 1 },
        function (err, data) {
          should.exist(err);
          should.not.exist(data);
          err.should.be.an.instanceof(Charon.TimeoutError);
          err.message.should.equal('Timeout after 1ms');
          err.data.err.should.be.an.Error;
          err.data.err.code.should.equal("ETIMEDOUT");
          err.data.requestSpec.should.eql({
            url: 'http://example.com/',
            requestSpecProp: "token",
            timeout: 1
          });
          done();
        }
      );
    });

    it('should invoke callback with responseSpec on success', function (done) {
      nock('http://example.com').get('/').reply(200, { data: "foo" });
      DefaultClient.submitRequest(
        { url: 'http://example.com/', testProp: "token" },
        function (err, data) {
          should.not.exist(err);
          should.exist(data);
          data.should.eql({
            body: { data: "foo" },
            statusCode: 200,
            headers: {},
            requestSpec: {
              url: 'http://example.com/',
              testProp: "token"
            }
          });
          done();
        }
      );
    });

  });

  describe('ResourceManagerFactory', function () {

    it('should create instance of ResourceManager', function () {
      DefaultClient.ResourceManagerFactory().should.be.an.instanceOf(Charon.ResourceManager);
    });

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

});
