var nock = require('nock');
var should = require('should');
var request = require('request');
var _ = require('underscore');

var Charon = require('../index.js');

var DefaultClient = new Charon.Client();
DefaultClient.initialize({
  testConfigValue: "this-is-a-test-config-value"
});

describe('Charon.responseMiddlewares', function () {

  describe('detectErrors', function () {

    it('should pass error to next', function (done) {
      DefaultClient.responseMiddlewares.detectErrors.call(DefaultClient,
        "SomeError", "successData",
        function (err, data) {
          should.exist(err);
          should.not.exist(data);
          err.should.equal("SomeError");
          done();
        }
      );
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
        DefaultClient.responseMiddlewares.detectErrors.call(
          DefaultClient, null,
          { statusCode: testCase.statusCode,
            testProperty: "testtoken" },
          function (err, data) {
            should.exist(err);
            should.not.exist(data);
            err.should.be.an.instanceof(testCase.expectedError);
            err.message.should.equal(testCase.expectedMessage || '');
            err.data.should.eql({
              statusCode: testCase.statusCode,
              testProperty: "testtoken"
            });
          }
        );
      });
    });

    it('should pass data on success status code', function () {
      var httpSuccessCases = [
        { statusCode: 200 },
        { statusCode: 204 },
        { statusCode: 299 }
      ];
 
      httpSuccessCases.forEach(function (testCase) {
        DefaultClient.responseMiddlewares.detectErrors.call(
          DefaultClient, null,
          { statusCode: testCase.statusCode,
            testProperty: "testtoken" },
          function (err, data) {
            should.not.exist(err);
            should.exist(data);
            data.should.eql({
              statusCode: testCase.statusCode,
              testProperty: "testtoken"
            });
          }
        );
      });
    });

    it('should invoke next in context', function () {
      DefaultClient.responseMiddlewares.detectErrors.call(
        DefaultClient, null, { statusCode: 200 },
        function (err, data) {
          this.should.equal(DefaultClient);
        }
      );
    });

  });

});
