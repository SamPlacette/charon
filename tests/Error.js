var should = require('should');

var Charon = require('../index.js');

describe('Error', function () {

  var testCases = [
    { name: "Error", parents: [] },
    { name: "ConsumerError", parents: [] },
    { name: "ServiceError", parents: [] },
    { name: "RequestForbiddenError", parents: [Charon.ConsumerError] },
    { name: "ResourceNotFoundError", parents: [Charon.ConsumerError] },
    { name: "ResourceConflictError", parents: [Charon.ConsumerError] },
    { name: "RuntimeError", parents: [Charon.ServiceError] },
    { name: "ParseError", parents: [Charon.ServiceError] },
    { name: "TimeoutError", parents: [Charon.ServiceError] }
  ];
  testCases.forEach(function (testCase) {
    var name = testCase.name;
    var errCtor = Charon[name];
    var inheritanceChain = [Error, Charon.Error]
                              .concat(testCase.parents)
                              .concat(errCtor);

    describe(name, function () {

      it('should have name "Charon.' + name + '"', function () {
        var err = new errCtor();
        err.name.should.equal('Charon.' + name);
      });

      it('should accept message alone', function () {
        var err = new errCtor('testMessage');
        err.should.have.property('message', 'testMessage');
        should.not.exist(err.data);
      });

      it('should accept data alone', function () {
        var err = new errCtor({ unexpected: true });
        err.should.have.property('message', '');
        err.data.should.eql({ unexpected: true });
      });

      it('should accept message and data', function () {
        var err = new errCtor('testMessage', { someProperty: true });
        err.should.have.property('message', 'testMessage');
        err.data.should.eql({ someProperty: true });
      });

      it('should handle unexpected data type', function () {
        var err = new errCtor('testMessage', "foo");
        err.should.have.property('message', 'testMessage');
        should.exist(err.data);
        err.data.should.eql({
          constructorError: 'invalid error data type: string',
          originalData: "foo"
        });
      });

      inheritanceChain.forEach(function (parentErr) {
        it('should be instanceof ' + parentErr.prototype.name, function () {
          var err = new errCtor();
          err.should.be.an.instanceOf(parentErr);
        });
      });

    });
  });
  
});
