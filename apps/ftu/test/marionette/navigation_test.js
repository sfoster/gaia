'use strict';

var assert = require('assert');
var Ftu = require('./lib/ftu');

marionette('First Time Use > Navigation Flow', function() {
  var ftu;
  var client = marionette.client(Ftu.clientOptions);

  suite('Single SIM', function() {
    setup(function() {
      ftu = new Ftu(client);
      console.log('injecting mock navigator.mozIccManager');
      client.contentScript.inject(Ftu.MocksPaths['navigator.mozIccManager']);
      console.log('launching ftu app');
      ftu.launch();
    });
    test('IccManager mock', function() {
      var testsData = [
        { expected: 1, title: 'mock mozIccManager should have 1 iccIds' }
      ];
      console.log('IccManager mock test, executeAsyncScript');
      var results = client.executeAsyncScript(function(tests) {
        console.log('in executeAsyncScript, typeof navigator.mozIccManager:',
                    navigator.mozIccManager);
        navigator.mozIccManager.iccIds = [{ name: 'Foo' }];
        var remaining = tests.length;
        var results = new Array(tests.length);

        function testComplete() {
          if (--remaining <= 0) {
            marionetteScriptFinished(results);
          }
        }

        tests.forEach(function(data, i) {
          results[i] = data.expected === navigator.mozIccManager.iccIds.length;
          testComplete();
        });
      }, testsData);

      console.log('IccManager mock test, /executeAsyncScript');
      assert(results[0], testsData[0].title);
    });
  });

  suite('No SIM', function() {
   setup(function() {
      ftu = new Ftu(client);
      client.contentScript.inject(Ftu.MocksPaths['navigator.mozIccManager']);
      ftu.launch();
    });

    // test that, with 0 sim we get the right sequence of screens
    test('No SIM', function() {
      // click the primary call-to-action button to advance to next screen
      // FIXME: assert that we have no SIM
      ftu.tapNext();
      assert(client.helper.waitForElement('#wifi'));
    });
  });

});