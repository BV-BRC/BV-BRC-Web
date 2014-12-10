define("cid/widget/TaxonomyTreeViewer", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dijit/layout/BorderContainer",
	"dojo/dom-class", "dojo/store/Memory",
	"dijit/tree/ObjectStoreModel", "dijit/Tree"

], function(
	declare, WidgetBase, on,BorderContainer,
	domClass,Memory,
	ObjectStoreModel, Tree
){

    // Create test store, adding the getChildren() method required by ObjectStoreModel
    var myStore = new Memory({
        data: [
            { id: 'world', name:'The earth', type:'planet', population: '6 billion'},
            { id: 'AF', name:'Africa', type:'continent', population:'900 million', area: '30,221,532 sq km',
                    timezone: '-1 UTC to +4 UTC', parent: 'world'},
                { id: 'EG', name:'Egypt', type:'country', parent: 'AF' },
                { id: 'KE', name:'Kenya', type:'country', parent: 'AF' },
                    { id: 'Nairobi', name:'Nairobi', type:'city', parent: 'KE' },
                    { id: 'Mombasa', name:'Mombasa', type:'city', parent: 'KE' },
                { id: 'SD', name:'Sudan', type:'country', parent: 'AF' },
                    { id: 'Khartoum', name:'Khartoum', type:'city', parent: 'SD' },
            { id: 'AS', name:'Asia', type:'continent', parent: 'world' },
                { id: 'CN', name:'China', type:'country', parent: 'AS' },
                { id: 'IN', name:'India', type:'country', parent: 'AS' },
                { id: 'RU', name:'Russia', type:'country', parent: 'AS' },
                { id: 'MN', name:'Mongolia', type:'country', parent: 'AS' },
            { id: 'OC', name:'Oceania', type:'continent', population:'21 million', parent: 'world'},
            { id: 'EU', name:'Europe', type:'continent', parent: 'world' },
                { id: 'DE', name:'Germany', type:'country', parent: 'EU' },
                { id: 'FR', name:'France', type:'country', parent: 'EU' },
                { id: 'ES', name:'Spain', type:'country', parent: 'EU' },
                { id: 'IT', name:'Italy', type:'country', parent: 'EU' },
            { id: 'NA', name:'North America', type:'continent', parent: 'world' },
            { id: 'SA', name:'South America', type:'continent', parent: 'world' }
        ],
        getChildren: function(object){
            return this.query({parent: object.id});
        }
    });

	// Create the model
	var myModel = new ObjectStoreModel({
		store: myStore,
		query: {id: 'world'}
	});

	var TaxonTree = declare([Tree], {
		"class": "TaxonomyTreeViewer",
		model: myModel
	});

	return declare([BorderContainer], {
		postCreate: function(){
			this.inherited(arguments);
			this.addChild(new TaxonTree({region: "center"}));
		}
	});

});
