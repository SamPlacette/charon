var nock = require('nock');
var should = require('should');
var sinon = require('sinon');
var _ = require('underscore');

var Charon = require('../index.js');

describe('Charon.Middleware', function () {
  it('should create a callable function', function () {
    var mid = Charon.Middleware();
    mid();
  });

  it('should call the callback', function (done) {
    var mid = Charon.Middleware(
      function (err, data, next) {
        next(null, "42");
      }
    );
    mid(null, null, function (err, data) {
      should.exist(data);
      data.should.equal("42");
      done();
    });
  });

  it('should call every knuckle', function (done) {
    var spy1 = sinon.spy(function (err, data, next) {
      data.spy1 = true; next(null, data);
    });
    var spy2 = sinon.spy(function (err, data, next) {
      data.spy2 = true; next(null, data);
    });
    var mid = new Charon.Middleware([ spy1, spy2 ]);
    mid(null, { seed: true }, function (err, data) {
      spy1.called.should.be.true;
      spy2.called.should.be.true;
      should.not.exist(err);
      data.should.have.property('seed', true);
      data.should.have.property('spy1', true);
      data.should.have.property('spy2', true);
      done();
    });
  });

  it('should execute the functions in order', function (done) {
    var spy1 = sinon.spy(function (err, data, next) {
      data.spy1 = true;
      if (! data.calledFirst) data.calledFirst = 'spy1';
      next(null, data);
    });
    var spy2 = sinon.spy(function (err, data, next) {
      data.spy2 = true;
      if (! data.calledFirst) data.calledFirst = 'spy2';
      next(null, data);
    });
    var mid = new Charon.Middleware([spy1, spy2]);
    mid(null, { seed: true }, function (err, data) {
      spy1.called.should.be.true;
      spy2.called.should.be.true;
      should.not.exist(err);
      data.should.have.property('seed', true);
      data.should.have.property('spy1', true);
      data.should.have.property('spy2', true);
      data.should.have.property('calledFirst', 'spy1');
      done();
    });
  });

  describe('Charon.Middleware#slice', function () {
    it('should be possible to make a copy of the middleware', function (done) {
      var spy1 = sinon.spy(function (err, data, next) {
        data.spy1 = true; next(null, data);
      });
      var spy2 = sinon.spy(function (err, data, next) {
        data.spy2 = true; next(null, data);
      });
      var mid = new Charon.Middleware([ spy1, spy2 ]);
      var mid2 = new Charon.Middleware(mid.slice());
      mid2(null, { seed: true }, function (err, data) {
        spy1.called.should.be.true;
        spy2.called.should.be.true;
        should.not.exist(err);
        data.should.have.property('seed', true);
        data.should.have.property('spy1', true);
        data.should.have.property('spy2', true);
        done();
      });
    });

    it('should be possible to create a modified copy', function (done) {
      var spy1 = sinon.spy(function (err, data, next) {
        data.calls.push('spy1');
        next(null, data);
      });
      var spy2 = sinon.spy(function (err, data, next) {
        data.calls.push('spy2');
        next(null, data);
      });
      var spy3 = sinon.spy(function (err, data, next) {
        data.calls.push('spy3');
        next(null, data);
      });
      var mid = new Charon.Middleware([spy1, spy2, spy3]);
      var mid2 = new Charon.Middleware(mid.slice(1).concat(mid.slice(0, 1)))
      mid2(null, { seed: true, calls: [] }, function (err, data) {
        spy1.called.should.be.true;
        spy2.called.should.be.true;
        spy3.called.should.be.true;
        should.not.exist(err);
        data.should.have.property('seed', true);
        data.calls.should.eql(['spy2', 'spy3', 'spy1']);
        done();
      });
    });
  });

});
