'use strict';

var assert = require('assert');
var Ftu = require('./lib/ftu');

marionette('First Time Use > Navigation Flow', function() {
  var ftu;
  var client = marionette.client(Ftu.clientOptions);

  suite('No SIM, no timezone, no network', function(){
    setup(function() {
      ftu = new Ftu(client);
      client.contentScript.inject(Ftu.MocksPaths['navigator.mozIccManager']);
      client.contentScript.inject(Ftu.MocksPaths['navigator.onLine']);
      ftu.launch();
    });
    //
    test('Sequence', function() {
      var result = client.executeAsyncScript(function remoteScript() {
        var navigator = window.wrappedJSObject.navigator;
        var mozIccManager = navigator.mozIccManager;
        var result = {
          iccIds: mozIccManager.iccIds,
          onLine: navigator.onLine
        };
        var req = navigator.mozSettings.createLock().get('time.timezone');
        req.onsuccess = function() {
          result.timezone = req.result['time.timezone'];
          marionetteScriptFinished(result);
        };
        req.onerror = function() {
          marionetteScriptFinished(result);
        };
      });
      // sanity checks
      assert.equal(result.iccIds.length, 0,
                  'mock mozIccManager should have 0 iccIds');
      assert(!result.onLine,
             'navigator.onLine should be falsey');
      assert(!result.timezone,
             'time.timezone setting should be falsey');

      // click the primary call-to-action button to advance to next screen
      console.log('No SIM, tapNext to get to #wifi');
      ftu.tapNext();
      assert(client.helper.waitForElement('#wifi'));

      console.log('No timezone, tapNext to get to #date_and_time');
      ftu.tapNext();
      assert(client.helper.waitForElement('#date_and_time'));

      ftu.tapNext();
      assert(client.helper.waitForElement('#geolocation'));

      ftu.tapNext();
      assert(client.helper.waitForElement('#import_contacts'));

      ftu.tapNext();
      assert(client.helper.waitForElement('#welcome_browser'));

      ftu.tapNext();
      assert(client.helper.waitForElement('#browser_privacy'));

      ftu.tapNext(function() {
        return client.findElement('#finish-screen').displayed();
      });
    });
  });

  suite('Timezone available', function(){
    // test that:
    // when time.timezone setting has a value, we skip date/time screen
    // time.timezone would normally be populated from the network
    setup(function() {
      ftu = new Ftu(client);
      client.contentScript.inject(Ftu.MocksPaths['navigator.mozIccManager']);
      client.contentScript.inject(Ftu.MocksPaths['navigator.onLine']);
      ftu.launch();
      ftu.updateMozSettings({
        'time.timezone' : 'UTC-07:00'
      });
    });

    test('Sequence', function() {
      var result = client.executeAsyncScript(function remoteScript() {
        var navigator = window.wrappedJSObject.navigator;
        var mozIccManager = navigator.mozIccManager;
        var result = {
          iccIds: mozIccManager.iccIds,
          onLine: navigator.onLine
        };
        var req = navigator.mozSettings.createLock().get('time.timezone');
        req.onsuccess = function() {
          result.timezone = req.result['time.timezone'];
          marionetteScriptFinished(result);
        };
        req.onerror = function() {
          marionetteScriptFinished(result);
        };
      });
      assert(result.timezone,
             'time.timezone setting should be truthy');

      // click the primary call-to-action button to advance to next screen
      console.log('No SIM, tapNext to get to #wifi');
      ftu.tapNext();
      assert(client.helper.waitForElement('#wifi'));

      console.log('Have timezone, tapNext skips #date_and_time');
      ftu.tapNext();
      console.log('currentPanel: ', ftu.currentPanel.getAttribute('id'));
      assert(client.helper.waitForElement('#geolocation'));

      ftu.tapNext();
      assert(client.helper.waitForElement('#import_contacts'));

      ftu.tapNext();
      assert(client.helper.waitForElement('#welcome_browser'));

      ftu.tapNext();
      assert(client.helper.waitForElement('#browser_privacy'));

      ftu.tapNext(function() {
        return client.findElement('#finish-screen').displayed();
      });
    });
  });

});