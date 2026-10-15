define([
  'dojo/_base/Deferred',
  '../DataAPI',
  '../WorkspaceManager'
], function (
  Deferred,
  DataAPI,
  WorkspaceManager
) {
  var SEGMENT_LABELS = {
    influenza_ab: {
      '1': 'PB2',
      '2': 'PB1',
      '3': 'PA',
      '4': 'HA',
      '5': 'NP',
      '6': 'NA',
      '7': 'MP',
      '8': 'NS'
    },
    influenza_cd: {
      '1': 'PB2',
      '2': 'PB1',
      '3': 'P3',
      '4': 'HEF',
      '5': 'NP',
      '6': 'M',
      '7': 'NS'
    }
  };

  function normalizeSegment(segment) {
    if (segment === null || segment === undefined) {
      return '';
    }

    if (typeof segment !== 'string') {
      segment = String(segment);
    }

    return segment.trim();
  }

  function parseSegmentList(segmentValue) {
    var raw = normalizeSegment(segmentValue);

    if (!raw) {
      return [];
    }

    return raw.split(',').map(function (segment) {
      return normalizeSegment(segment);
    }).filter(function (segment) {
      return !!segment;
    }).filter(function (segment, idx, arr) {
      return arr.indexOf(segment) === idx;
    });
  }

  function getSegmentLabelScheme(item) {
    var name = [item && item.species, item && item.genome_name]
      .filter(function (value) {
        return !!value;
      })
      .join(' ')
      .toLowerCase();

    if (/alphainfluenzavirus|betainfluenzavirus|influenza [ab] virus/.test(name)) {
      return 'influenza_ab';
    }
    if (/gammainfluenzavirus|deltainfluenzavirus|influenza [cd] virus/.test(name)) {
      return 'influenza_cd';
    }

    return null;
  }

  function getSegmentDisplayInfo(segment, labelScheme) {
    var normalized = normalizeSegment(segment);
    var upper = normalized.toUpperCase();
    var labelMap = SEGMENT_LABELS[labelScheme] || {};
    var name = labelMap[normalized] || '';
    var sortGroup = 2;
    var sortValue = upper;

    if (/^\d+$/.test(normalized)) {
      sortGroup = 0;
      sortValue = parseInt(normalized, 10);
    } else if ({ S: true, M: true, L: true }[upper]) {
      sortGroup = 1;
      sortValue = { S: 0, M: 1, L: 2 }[upper];
    }

    return {
      value: normalized,
      label: name ? normalized + ' (' + name + ')' : normalized,
      shortName: name,
      sortGroup: sortGroup,
      sortValue: sortValue
    };
  }

  function sortSegments(segments, labelScheme) {
    return (segments || [])
      .map(function (segment) {
        return getSegmentDisplayInfo(segment, labelScheme);
      })
      .sort(function (a, b) {
        if (a.sortGroup !== b.sortGroup) {
          return a.sortGroup - b.sortGroup;
        }
        if (a.sortValue < b.sortValue) {
          return -1;
        }
        if (a.sortValue > b.sortValue) {
          return 1;
        }
        return 0;
      });
  }

  function parseGenomeGroupObject(obj) {
    var data = obj && obj.data;

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {
        data = null;
      }
    }

    if (!data || !data.id_list || !Array.isArray(data.id_list.genome_id)) {
      return [];
    }

    return data.id_list.genome_id.slice();
  }

  function classifyGenomeItems(items) {
    var genomeCount = 0;
    var availableSegments = [];
    var availableSegmentLabels = [];
    var seenSegments = {};
    var hasSegmentedGenome = false;
    var hasMissingSegments = false;
    var genomeSegmentSets = [];
    var segmentGenomeCounts = {};
    var segmentLabelScheme = null;
    var hasUnknownOrMixedScheme = false;

    (items || []).forEach(function (item) {
      if (item && item.genome_id !== undefined && item.genome_id !== null) {
        genomeCount++;
      }

      var segments = parseSegmentList(item && item.segment);
      if (!segments.length) {
        genomeSegmentSets.push([]);
        return;
      }

      hasSegmentedGenome = true;
      genomeSegmentSets.push(segments);
      var itemLabelScheme = getSegmentLabelScheme(item);
      if (!itemLabelScheme) {
        hasUnknownOrMixedScheme = true;
      } else if (!segmentLabelScheme) {
        segmentLabelScheme = itemLabelScheme;
      } else if (segmentLabelScheme !== itemLabelScheme) {
        hasUnknownOrMixedScheme = true;
      }
      segments.forEach(function (segment) {
        segmentGenomeCounts[segment] = (segmentGenomeCounts[segment] || 0) + 1;
        if (!seenSegments[segment]) {
          seenSegments[segment] = true;
          availableSegments.push(segment);
        }
      });
    });

    if (hasUnknownOrMixedScheme) {
      segmentLabelScheme = null;
    }

    availableSegments = sortSegments(availableSegments, segmentLabelScheme);

    availableSegmentLabels = availableSegments.map(function (segmentInfo) {
      return segmentInfo.label;
    });
    availableSegments = availableSegments.map(function (segmentInfo) {
      return segmentInfo.value;
    });

    if (availableSegments.length) {
      hasMissingSegments = genomeSegmentSets.some(function (segments) {
        if (!segments.length) {
          return true;
        }

        return availableSegments.some(function (segment) {
          return segments.indexOf(segment) === -1;
        });
      });
    }

    return {
      genome_count: genomeCount,
      segmentation_mode: hasSegmentedGenome ? 'segmented' : 'unsegmented',
      segment_label_scheme: segmentLabelScheme,
      available_segments: availableSegments,
      available_segment_labels: availableSegmentLabels,
      segment_genome_counts: segmentGenomeCounts,
      segments_missing_in_some_genomes: availableSegments.filter(function (segment) {
        return (segmentGenomeCounts[segment] || 0) < genomeCount;
      }),
      has_missing_segments: hasMissingSegments
    };
  }

  function combineClassifications(classifications) {
    var combined = {
      genome_count: 0,
      available_segments: [],
      available_segment_labels: [],
      segment_genome_counts: {},
      segments_missing_in_some_genomes: [],
      has_missing_segments: false,
      segmentation_mode: 'unsegmented',
      segment_label_scheme: null
    };
    var seenSegments = {};
    var segmentLabelSchemes = [];

    (classifications || []).forEach(function (classification) {
      combined.genome_count += classification.genome_count || 0;
      if ((classification.available_segments || []).length) {
        segmentLabelSchemes.push(classification.segment_label_scheme || null);
      }
      (classification.available_segments || []).forEach(function (segment) {
        combined.segment_genome_counts[segment] = (combined.segment_genome_counts[segment] || 0)
          + ((classification.segment_genome_counts && classification.segment_genome_counts[segment]) || 0);
        if (!seenSegments[segment]) {
          seenSegments[segment] = true;
          combined.available_segments.push(segment);
        }
      });
    });

    if (segmentLabelSchemes.length && segmentLabelSchemes.every(function (scheme) {
      return scheme && scheme === segmentLabelSchemes[0];
    })) {
      combined.segment_label_scheme = segmentLabelSchemes[0];
    }

    var segmentInfo = sortSegments(combined.available_segments, combined.segment_label_scheme);
    combined.available_segments = segmentInfo.map(function (segment) {
      return segment.value;
    });
    combined.available_segment_labels = segmentInfo.map(function (segment) {
      return segment.label;
    });
    combined.segmentation_mode = combined.available_segments.length ? 'segmented' : 'unsegmented';
    combined.segments_missing_in_some_genomes = combined.available_segments.filter(function (segment) {
      return (combined.segment_genome_counts[segment] || 0) < combined.genome_count;
    });
    combined.has_missing_segments = combined.segments_missing_in_some_genomes.length > 0;

    return combined;
  }

  function fetchGenomeGroupClassification(path) {
    var def;

    if (!path) {
      def = new Deferred();
      def.resolve(classifyGenomeItems([]));
      return def;
    }

    return WorkspaceManager.getObject(path).then(function (res) {
      var genomeIds = parseGenomeGroupObject(res);

      if (!genomeIds.length) {
        return classifyGenomeItems([]);
      }

      var query = 'in(genome_id,(' + genomeIds.join(',') + '))';
      query += '&select(genome_id,segment,species,genome_name)';
      query += '&limit(' + genomeIds.length + ')';

      return DataAPI.queryGenomes(query).then(function (response) {
        return classifyGenomeItems(response && response.items ? response.items : []);
      });
    });
  }

  return {
    classifyGenomeItems: classifyGenomeItems,
    combineClassifications: combineClassifications,
    fetchGenomeGroupClassification: fetchGenomeGroupClassification,
    getSegmentDisplayInfo: getSegmentDisplayInfo,
    sortSegments: sortSegments
  };
});
