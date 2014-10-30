'use strict';
/* global module, __dirname */

var Marionette = require('marionette-client');

function Ftu(client) {
  this.client = client;
  this.actions = new Marionette.Actions(this.client);
}

Ftu.clientOptions = {
  prefs: {
    'focusmanager.testmode': true,
    'dom.w3c_touch_events.enabled': 1
  },
  settings: {
    'lockscreen.enabled': false,
    'time.timezone': undefined
  }
};

/**
 * @type String Origin of Ftu app
 */
Ftu.URL = 'app://ftu.gaiamobile.org';

Ftu.Selectors = {
  'activationScreen': '#activation-screen',
  'languagePanel': '#languages',
  'wifiPanel': '#wifi',
  'targetRegion': '[role="region"]:target',
  'forwardButton': '#forward'
};

var _mocksDir = __dirname + '/../mocks';
Ftu.MocksPaths = {
  'navigator.mozIccManager':  _mocksDir +'/mock_navigator_moz_icc_manager.js',
  'navigator.onLine':   _mocksDir +'/mock_navigator_online.js',
  'mozIcc': _mocksDir + '/mock_moz_icc.js',
};

console.log('Ftu.MocksPaths: ', JSON.stringify(Ftu.MocksPaths, null, 2));

Ftu.prototype = {
  get forwardButton() {
    return this.client.findElement(Ftu.Selectors.forwardButton);
  },
  get currentPanel() {
    return this.client.findElement(Ftu.Selectors.targetRegion);
  },
  updateMozSettings: function(settingNameValues) {
    this.client.executeAsyncScript(function(nameValues) {
      var mozSettings = document.defaultView.wrappedJSObject
          .navigator.mozSettings;
      var req = mozSettings.createLock().set(nameValues);
      req.onsuccess = req.onerror = function() {
        marionetteScriptFinished();
      };
    },[settingNameValues]);
  },
  launch: function() {
    var client = this.client;

    client.apps.launch(Ftu.URL);
    client.apps.switchToApp(Ftu.URL);
    client.helper.waitForElement(Ftu.Selectors.activationScreen);
  },
  getPanel: function(panel) {
    return this.client.helper.waitForElement(
      Ftu.Selectors[panel + 'Panel']);
  },

  clickThruPanel: function(panel_id, button_id) {
    if (panel_id == '#wifi') {
      // The wifi panel will bring up a screen to show it is scanning for
      // networks. Not waiting for this to clear will blow test timing and cause
      // things to fail.
      this.client.helper.waitForElementToDisappear('#loading-overlay');
    }
    // waitForElement is used to make sure animations and page changes have
    // finished, and that the panel is displayed.
    this.client.helper.waitForElement(panel_id);
    if (button_id) {
      var button = this.client.helper.waitForElement(button_id);
      button.click();
    }
  },

  tapNext: function(readyCondition) {
    var currentId = this.currentPanel && this.currentPanel.getAttribute('id');
    this.actions.tap(this.forwardButton).perform();
    this.client.waitFor(readyCondition || function() {
      return this.currentPanel &&
             this.currentPanel.getAttribute('id') !== currentId;
    }.bind(this));
    this.client.helper.waitForElementToDisappear('#loading-overlay');
  }
};

module.exports = Ftu;
