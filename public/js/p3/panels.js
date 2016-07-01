define([], function(){

	return {
		CreateWorkspace: {
			title: "Create Workspace",
			layer: "p3/layer/panels",
			ctor: "p3/widget/CreateWorkspace",
			dataParam: "userId",
			params: {}
		},
		CreateFolder: {
			title: "Create Folder",
			layer: "p3/layer/panels",
			ctor: "p3/widget/CreateFolder",
			dataParam: "path",
			params: {}
		},
		Upload: {
			title: "Upload",
			layer: "p3/layer/panels",
			ctor: "p3/widget/Uploader",
			dataParam: "path",
			params: {multiple: true}

		},
		UploadReplace: {
			title: "Overwrite File",
			layer: "p3/layer/panels",
			ctor: "p3/widget/Uploader",
			params: {overwrite: true}
		},

		Search: {
			title: "Search",
			layer: "p3/layer/panels",
			ctor: "p3/widget/GlobalSearch",
			params: {
				style: "width:600px;font-size:1.3em;border:1px solid #ddd;"
			}
		},


		BLAST: {
			title: "BLAST",
			layer: "p3/layer/panels",
			ctor: "p3/widget/app/BLAST",
			params: {}
		},




		GenomeGroupViewer: {
			title: "Genome Group",
			layer: "p3/layer/panels",
			ctor: "p3/widget/viewer/GenomeList",
			params: {}
		}
	}
});
