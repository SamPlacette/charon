var nock = require('nock');
var should = require('should');
var sinon = require('sinon');
var _ = require('underscore');

var Charon = require('../index.js');


describe('Charon.Link', function () {

  // test constructor
  // test constructor with relative URL
  // test constructor with url template
  // test constructor with template processor override
});

describe('Charon.urlTemplateProcessors', function () {

  describe('expressUrlTemplateProcessor', function () {
    var processUrlTemplate = Charon.urlTemplateProcessors.expressProcessor;
    var urlTemplate = "/foo/:fooId/bar/:barId";

    it('should replace placeholders with data from params', function () {
      processUrlTemplate(urlTemplate, { fooId: 5, barId: 42 })
        .should.equal("/foo/5/bar/42");
    });

    it('should use empty strings if no data in params', function () {
      processUrlTemplate(urlTemplate, { fooId: 5 })
        .should.equal("/foo/5/bar/");
      processUrlTemplate(urlTemplate, { barId: 42 })
        .should.equal("/foo//bar/42");
      processUrlTemplate(urlTemplate, {})
        .should.equal("/foo//bar/");
    });

    it('should not get stuck in circular loop', function () {
      processUrlTemplate(urlTemplate, { fooId: ":barId", barId: ":barId" })
        .should.equal("/foo/:barId/bar/:barId");
    });

    it('should accept a filename extension after a placeholder', function () {
      var urlTemplateWithExtension = urlTemplate + ".json";
      processUrlTemplate(urlTemplateWithExtension, { fooId: 5, barId: 42 })
        .should.equal("/foo/5/bar/42.json");
    });

  });

});
