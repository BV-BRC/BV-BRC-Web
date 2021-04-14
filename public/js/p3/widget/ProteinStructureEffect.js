define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/string',
  'dojo/dom-construct',
  'dojo/text!./templates/ProteinStructureEffect.html',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/layout/ContentPane',
], function (
  declare,
  lang,
  string,
  domConstruct,
  templateString,
  Templated,
  WidgetsInTemplateMixin,
  ContentPane
) {
  return declare([ContentPane, Templated, WidgetsInTemplateMixin],
    {
      id:'proteinStructureEffect',
      templateString: templateString,
      effect: null,
      defaults: {
        rockSpeed: 10,
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
      postCreate: function () {
        console.log('calling ' + this.id + '.postCreate');
        this.spinButton.on('change', lang.hitch(this, function () {
          var checked = this.spinButton.get('checked');
          if (checked) {
            if (this.rockButton.get('checked')) {
              this.rockButton.set('checked', false);
            }
            this.set('effect', { id: 'spin', startScript: 'spin on;', stopScript: 'spin off;' });
            console.log('would add spin');
          } else if ( !this.rockButton.get('checked')) {
            this.set('effect', {});
            console.log('would remove spin');
          }
        }));
        this.rockButton.on('change', lang.hitch(this, function () {
          var checked = this.rockButton.get('checked');
          if (checked) {
            if (this.spinButton.get('checked')) {
              this.spinButton.set('checked', false);
            }
            console.log('would add rock');
            var speed = this.getOrSetDefault('rockSpeed');
            var angle = this.getOrSetDefault('rockAngle');
            var pause = this.getOrSetDefault('rockPause');
            this.set('effect', { id: 'rock', startScript: this.getRockScript(angle, speed, pause), stopScript: 'quit;' });
          } else if ( !this.spinButton.get('checked')) {
            this.set('effect', {});
            console.log('would remove rock');
          }
        }));
      },
      getOrSetDefault: function (attrName) {
        var formField = this[attrName];
        var value = formField.get('value');
        console.log(attrName + ' value=' + value + ' valid=' + formField.isValid());
        // this doesn't handle valid 0 value
        if ( !( formField.isValid() && value)) {
          value = this.defaults[attrName];
          formField.set('value', value);
        }
        return value;
      },
      getRockScript: function(angle, speed, pause) {
        const step_delay = (1 / 50);
        const step_size = (step_delay * speed);
        var stepnum = Math.floor( angle * 50/speed);
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
      }
    });
});
