define("p3/panels", [], function () {

  return {
    quickstart: {
      title: 'PATRIC Quickstart',
      ctor: 'dijit/layout/ContentPane',
      params: {
        content: '<iframe width="945" height="480" src="https://www.youtube.com/embed/K3eL4i9vQBo" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe><br><a href="/public/patric/patric_quickstart.txt"><i class="fa icon-file-text fa-2x"/><span class="normal"> Text format</span></a>'
      }
    },
    reportProblem: {
      title: 'Provide Feedback',
      layer: 'p3/layer/panels',
      ctor: 'p3/widget/ReportProblem',
      requireAuth: false,
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
