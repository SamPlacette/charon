var nock = require('nock');
var should = require('should');
var _ = require('underscore');

var Charon = require('../index.js');

var DefaultClient = new Charon.Client();
DefaultClient.initialize({
  testConfigValue: "this-is-a-test-config-value"
});

describe('Charon.transmitWithRequestLib', function () {

  it('should invoke callback in context', function (done) {
    DefaultClient.transmit({}, function () {
      DefaultClient.should.equal(this);
      done();
    });
  });

  it('should invoke callback with RuntimeError on err', function (done) {
    // will cause client to pass error because domain does not exist
    DefaultClient.transmit(
      { url: 'foo://example.com/', requestProp: "token" },
      function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.be.an.instanceof(Charon.RuntimeError);
        err.message.should.equal('HTTP client error');
        err.data.err.should.be.an.Error;
        err.data.err.message.should.equal("Invalid protocol");
        err.data.request.should.eql({
          url: 'foo://example.com/',
          requestProp: "token"
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
    DefaultClient.transmit(
      { url: 'http://example.com/', requestProp: "token" },
      function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.be.an.instanceof(Charon.ParseError);
        err.message.should.equal('Failed to parse resource identified as JSON');
        err.data.err.should.be.an.Error;
        err.data.err.should.be.an.instanceOf.SyntaxError;
        err.data.response.body.should.eql("%% This is not a JSON response {!#]");
        err.data.response.request.should.eql({
          url: 'http://example.com/',
          requestProp: "token"
        });
        done();
      }
    );
  });

  it('should invoke callback with TimeoutError if response is not received before timeout period', function (done) {
    DefaultClient.transmit(
      // Short timeout ensures timeout will trigger before request is sent
      { url: 'http://example.com/', requestProp: "token", timeout: 0.000001 },
      function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.should.be.an.instanceof(Charon.TimeoutError);
        err.message.should.equal('Timeout after 0.000001s');
        err.data.err.should.be.an.Error;
        err.data.err.code.should.include("TIMEDOUT");
        err.data.request.should.eql({
          url: 'http://example.com/',
          requestProp: "token",
          timeout: 0.000001
        });
        done();
      }
    );
  });

  it('should invoke callback with response on success', function (done) {
    nock('http://example.com').get('/').reply(200, { data: "foo" });
    DefaultClient.transmit(
      { url: 'http://example.com/', testProp: "token" },
      function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.should.eql({
          body: { data: "foo" },
          statusCode: 200,
          headers: {},
          request: {
            url: 'http://example.com/',
            testProp: "token"
          }
        });
        done();
      }
    );
  });

});
