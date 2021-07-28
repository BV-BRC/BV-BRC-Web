define([
  'dojo/_base/declare',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dojo/string',
  'dijit/layout/ContentPane',
  'dijit/Tooltip',
  'dijit/form/Select',
  'dojo/data/ObjectStore',
  'dojo/_base/lang',
  'dojo/request',
  'dojo/text!../templates/proteinStructure/ProteinStructureDisplayControls.html',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dgrid/List',
  'dgrid/Selection',
  '../../util/dataStoreHelpers'
], function (
  declare,
  domConstruct,
  domStyle,
  string,
  ContentPane,
  ToolTip,
  Select,
  ObjectStore,
  lang,
  request,
  templateString,
  Templated,
  WidgetsInTemplateMixin,
  List,
  Selection,
  dataStoreHelper
) {
  return declare( [ContentPane, Templated, WidgetsInTemplateMixin], {
    baseClass: 'ProteinStructureDisplayControl',
    displayType: '',
    displayTypeInfo: {},
    zoomLevel: 100,
    accessionId: null,
    effect: {},
    templateString: templateString,
    displayTypeStore: null,
    proteinStore: null,
    zoomLevels: new Map( [
      ['Custom', 'custom'],
      ['50%', '50'],
      ['100%', '100'],
      ['150%', '150'],
      ['200%', '200'],
      ['400%', '400']
    ]),
    postCreate: function () {
      this.inherited(arguments);

      // console.log(this.id + '.postCreate displayTypeInfo is ' + JSON.stringify(this.get('displayTypeInfo')));

      this.proteinSelect.renderArray(['6VXX', '6M0J', '6VYB', '6W41']);


      if (this.get('accessionId')) {
        this.proteinSelect.setSelected(this.get('accessionId'));
        this.proteinSelectionLabel.innerHTML = this.get('accessionId');
      }
      this.watch('accessionId', lang.hitch(this, function (attr, oldValue, newValue) {
        // console.log('%s.accessionId changed to %s', this.id, newValue);
        this.proteinSelect.setSelected(newValue);
        this.proteinSelectionLabel.innerHTML = this.get('accessionId');
      }));
      this.proteinSelect.on('dgrid-select', lang.hitch(this, function (evt) {
        let accessionId = evt.rows[0].data;
        this.set('accessionId', accessionId);
      }));

      // domConstruct.place(this.proteinSelect.domNode, this.proteinSelectionContainer);

      this.displayTypeStore.fetch({
        query: { id: '*' },
        // eslint-disable-next-line no-unused-vars
        onComplete: lang.hitch(this, function (items, request) {
          var displayTypes = [];
          for (let item of items) {
            displayTypes.push(dataStoreHelper.storeItemToRecord(this.displayTypeStore, item));
          }
          // console.log('%s found %s displayTypes', this.id, displayTypes.length);
          this.displayTypeSelector.renderArray(displayTypes);
        })
      });

      this.displayTypeSelector.on('dgrid-select', lang.hitch(this, function (evt) {
        var displayTypeId = null;
        for (let row of evt.rows) {
          displayTypeId =  row.data.id;
        }
        this.set('displayType', displayTypeId);
      }));

      this.displayTypeDescription = new ToolTip({
        id: this.id + '_typeDescription',
        connectId: [this.displayTypeIcon],
        label: 'Hi, this is a tooltip',
      });

      if (this.get('displayType') && this.get('displayTypeInfo')) {
        // let displayTypeInfo = this.get('displayTypeInfo');
        // console.log('DisplayControl setting displayType to ' + displayTypeInfo.id);
        this.updateDisplayTypeInfo(this.get('displayTypeInfo'));
      }
      this.watch('displayTypeInfo', lang.hitch(this, this.onDisplayTypeChange));

      // check if zoomLevel is in normal options, otherwise change to custom and set custom value
      this.displayZoom.renderArray(Array.from(this.zoomLevels.keys()));
      let zoomSet = false;
      /* eslint-disable-next-line no-unused-vars */
      for (let [zoomKey, zoomValue] of this.zoomLevels ) {
        if (zoomValue == this.zoomLevel) {
          this.displayZoom.setSelected(this.zoomLevel);
          zoomSet = true;
        }
      }
      if ( !zoomSet) {
        this.displayZoom.setSelected('Custom');

        domStyle.set(this.displayZoomCustomContainer, 'visibility', 'visible');
        this.displayZoomCustom.set('value', this.zoomLevel);
      }

      this.displayZoom.on('dgrid-select', lang.hitch(this, function (evt) {
        var zoomLevel = evt.rows[0].data;
        // console.log('DisplayControl zoom level is ' + zoomLevel);
        if ( zoomLevel == 'Custom' ) {
          domStyle.set(this.displayZoomCustomContainer, 'visibility', 'visible');
        } else {
          domStyle.set(this.displayZoomCustomContainer, 'visibility', 'hidden');
          this.set('zoomLevel', this.zoomLevels.get(zoomLevel));
        }
      }));

      this.displayZoomCustom.on('change', lang.hitch(this, function () {
        var zoomLevel = this.displayZoomCustom.get('value');
        // console.log('DisplayControl custom zoom level is ' + zoomLevel);
        this.set('zoomLevel', zoomLevel);
      }));

      this.spinButton.on('change', lang.hitch(this, function () {
        var checked = this.spinButton.get('checked');
        if (checked) {
          if (this.rockButton.get('checked')) {
            this.rockButton.set('checked', false);
          }
          this.set('effect', { id: 'spin', startScript: 'spin on;', stopScript: 'spin off;' });
          // console.log('would add spin');
        } else if ( !this.rockButton.get('checked')) {
          this.set('effect', {});
          // console.log('would remove spin');
        }
      }));
      this.rockButton.on('change', lang.hitch(this, function () {
        var checked = this.rockButton.get('checked');
        if (checked) {
          if (this.spinButton.get('checked')) {
            this.spinButton.set('checked', false);
          }
          // console.log('would add rock');
          var speed = this.getOrSetDefault('rockSpeed');
          var angle = this.getOrSetDefault('rockAngle');
          var pause = this.getOrSetDefault('rockPause');
          this.set('effect', { id: 'rock', startScript: this.getRockScript(angle, speed, pause), stopScript: 'quit;' });
        } else if ( !this.spinButton.get('checked')) {
          this.set('effect', {});
          // console.log('would remove rock');
        }
      }));

      // TODO we should figure out how to handle or at least display errors
      // when running code
      this.commandRun.on('click', lang.hitch(this, function () {
        var scriptText = this.commandEntry.get('value');
        // console.log('script to run is ' + scriptText);
        this.set('scriptText', scriptText);
      }));
      this.commandClear.on('click', lang.hitch(this, function () {
        this.commandEntry.set('value', '');
      }));

    },
    getOrSetDefault: function (attrName) {
      var formField = this[attrName];
      var value = formField.get('value');
      // console.log(attrName + ' value=' + value + ' valid=' + formField.isValid());
      // this doesn't handle valid 0 value
      if ( !( formField.isValid() && value)) {
        value = this.effectDefaults[attrName];
        formField.set('value', value);
      }
      return value;
    },
    getRockScript: function (angle, speed, pause) {
      const frames = 50;
      const step_delay = (1 / frames);
      const step_size = (step_delay * speed);
      var stepnum = Math.floor( angle * frames / speed);

      return string.substitute(this.rockTemplate, {
        stepnum: stepnum,
        delay: pause,
        step_delay: step_delay,
        step_size: step_size,
        stepnum3: stepnum * 3,
        stepnum4: stepnum * 4,
        maxDelayStepNum: (stepnum * 3) - 1,
        minDelayStepNum: (stepnum - 1)
      });
    },
    onDisplayTypeChange: function (attr, oldValue, newValue) {
      // console.log(this.id + '.displayType went from ' + JSON.stringify(oldValue) + ' to ' + JSON.stringify(newValue));
      this.updateDisplayTypeInfo(newValue);
    },
    effectDefaults: {
      rockSpeed: 30,
      rockAngle: 12,
      rockPause: 0.0
    },
    rockTemplate: [
      'for (var j=0; j<=99; j=j+1)',
      '  for (var i=0; i< ${stepnum4}; i=i+1)',
      '    delay ${step_delay};',
      '    if (i < ${stepnum})',
      '      rotate axisangle {0 1 0} ${step_size};',
      '    endif',
      '    if (i >= ${stepnum} && i< ${stepnum3})',
      '      rotate axisangle {0 1 0} -${step_size};',
      '    endif',
      '    if (i >= ${stepnum3} )',
      '      rotate axisangle {0 1 0} ${step_size};',
      '    endif',
      '    if ( ${delay} > 0 )',
      '      if (i == ${minDelayStepNum} or i == ${maxDelayStepNum} )',
      '        delay ${delay};',
      '      endif',
      '    endif',
      '  end for',
      'end for'
    ].join('\n'),
    updateDisplayTypeInfo: function (displayType) {
      if (displayType) {
        if (displayType.id != this.get('displayType')) {
          this.set('displayType', displayType.id);
        }

        domConstruct.empty(this.displayTypeIcon);
        if (displayType.icon) {
          // console.log('creating icon ' + displayType.icon);
          domConstruct.create('img',
            {
              src: '/public/js/p3/resources/jsmol/' + displayType.icon,
              class: 'proteinStructure-action',
            }, this.displayTypeIcon, 'last');
        }
        if (displayType.description) {
          var helpURL = '/public/js/p3/resources/jsmol/' + displayType.description;
          // console.log('updating description to ' + helpURL);
          request.get(helpURL).then(lang.hitch(this, function (data) {
            // console.log('setting displayType description text');
            this.displayTypeDescription.set('label', '<div style="max-width: 500px;">' + data + '</div>');
          }));
        }
      }
    }
  });
});
