/* global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

function MockMozIccManager() {
  this.iccIds = [];
}

MockMozIccManager.prototype = {
  mMozIcc0: null,
  mMozIcc1: null,

  getIccById: function(id) {
    return this['mMozIcc' + id];
  }
};

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;

  Object.defineProperty(window.wrappedJSObject.navigator, 'mozIccManager', {
    configurable: false,
    writable: true,
    value: Components.utils.cloneInto(new MockMozIccManager(), window, {
      cloneFunctions: true
    })
  });
}, 'document-element-inserted', false);
