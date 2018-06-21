define([
  'dojo/_base/declare',
  'dojo/topic', 'dojo/on', 'dojo/dom', 'dojo/dom-class', 'dojo/dom-attr', 'dojo/dom-construct',
  'dijit/registry', 'dojo/request',
  'dojo/_base/Deferred',
  'dojo/store/JsonRest',
  'dojo/ready', './app'
], function (
  declare,
  Topic, on, dom, domClass, domAttr, domConstruct,
  Registry, xhr,
  Deferred,
  JsonRest,
  Ready, App
) {
  return App;
});
