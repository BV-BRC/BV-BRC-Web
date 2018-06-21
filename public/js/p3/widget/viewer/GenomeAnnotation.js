define([
  'dojo/_base/declare', './JobResult'
], function (declare, JobResult) {
  return declare([JobResult], {
    containerType: 'GenomeAnnotation',
    getGenomeId: function () {
      var id;
      this._resultObjects.some(function (o) {
        if (o.type == 'genome') {
          // console.log("[GenomeAnnotation] Genome Object: ", o);
          id = o.autoMeta.genome_id;
          // console.log("[GenomeAnnotation] Id: ", id);
          return true;
        }
        return false;
      });
      if (id) {
        return id;
      }
      throw Error('Missing ID');
    },
    setupResultType: function () {
      // console.log("[GenomeAnnotation] setupResultType()");
      if (this.data.autoMeta.app.id) {
        this._resultType = this.data.autoMeta.app.id;
      }
      this._appLabel = this._resultType;
      this._resultMetaTypes = { genome: { label: 'Genome' } };
      this._autoLabels = {
        num_features: { label: 'Feature count' },
        scientific_name: { label: 'Organism' },
        domain: { label: 'Domain' },
        genome_id: { label: 'Annotation ID' }
      };
    },
    getExtraMetaDataForHeader: function (job_output) {
      Object.keys(this._resultMetaTypes).forEach(function (metaType) {
        // console.log("[GenomeAnnotation] _resultMetaTypes:",metaType);

        // add additional types to bubble up to the header
        if (metaType == 'genome') {

          var bubbleUpMeta;
          this._resultObjects.some(function (o) {
            if (o.type == metaType) {
              bubbleUpMeta = o.autoMeta;
              return true;
            }
            return false;
          });

          if (bubbleUpMeta) {
            var subRecord = [];
            Object.keys(this._autoLabels).forEach(function (prop) {
              // console.log("[GenomeAnnotation] _autoLabels:",prop);
              if (!bubbleUpMeta[prop] || prop == 'inspection_started') {
                return;
              }
              var label = Object.prototype.hasOwnProperty.call(this._autoLabels, prop) ? this._autoLabels[prop].label : prop;
              subRecord.push(label + ' (' + bubbleUpMeta[prop] + ')');
            }, this);

            // console.log("[GenomeAnnotation] subRecord:",subRecord.join(","));
            job_output.push('<tr class="alt"><th scope="row" style="width:20%"><b>' + this._resultMetaTypes[metaType].label + '</b></th><td class="last">' + subRecord.join(', ') + '</td></tr>');
          }
        }

      }, this);

      return job_output;
    }
  });
});
