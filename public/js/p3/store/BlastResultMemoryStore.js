define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/Stateful', 'dojo/when', 'dojo/topic',
  'dojo/store/Memory', 'dojo/store/util/QueryResults'
], function (
  declare, lang, Deferred,
  request, Stateful, when, Topic,
  Memory, QueryResults
) {

  return declare([Memory, Stateful], {
    // baseQuery: {},

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      // console.log("onSetState", state, this);
      this.reload();
    },

    constructor: function (options) {
      this._loaded = false;
      this.topicId = options.topicId;

      // console.log("gf store created.", this.type, this.topicId);

      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    reload: function () {

      if (this._loadingDeferred && !this._loadingDeferred.isResolved()) {
        this._loadingDeferred.cancel('reloaded');
      }

      delete this._loadingDeferred;
      this._loaded = false;
      this.loadData();
      this.set('refresh');
    },

    query: function (query, opts) {
      query = query || {};
      if (this._loaded) {
        return this.inherited(arguments);
      }

      var results;
      var qr = QueryResults(when(this.loadData(), lang.hitch(this, function () {
        results = this.query(query, opts);
        qr.total = when(results, function (results) {
          return results.total || results.length;
        });
        return results;
      })));

      return qr;

    },

    get: function (id, opts) {
      if (this._loaded) {
        return this.inherited(arguments);
      }
      return when(this.loadData(), lang.hitch(this, function () {
        return this.get(id, opts);
      }));

    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      // console.warn("loadData", this.type, this.state);

      if (!this.state) {
        // console.log("No state, use empty data set for initial store");

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(this, function () {
          this.setData([]);
          this._loaded = true;
          // def.resolve(true);
        }), 0);
        return def.promise;
      }

      // call homology service

      var q = lang.mixin(this.state.query, {
        version: '1.1',
        id: String(Math.random()).slice(2)
      });

      this._loadingDeferred = when(request.post(window.App.homologyServiceURL, {
        headers: {
          Authorization: (window.App.authorizationToken || ''),
          Accept: 'application/json'
        },
        handleAs: 'json',
        data: JSON.stringify(q)
      }), lang.hitch(this, function (res) {

        if ((res.result[0][0].report.results.search.hits).length == 0) {
          this.setData([]);
          this._loaded = true;
          Topic.publish('BLAST_UI', 'showNoResultMessage');
          Topic.publish(this.topicId, 'hideLoadingMask');
          return;
        }

        // console.log(res);
        var resultIds = Object.keys(res.result[1]);
        var query = { rows: 25000 };
        if (this.type == 'genome_sequence') {
          resultIds = resultIds.map(function (d) {
            return d.replace('accn|', '');
          }).filter(function (d) {
            return d !== '';
          });
          query.q = 'accession:(' + resultIds.join(' OR ') + ')';
          query.fl = 'genome_id,genome_name,taxon_id,sequence_id,accession,description';
        } else if (this.type == 'genome_feature') {
          // resultIdField = "patric_id";

          var patric_ids = [];
          var refseq_locus_tags = [];
          resultIds.forEach(function (id) {
            if (id.indexOf('gi|') > -1) {
              refseq_locus_tags.push(id.split('|')[2]);
            } else {
              patric_ids.push(id);
            }
          });

          query.q = (patric_ids.length > 0) ? 'patric_id:(' + patric_ids.join(' OR ') + ')' : {};
          (refseq_locus_tags.length > 0 && patric_ids.length > 0) ? query.q += ' OR ' : {};
          (refseq_locus_tags.length > 0) ? query.q += '(refseq_locus_tag:(' + refseq_locus_tags.join(' OR ') + ') AND annotation:RefSeq)' : {};
          query.fl = 'feature_id,patric_id,genome_id,genome_name,refseq_locus_tag,pgfam_id,plfam_id,figfam_id,gene,product,annotation,feature_type,gene_id,taxon_id,accession,start,end,strand,location,na_length,na_sequence_md5,aa_length,aa_sequence_md5';
        } else if (this.type == 'specialty_genes') {

          var data = this.formatJSONResult(res);

          return when('', lang.hitch(this, function () {
            this.setData(data);
            this._loaded = true;

            Topic.publish(this.topicId, 'hideLoadingMask');
          }));
        }

        return when(request.post(window.App.dataAPI + this.type + '/', {
          handleAs: 'json',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/solrquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          data: query
        }), lang.hitch(this, function (keys) {

          var keyMap = {};
          keys.forEach(function (f) {
            if (this.type == 'genome_sequence') {
              keyMap[f.accession] = f;
            } else {
              if (f.annotation == 'RefSeq') {
                keyMap[f.refseq_locus_tag] = f;
              } else {
                keyMap[f.patric_id] = f;
              }
            }
          }, this);

          res.result[3] = keyMap;

          // console.log(JSON.stringify(res));
          var data = this.formatJSONResult(res);
          // console.log(data);
          // this.updateResult(data, resultIdType);
          this.setData(data);
          this._loaded = true;

          Topic.publish(this.topicId, 'hideLoadingMask');
        }));

      }), lang.hitch(this, function (err) {
        this.setData([]);
        this._loaded = true;
        Topic.publish('BLAST_UI', 'showErrorMessage', err);
        Topic.publish(this.topicId, 'hideLoadingMask');
      }));

      /* load feature level test data
      this._loadingDeferred = when('', lang.hitch(this, function(){
        var data = this.formatJSONResult(this.test_result_features(), "genome_feature");

        this.setData(data);
        this._loaded = true;

        Topic.publish(this.topicId, "hideLoadingMask");
      }));
      */

      /* load contig level test data
      this._loadingDeferred = when('', lang.hitch(this, function(){
        var data = this.formatJSONResult(this.test_result_contigs(), "genome_sequence");

        this.setData(data);
        this._loaded = true;

        Topic.publish(this.topicId, "hideLoadingMask");
      }));
      */

      return this._loadingDeferred;
    },

    formatEvalue: function (evalue) {
      if (evalue.toString().includes('e')) {
        var val = evalue.toString().split('e');
        return parseInt(val[0]) + 'e' + val[1];
      } else if (evalue !== 0) {
        return evalue.toFixed(4);
      }
      return evalue;

    },
    formatJSONResult: function (json) {
      // console.log(json);

      var report = json.result[0][0].report;
      var search = report.results.search;
      var hits = search.hits;
      var query_id = search.query_id;
      var query_length = search.query_len;
      var metadata = json.result[1];
      var identical = json.result[2] || {};
      var features = json.result[3] || {};

      var entries = [];
      hits.forEach(function (hit) {
        var target_id = hit.description[0].id;
        var m = Object.prototype.hasOwnProperty.call(metadata, target_id) ? metadata[target_id] : { genome_id: '', genome_name: '', 'function': '' };
        var entry = {
          qseqid: query_id,
          sseqid: target_id,
          pident: Math.round(hit.hsps[0].identity / hit.hsps[0].align_len * 100),
          query_coverage: Math.round((Math.abs(hit.hsps[0].query_to - hit.hsps[0].query_from) + 1) / query_length * 100),
          subject_coverage: Math.round((Math.abs(hit.hsps[0].hit_to - hit.hsps[0].hit_from) + 1) / hit.len * 100),
          length: hit.len,
          q_length: query_length,
          evalue: this.formatEvalue(hit.hsps[0].evalue),
          bitscore: Math.round(hit.hsps[0].bit_score),
          genome_id: m.genome_id,
          genome_name: m.genome_name,
          'function': m['function'],
          hit_from: hit.hsps[0].hit_from,
          hit_to: hit.hsps[0].hit_to,
          detail: {
            match_count: m.match_count || 0,
            matches: identical[target_id] || [],
            hsps: hit.hsps,
            query_len: query_length,
            subject_len: hit.len
          }
        };
        if (this.type === 'genome_feature') {
          if (Object.prototype.hasOwnProperty.call(features, target_id)) {
            entry.feature_id = features[target_id].feature_id;
            entry = lang.mixin(entry, features[target_id]);
          } else if (target_id.indexOf('gi|') > -1) {
            var refseq_locus_tag = target_id.split('|')[2];
            entry.feature_id = features[refseq_locus_tag].feature_id;
            entry = lang.mixin(entry, features[refseq_locus_tag]);
          } else {
            console.warn('missing patric_id in header', target_id);
          }
        } else if (this.type === 'genome_sequence') {
          target_id = target_id.replace('accn|', '');
          if (Object.prototype.hasOwnProperty.call(features, target_id)) {
            entry.genome_id = features[target_id].genome_id;
            entry = lang.mixin(entry, features[target_id]);
          } else {
            console.log('missing id: ', target_id);
          }
        } else if (this.type === 'specialty_genes') {
          if (Object.prototype.hasOwnProperty.call(metadata, target_id)) {
            var m = metadata[target_id];
            var org = hit.description[0].title.match(/\[(.*)\]/)[1];
            entry = lang.mixin(entry, { database: m.locus_tag, source_id: m.alt_locus_tag, organism: org });
            delete entry.genome_id;
            delete entry.genome_name;
          } else if (hit.description[0].title) {
            var title = hit.description[0].title;
            var id = title.split(' ')[0];
            var desc = title.split(' ')[1].split(' [')[0];
            var database = id.split('|')[0];
            var source_id = id.split('|')[1];
            var orgs = title.match(/\[(.*)\]/);
            var org = (orgs) ? orgs[1] : '';
            entry = lang.mixin(entry, {
              database: database, source_id: source_id, organism: org, function: desc
            });
            delete entry.genome_id;
            delete entry.genome_name;
          } else {
            console.log('missing id: ', target_id);
          }
        }
        entries.push(entry);
      }, this);
      return entries;
    },

    test_result_features: function () {
      var r = '{"result":[[{"report":{"params":{"filter":"L;m;","gap_extend":0,"gap_open":0,"sc_match":1,"sc_mismatch":-2,"expect":10},"program":"blastn","reference":"Zheng Zhang, Scott Schwartz, Lukas Wagner, and Webb Miller (2000), A greedy algorithm for aligning DNA sequences, J Comput Biol 2000; 7(1-2):203-14.","version":"BLASTN 2.3.0+","search_target":{"db":"/tmp/jQOG0oo9Tp"},"results":{"search":{"stat":{"kappa":0.46,"entropy":0.85,"lambda":1.28,"eff_space":76986597324,"hsp_len":26,"db_num":328432,"db_len":290541420},"query_len":299,"hits":[{"len":1119,"description":[{"title":"fig|83332.12.peg.1009|Rv0906|VBIMycTub87468_1009|   Outer membrane protein romA   [Mycobacterium tuberculosis H37Rv | 83332.12]","accession":"312432","id":"fig|83332.12.peg.1009"}],"num":1,"hsps":[{"hit_to":240,"num":1,"query_from":57,"identity":240,"qseq":"ATGGTGCGCCGAGCGCTACGACTGGCGGCCGGCACCGCCTCGCTGGCCGCCGGCACGTGGACTGTTGCGTGCGCTGCACGGCACGCCGGCCGCGCTCGGTGCCGACGCGGCGTCGATCAGGAGCTGTGTCGGAGCAATCGCCGAACTATCGTGACGGCGCCTTCGTCAACCTGGATCCCGCGATCGATGTTCACCCTGGATCGCGAGGAGCTTCGGCTCATCGTGTGGGAGTTAGTGGCCAGA","query_to":299,"align_len":243,"midline":"|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||","bit_score":429.543,"query_strand":"Plus","evalue":3.81139e-119,"hit_from":1,"gaps":3,"hseq":"ATGGTGCGCCGAGCGCTACGACTGGCGGCCGGCACCGCCTCGCTGGCCGCCGGCACGTGG-CTGTTGCGTGCGCTGCACGGCACGCCGGCCGCGCTCGGTGCCGACGCGGCGTCGATCAGG-GCTGTGTCGGAGCAATCGCCGAACTATCGTGACGGCGCCTTCGTCAACCTGGATCCCGCG-TCGATGTTCACCCTGGATCGCGAGGAGCTTCGGCTCATCGTGTGGGAGTTAGTGGCCAGA","hit_strand":"Plus","score":232}]},{"hsps":[{"align_len":243,"bit_score":429.543,"midline":"|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||","query_strand":"Plus","hit_from":1,"gaps":3,"evalue":3.81139e-119,"hit_strand":"Plus","score":232,"hseq":"ATGGTGCGCCGAGCGCTACGACTGGCGGCCGGCACCGCCTCGCTGGCCGCCGGCACGTGG-CTGTTGCGTGCGCTGCACGGCACGCCGGCCGCGCTCGGTGCCGACGCGGCGTCGATCAGG-GCTGTGTCGGAGCAATCGCCGAACTATCGTGACGGCGCCTTCGTCAACCTGGATCCCGCG-TCGATGTTCACCCTGGATCGCGAGGAGCTTCGGCTCATCGTGTGGGAGTTAGTGGCCAGA","num":1,"hit_to":240,"query_from":57,"identity":240,"query_to":299,"qseq":"ATGGTGCGCCGAGCGCTACGACTGGCGGCCGGCACCGCCTCGCTGGCCGCCGGCACGTGGACTGTTGCGTGCGCTGCACGGCACGCCGGCCGCGCTCGGTGCCGACGCGGCGTCGATCAGGAGCTGTGTCGGAGCAATCGCCGAACTATCGTGACGGCGCCTTCGTCAACCTGGATCCCGCGATCGATGTTCACCCTGGATCGCGAGGAGCTTCGGCTCATCGTGTGGGAGTTAGTGGCCAGA"}],"len":1119,"description":[{"title":"fig|233413.5.peg.1011|Mb0930|VBIMycBov88188_1011|   Outer membrane protein romA   [Mycobacterium bovis AF2122/97 | 233413.5]","id":"fig|233413.5.peg.1011","accession":"132773"}],"num":2}],"query_masking":[{"from":18,"to":33}],"query_id":"Query_1"}}}}],{"fig|83332.12.peg.1009":{"function":"Outer membrane protein romA","alt_locus_tag":"VBIMycTub87468_1009","genome_id":"83332.12","locus_tag":"Rv0906","genome_name":"Mycobacterium tuberculosis H37Rv"},"fig|233413.5.peg.1011":{"function":"Outer membrane protein romA","genome_id":"233413.5","alt_locus_tag":"VBIMycBov88188_1011","locus_tag":"Mb0930","genome_name":"Mycobacterium bovis AF2122/97"}},null,{"fig|83332.12.peg.1009":{"location":"1008944..1010062","gene_id":885150,"accession":"NC_000962","start":1008944,"feature_id":"PATRIC.83332.12.NC_000962.CDS.1008944.1010062.fwd","sequence_id":"NC_000962","annotation":"PATRIC","product":"Outer membrane protein romA","genome_id":"83332.12","figfam_id":"FIG01371060","uniprotkb_accession":["I6XWJ0","P64759"],"gi":15608046,"p2_feature_id":18150533,"pos_group":"NC_000962:1010062:+","alt_locus_tag":"VBIMycTub87468_1009","na_length":1119,"strand":"+","refseq_locus_tag":"Rv0906","segments":["1008944..1010062"],"feature_type":"CDS","taxon_id":83332,"protein_id":"NP_215421.1","aa_length":372,"patric_id":"fig|83332.12.peg.1009","end":1010062,"genome_name":"Mycobacterium tuberculosis H37Rv","public":true,"owner":"PATRIC","date_inserted":"2014-10-20T23:55:03.806Z","date_modified":"2014-10-27T07:44:09.673Z","aa_sequence_md5":"78bc6158e03f08557fc918cd8634140d","pgfam_id":"PGF_00028347","plfam_id":"PLF_1763_00000156"},"fig|233413.5.peg.1011":{"location":"1009409..1010527","gene_id":1092857,"accession":"NC_002945","start":1009409,"feature_id":"PATRIC.233413.5.NC_002945.CDS.1009409.1010527.fwd","sequence_id":"NC_002945","annotation":"PATRIC","product":"Outer membrane protein romA","genome_id":"233413.5","figfam_id":"FIG01371060","uniprotkb_accession":["P64760"],"gi":31792094,"p2_feature_id":18003706,"pos_group":"NC_002945:1010527:+","alt_locus_tag":"VBIMycBov88188_1011","na_length":1119,"strand":"+","refseq_locus_tag":"Mb0930","segments":["1009409..1010527"],"feature_type":"CDS","taxon_id":233413,"protein_id":"NP_854587.1","aa_length":372,"patric_id":"fig|233413.5.peg.1011","end":1010527,"genome_name":"Mycobacterium bovis AF2122/97","public":true,"owner":"PATRIC","date_inserted":"2014-10-20T20:19:41.13Z","date_modified":"2014-10-27T06:55:37.908Z","aa_sequence_md5":"78bc6158e03f08557fc918cd8634140d","pgfam_id":"PGF_00028347","plfam_id":"PLF_1763_00000156"}}],"version":"1.1","id":"9067495661058316"}';

      return JSON.parse(r);
    },

    test_result_contigs: function () {
      var r = '{"result":[[{"report":{"results":{"search":{"query_masking":[{"from":18,"to":33}],"query_id":"Query_1","stat":{"db_len":336225811,"db_num":184,"hsp_len":26,"eff_space":91788340371,"lambda":1.28,"entropy":0.85,"kappa":0.46},"query_len":299,"hits":[{"hsps":[{"hseq":"ATGGTGCGCCGAGCGCTACGACTGGCGGCCGGCACCGCCTCGCTGGCCGCCGGCACGTGG-CTGTTGCGTGCGCTGCACGGCACGCCGGCCGCGCTCGGTGCCGACGCGGCGTCGATCAGG-GCTGTGTCGGAGCAATCGCCGAACTATCGTGACGGCGCCTTCGTCAACCTGGATCCCGCG-TCGATGTTCACCCTGGATCGCGAGGAGCTTCGGCTCATCGTGTGGGAGTTAGTGGCCAGA","score":232,"hit_strand":"Plus","evalue":4.54418e-119,"gaps":3,"hit_from":1008944,"midline":"|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||","bit_score":429.543,"align_len":243,"query_strand":"Plus","identity":240,"query_to":299,"qseq":"ATGGTGCGCCGAGCGCTACGACTGGCGGCCGGCACCGCCTCGCTGGCCGCCGGCACGTGGACTGTTGCGTGCGCTGCACGGCACGCCGGCCGCGCTCGGTGCCGACGCGGCGTCGATCAGGAGCTGTGTCGGAGCAATCGCCGAACTATCGTGACGGCGCCTTCGTCAACCTGGATCCCGCGATCGATGTTCACCCTGGATCGCGAGGAGCTTCGGCTCATCGTGTGGGAGTTAGTGGCCAGA","query_from":57,"hit_to":1009183,"num":1}],"len":4411532,"description":[{"title":"accn|NC_000962   Mycobacterium tuberculosis H37Rv, complete genome.   [Mycobacterium tuberculosis H37Rv | 83332.12]","accession":"177","id":"accn|NC_000962"}],"num":1},{"len":4345492,"description":[{"title":"accn|NC_002945   Mycobacterium bovis AF2122/97, complete genome.   [Mycobacterium bovis AF2122/97 | 233413.5]","id":"accn|NC_002945","accession":"91"}],"num":2,"hsps":[{"num":1,"hit_to":1009648,"query_from":57,"query_to":299,"qseq":"ATGGTGCGCCGAGCGCTACGACTGGCGGCCGGCACCGCCTCGCTGGCCGCCGGCACGTGGACTGTTGCGTGCGCTGCACGGCACGCCGGCCGCGCTCGGTGCCGACGCGGCGTCGATCAGGAGCTGTGTCGGAGCAATCGCCGAACTATCGTGACGGCGCCTTCGTCAACCTGGATCCCGCGATCGATGTTCACCCTGGATCGCGAGGAGCTTCGGCTCATCGTGTGGGAGTTAGTGGCCAGA","identity":240,"query_strand":"Plus","align_len":243,"bit_score":429.543,"midline":"|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||","gaps":3,"hit_from":1009409,"evalue":4.54418e-119,"score":232,"hit_strand":"Plus","hseq":"ATGGTGCGCCGAGCGCTACGACTGGCGGCCGGCACCGCCTCGCTGGCCGCCGGCACGTGG-CTGTTGCGTGCGCTGCACGGCACGCCGGCCGCGCTCGGTGCCGACGCGGCGTCGATCAGG-GCTGTGTCGGAGCAATCGCCGAACTATCGTGACGGCGCCTTCGTCAACCTGGATCCCGCG-TCGATGTTCACCCTGGATCGCGAGGAGCTTCGGCTCATCGTGTGGGAGTTAGTGGCCAGA"}]}]}},"search_target":{"db":"/tmp/6jvELydBA_"},"version":"BLASTN 2.3.0+","reference":"Zheng Zhang, Scott Schwartz, Lukas Wagner, and Webb Miller (2000), A greedy algorithm for aligning DNA sequences, J Comput Biol 2000; 7(1-2):203-14.","program":"blastn","params":{"filter":"L;m;","gap_extend":0,"sc_match":1,"gap_open":0,"sc_mismatch":-2,"expect":10}}}],{"accn|NC_002945":{"function":"Mycobacterium bovis AF2122/97, complete genome.","genome_id":"233413.5","genome_name":"Mycobacterium bovis AF2122/97"},"accn|NC_000962":{"function":"Mycobacterium tuberculosis H37Rv, complete genome.","genome_id":"83332.12","genome_name":"Mycobacterium tuberculosis H37Rv"}},null,{"NC_002945":{"accession":"NC_002945","sequence_id":"NC_002945","taxon_id":233413,"genome_id":"233413.5","genome_name":"Mycobacterium bovis AF2122/97"},"NC_000962":{"accession":"NC_000962","sequence_id":"NC_000962","taxon_id":83332,"genome_id":"83332.12","genome_name":"Mycobacterium tuberculosis H37Rv"}}],"id":"20166393994618526","version":"1.1"}';
      return JSON.parse(r);
    }
  });
});
