define([
  'dojo/_base/declare',
  './PriorityPathogenGrid'
], function (
  declare,
  PriorityPathogenGrid
) {

  // Module-level cache: accession -> Promise<genome_id|null>
  // One HTTP request per unique accession across the whole session.
  var _genomeIdCache = {};

  function lookupGenomeId(accession) {
    if (!(accession in _genomeIdCache)) {
      var base = (window.App && window.App.dataAPI) || 'https://www.bv-brc.org/api/';
      if (base[base.length - 1] !== '/') { base += '/'; }
      var url = base + 'genome/?eq(genbank_accessions,' + encodeURIComponent(accession) + ')' +
                '&select(genome_id)&limit(1)';
      _genomeIdCache[accession] = fetch(url, { headers: { accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          return (data && data.length > 0) ? String(data[0].genome_id) : null;
        })
        .catch(function () { return null; });
    }
    return _genomeIdCache[accession];
  }

  var ACCESSION_HEADER_RE = /genbank accession/i;

  function renderAccessionCell(object, value) {
    var wrapper = document.createElement('span');
    if (!value || !value.trim()) {
      return wrapper;
    }
    wrapper.title = value.trim();

    // Cells may hold one or more accessions: "KF356051" or "AF008668; CY113469"
    var parts = value.split(';');
    parts.forEach(function (part, i) {
      part = part.trim();
      if (!part) { return; }

      if (i > 0) {
        wrapper.appendChild(document.createTextNode('; '));
      }

      var node = document.createElement('span');
      node.textContent = part;
      wrapper.appendChild(node);

      lookupGenomeId(part).then(function (genomeId) {
        if (!genomeId || !node.parentNode) { return; }
        var a = document.createElement('a');
        a.href = 'https://www.bv-brc.org/view/Genome/' + genomeId;
        a.textContent = part;
        a.title = part;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        node.parentNode.replaceChild(a, node);
      });
    });

    return wrapper;
  }

  return declare([PriorityPathogenGrid], {
    _postProcessColumn: function (colDef, rank, header /* , key */) {
      this.inherited(arguments);
      if (ACCESSION_HEADER_RE.test(header)) {
        colDef.renderCell = renderAccessionCell;
      }
    }
  });
});
