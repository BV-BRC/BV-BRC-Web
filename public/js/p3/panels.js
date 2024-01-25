define([], function () {

  return {
    reportProblem: {
      title: 'Contact Us',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/ReportProblem',
      requireAuth: false,
      params: {}
    },
    CEIRRDataSubmission: {
      title: 'CEIRR Data Submission',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/app/CEIRRDataSubmission',
      params: {}
    },
    CreateWorkspace: {
      title: 'Create Workspace',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/CreateWorkspace',
      dataParam: 'userId',
      requireAuth: true,
      params: {}
    },
    CreateFolder: {
      title: 'Create Folder',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/CreateFolder',
      dataParam: 'path',
      requireAuth: true,
      params: {}
    },
    Upload: {
      title: 'Upload',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/Uploader',
      requireAuth: true,
      dataParam: 'path',
      params: { multiple: true }

    },
    UploadReplace: {
      title: 'Overwrite File',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/Uploader',
      requireAuth: true,
      params: { overwrite: true }
    },

    Search: {
      title: 'Search',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/GlobalSearch',
      params: {
        style: 'width:600px;font-size:1.3em;border:1px solid #ddd;'
      }
    },

    BLAST: {
      title: 'BLAST',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/app/BLAST',
      params: {}
    },

    SubspeciesClassification: {
      title: 'Subspecies Classification',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/app/SubspeciesClassification',
      params: {}
    },

    SequenceSubmission: {
      title: 'Sequence Submission',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/app/SequenceSubmission',
      params: {}
    },

    HASubtypeNumberingConversion: {
      title: 'HA Subtype Numbering Conversion',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/app/HASubtypeNumberingConversion',
      params: {}
    },

    GenomeGroupViewer: {
      title: 'Genome Group',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/viewer/GenomeList',
      params: {}
    },

    help: {
      title: 'PATRIC Help',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/Help',
      dataParam: 'helpId'
    }
  };
});
