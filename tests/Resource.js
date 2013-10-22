var should = require('should');
var nock = require('nock');
var sinon = require('sinon');
var _ = require('underscore');

var Charon = require('../index.js');

var DefaultClient = new Charon.Client();

describe('Resource', function () {

  var defaultResource = new DefaultClient.Resource({
    data: {
      foo: "bar",
      size: "big"
    },
    links: [
      { rel: "self", href: "http://example.com/default" },
      { rel: "alternate", href: "http://example.com/resources/default" },
      { rel: "alternate", href: "http://example.com/v1/default" }
    ],
    meta: {
      lastModified: 'two weeks ago'
    }
  });

  it('should create an instance of ``Charon.Resource``', function () {
    var resource = new DefaultClient.Resource({ data: {}, links: [] });
    resource.should.be.an.instanceOf(Charon.Resource);
  });

  it('should have data attributes available as properties', function () {
    should.exist(defaultResource.foo);
    defaultResource.foo.should.equal('bar');
    should.exist(defaultResource.size);
    defaultResource.size.should.equal('big');
  });

  describe('getLinks', function () {
    it('should exist on a Resource instance', function () {
      should.exist(defaultResource.getLinks);
      defaultResource.getLinks.should.be.an.instanceOf(Function);
    });

    it('should not be interpreted as property of resource', function () {
      Object.keys(defaultResource).should.not.include('getLinks');
      defaultResource.hasOwnProperty('getLinks').should.be.false;
    });

    it('should be accessible even if overwritten', function () {
      var resource = new DefaultClient.Resource({
        data: { getLinks: "foo" },
        links: [ { rel: "self", href: "http://example.com/" } ]
      });
      resource.getLinks.should.equal('foo');
      resource.constructor.prototype.getLinks.should.be.an.instanceOf(Function);
      resource.constructor.prototype.getLinks.call(resource).should.eql(
        [ { rel: "self", href: "http://example.com/" } ]);
    });

    it('should return all links by default', function () {
      defaultResource.getLinks().should.eql([
        { rel: "self", href: "http://example.com/default" },
        { rel: "alternate", href: "http://example.com/resources/default" },
        { rel: "alternate", href: "http://example.com/v1/default" }
      ]);
    });

    it('should not be possible to modify the links', function () {
      defaultResource.getLinks().length.should.equal(3);
      var linksRef = defaultResource.getLinks();
      linksRef.pop();
      linksRef.length.should.equal(2);
      defaultResource.getLinks().length.should.equal(3);
    });

    it('should be able to filter links via filter iterator option', function () {
      defaultResource.getLinks({
        filter: function (link) { return link.rel.length % 2; }
      }).should.eql([
        { rel: "alternate", href: "http://example.com/resources/default" },
        { rel: "alternate", href: "http://example.com/v1/default" }
      ]);

      defaultResource.getLinks({
        filter: function (link) { return link.href.indexOf('resources') === -1; }
      }).should.eql([
        { rel: "self", href: "http://example.com/default" },
        { rel: "alternate", href: "http://example.com/v1/default" }
      ]);
    });

    it('should be able to filter links via where option', function () {
      defaultResource.getLinks({
        where: { rel: "self" }
      }).should.eql([
        { rel: "self", href: "http://example.com/default" }
      ]);

      defaultResource.getLinks({
        where: { rel: "alternate" }
      }).should.eql([
        { rel: "alternate", href: "http://example.com/resources/default" },
        { rel: "alternate", href: "http://example.com/v1/default" }
      ]);
    });

  });

  describe('Charon.Resource#getMeta', function () {
    it('should return the meta data provided to the constructor', function () {
      defaultResource.getMeta().should.eql({ lastModified: 'two weeks ago' });
    });
  });

});
