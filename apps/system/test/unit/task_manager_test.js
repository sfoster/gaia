/* global MockStackManager, MockNavigatorSettings, MockAppWindowManager,
          TaskManager, Card, TaskCard, AppWindow,
          MockScreenLayout, MocksHelper,
          TaskCarouselUI, TaskStripUI
*/
'use strict';
require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');
requireApp('system/test/unit/mock_utility_tray.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_rocketbar.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForTaskManager = new MocksHelper([
  'GestureDetector',
  'ScreenLayout',
  'TrustedUIManager',
  'UtilityTray',
  'AppWindowManager',
  'Rocketbar',
  'sleepMenu',
  'OrientationManager',
  'StackManager',
  'AppWindow',
  'System'
]).init();

function waitForEvent(target, name, timeout) {
  if (isNaN(timeout)) {
    timeout = 250;
  }
  var promise = new window.Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('Timeout exceeded waiting for ' + name));
    }, timeout);
    target.addEventListener(name, function onEvent(evt){
      clearTimeout(timer);
      target.removeEventListener(name, onEvent);
      console.log('waitForEvent, resolving with event: ', evt.type);
      resolve(evt);
    });
  });
  return promise;
}

function failOnReject(err) {
  throw err;
}

suite('system/TaskManager >', function() {
  var fakeInnerHeight = 200;

  var screenNode, windowsNode, realMozLockOrientation, realScreenLayout,
      realMozSettings, realSettingsListener;
  var cardsView, cardsList;
  var originalLockScreen;
  var ihDescriptor;

  function createTouchEvent(type, target, x, y) {
    var touch = document.createTouch(window, target, 1, x, y, x, y);
    var touchList = document.createTouchList(touch);

    var evt = document.createEvent('TouchEvent');
    evt.initTouchEvent(type, true, true, window,
                       0, false, false, false, false,
                       touchList, touchList, touchList);
    return evt;
  }

  function sendHoldhome() {
    var evt = new CustomEvent('holdhome', { });
    window.dispatchEvent(evt);
  }

  function sendAppopen(detail) {
    detail = detail || {
      manifestURL: 'http://sms.gaiamobile.org/manifest.webapp',
      origin: 'http://sms.gaiamobile.org',
      isHomescreen: false
    };
    var evt = new CustomEvent('appopen', { detail: detail });
    window.dispatchEvent(evt);
  }

  var apps;
  var sms, game, game2, game3, game4;
  var taskManager;

  mocksForTaskManager.attachTestHelpers();
  suiteSetup(function cv_suiteSetup(done) {
    apps = {
      'http://sms.gaiamobile.org': new AppWindow({
        launchTime: 5,
        name: 'SMS',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'portrait-primary'
        },
        rotatingDegree: 0,
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://sms.gaiamobile.org',
        blur: function() {}
      }),
      'http://game.gaiamobile.org': new AppWindow({
        launchTime: 4,
        name: 'GAME',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape-primary'
        },
        rotatingDegree: 90,
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://game.gaiamobile.org',
        blur: function() {}
      }),
      'http://game2.gaiamobile.org': new AppWindow({
        launchTime: 3,
        name: 'GAME2',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape-secondary'
        },
        rotatingDegree: 270,
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://game2.gaiamobile.org',
        blur: function() {}
      }),
      'http://game3.gaiamobile.org': new AppWindow({
        launchTime: 2,
        name: 'GAME3',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'landscape'
        },
        rotatingDegree: 90,
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://game3.gaiamobile.org',
        blur: function() {}
      }),
      'http://game4.gaiamobile.org': new AppWindow({
        launchTime: 1,
        name: 'GAME4',
        frame: document.createElement('div'),
        iframe: document.createElement('iframe'),
        manifest: {
          orientation: 'portrait-secondary'
        },
        rotatingDegree: 180,
        requestScreenshotURL: function() {
          return null;
        },
        getScreenshot: function(callback) {
          callback();
        },
        origin: 'http://game4.gaiamobile.org',
        blur: function() {}
      })
    };

    sms = new AppWindow({
      instanceID: 'AppWindow-0',
      launchTime: 5,
      name: 'SMS',
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 0,
      origin: 'http://sms.gaiamobile.org',
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      blur: function() {}
    });

    game = new AppWindow({
      instanceID: 'AppWindow-1',
      launchTime: 5,
      name: 'GAME',
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 90,
      origin: 'http://game.gaiamobile.org',
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      blur: function() {}
    });

    game2 = new AppWindow({
      instanceID: 'AppWindow-2',
      launchTime: 5,
      name: 'GAME2',
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 270,
      origin: 'http://game2.gaiamobile.org',
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      blur: function() {}
    });

    game3 = new AppWindow({
      instanceID: 'AppWindow-3',
      launchTime: 5,
      name: 'GAME3',
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 90,
      origin: 'http://game3.gaiamobile.org',
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      blur: function() {}
    });

    game4 = new AppWindow({
      instanceID: 'AppWindow-4',
      launchTime: 5,
      name: 'GAME4',
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
      manifest: {
        orientation: 'portrait-primary'
      },
      rotatingDegree: 180,
      origin: 'http://game4.gaiamobile.org',
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      blur: function() {}
    });

    ihDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerHeight', {
      value: fakeInnerHeight,
      configurable: true
    });

    screenNode = document.createElement('div');
    screenNode.id = 'screen';
    windowsNode = document.createElement('div');
    windowsNode.id = 'windows';

    cardsView = document.createElement('div');
    cardsView.id = 'cards-view';

    cardsList = document.createElement('ul');
    cardsList.id = 'cards-list';
    cardsView.appendChild(cardsList);

    screenNode.appendChild(cardsView);
    screenNode.appendChild(windowsNode);
    document.body.appendChild(screenNode);

    realScreenLayout = window.ScreenLayout;
    window.ScreenLayout = MockScreenLayout;
    realMozLockOrientation = screen.mozLockOrientation;
    screen.mozLockOrientation = sinon.stub();

    realMozSettings = navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
    // dont reset the mock between tests
    MockNavigatorSettings.mSetup = function() {};
    MockNavigatorSettings.mTeardown = function() {};

    // init with minimum default settings
    MockNavigatorSettings
      .mSettings['app.cards_view.screenshots.enabled'] = true;
    MockNavigatorSettings.mSyncRepliesOnly = true;

    realSettingsListener = window.SettingsListener;
    // minimal mock for SettingsListener
    window.SettingsListener = {
      observe: function(name, defaultValue, callback) {
        MockNavigatorSettings.addObserver(name, function(event) {
          callback(event.settingValue);
        });
      },
      getSettingsLock: function() {
        return MockNavigatorSettings.createLock();
      }
    };


    requireApp('system/js/cards_helper.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/task_carousel_ui.js');
    requireApp('system/js/task_strip_ui.js');
    requireApp('system/js/card.js');
    requireApp('system/js/task_card.js');

    requireApp('system/js/task_manager.js', function() {
      // normally done by bootstrap
      taskManager = new TaskManager();
      taskManager.start();
      done();
    });

  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'innerHeight', ihDescriptor);
    window.lockScreen = originalLockScreen;
    screenNode.parentNode.removeChild(screenNode);
    window.ScreenLayout = realScreenLayout;
    screen.mozLockOrientation = realMozLockOrientation;
    navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
  });

  suite('sanity check > ', function() {
    test('instantiable TaskManager', function(){
      assert.isTrue(taskManager instanceof window.TaskManager,
                  'taskManager instanceof TaskManager');
      var anotherTaskManager = new TaskManager();
      assert.isTrue(anotherTaskManager instanceof window.TaskManager,
                  'taskManager instanceof TaskManager');
      assert.notEqual(anotherTaskManager, taskManager,
                      'TaskManager not expected to exhibit Singleton behavior');
    });
    test('instantiable Cards', function(){
      var card = new Card();
      var taskCard = new TaskCard();
      assert.ok(card && card instanceof window.Card,
                  'Card instantiation');
      assert.ok(taskCard && taskCard instanceof window.TaskCard,
                  'TaskCard instantiation');
    });
  });

  suite('settings > ', function() {

    teardown(function() {
      taskManager.hide(true);
      cardsList.innerHTML = '';
    });

    test('isTaskStrip tracks taskstrip.enabled setting', function() {
      // var withRocketBar = new TaskManager();
      MockNavigatorSettings.mTriggerObservers('taskstrip.enabled',
                                              { settingValue: true });
      assert.isTrue(taskManager.isTaskStrip,
                    'isTaskStrip is true when setting goes true');

      taskManager.isTaskStrip = true;
      MockNavigatorSettings.mTriggerObservers('taskstrip.enabled',
                                              { settingValue: false });
      assert.isFalse(taskManager.isTaskStrip,
                    'isTaskStrip is false when setting goes false');
    });

    test('creates TaskCarouselUI instance when isTaskStrip is false',
    function(){
      taskManager.isTaskStrip = false;
      var listUI = taskManager._createListUI();
      assert.ok(listUI && listUI instanceof TaskCarouselUI,
                'creates TaskCarouselUI instance when isTaskStrip is false');
    });

    test('creates TaskStripUI instance when isTaskStrip is true', function(){
      taskManager.isTaskStrip = true;
      var listUI = taskManager._createListUI();
      assert.ok(listUI && listUI instanceof TaskStripUI,
                'creates TaskStripUI instance when isTaskStrip is false');
    });

    suite('screenshots settings >', function() {
      var SETTING_KEY;
      suiteSetup(function() {
        SETTING_KEY = TaskManager.prototype.SCREENSHOT_PREVIEWS_SETTING_KEY;
      });

      // taskManager should've added an observer when it started
      test('observes setting at startup', function() {
        var observers = MockNavigatorSettings.mObservers[SETTING_KEY];
        assert.equal(observers.length, 1,
          'exactly one observer is watching ' + SETTING_KEY);
      });

      test('observes setting updates', function() {
        var event = { settingValue: false };
        MockNavigatorSettings.mTriggerObservers(SETTING_KEY, event);
        assert.ok(!taskManager.useAppScreenshotPreviews,
          'useAppScreenshotPreviews is false when setting is false');

        event = { settingValue: true };
        MockNavigatorSettings.mTriggerObservers(SETTING_KEY, event);
        assert.ok(taskManager.useAppScreenshotPreviews,
          'useAppScreenshotPreviews is true when setting is true');
      });

    });

  });

  suite('populated task manager >', function() {
    suiteTeardown(function() {
      taskManager.hide(true);

      cardsList.innerHTML = '';
    });

    suiteSetup(function() {
      MockStackManager.mStack = [];
      for (var app in apps) {
        MockStackManager.mStack.push(apps[app]);
      }
      MockStackManager.mCurrent = 0;

      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mDisplayedApp = 'http://sms.gaiamobile.org';
    });

    suite('display cardsview >', function() {
      setup(function(done) {
        taskManager.hide(true);
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        taskManager.onTaskStripEnabled(false);
        taskManager.show();
      });

      teardown(function() {
        taskManager.hide(true);
      });

      test('fetch elements', function() {
        assert.equal(taskManager.listUI.element, cardsView);
        assert.equal(taskManager.listUI.cardsList, cardsList);
        assert.equal(taskManager.listUI.screenElement, screenNode);
      });

      test('cardsview should be active', function() {
        assert.isTrue(taskManager.isShown(), 'taskManager.isShown');
        assert.isTrue(screenNode.classList.contains('cards-view'));
      });

      test('cardsview shouldnt display no recent apps message', function() {
        assert.isFalse(cardsView.classList.contains('empty'));
      });

      test('initial state', function() {
        assert.equal(taskManager.currentPosition, 0,
                    'initial position should be 0');
        assert.equal(taskManager.listUI.currentDisplayed, 0, 0,
                    'currentDisplayed should be 0');
        assert.ok(taskManager.listUI.currentCard,
                  'has a truthy currentCard property');
        assert.ok(taskManager.listUI.nextCard,
                  'has a truthy nextCard property');
        assert.ok(!taskManager.listUI.prevCard,
                  'has no prevCard at initial position');
      });

      test('transitions are removed correctly after swiping', function() {
        var card = taskManager.listUI.getCardAtIndex(0);
        var applyStyleStub = this.sinon.spy(card, 'applyStyle');

        var undefinedProps =
          function(value) {
            for (var key in value) {
              if (typeof value[key] === 'undefined') {
                return true;
              }
            }
            return false;
          };

        // Simulate a drag up that doesn't remove the card
        var element = card.element;
        element.dispatchEvent(createTouchEvent('touchstart', element, 0, 500));
        element.dispatchEvent(createTouchEvent('touchmove', element, 0, 250));
        element.dispatchEvent(createTouchEvent('touchend', element, 0, 450));

        var callCount = applyStyleStub.callCount;
        assert.isTrue(callCount > 0,
                      'card.applyStyle was called at least once');
        assert.isFalse(applyStyleStub.calledWith(sinon.match(undefinedProps)),
          'card.applyStyle was not called with undefined properties');

        // Simulate a swipe to the side
        element.dispatchEvent(createTouchEvent('touchstart', element, 0, 500));
        element.dispatchEvent(createTouchEvent('touchmove', element, 100, 500));
        element.dispatchEvent(createTouchEvent('touchend', element, 100, 500));

        assert.isTrue(applyStyleStub.callCount > callCount,
                      'card.applyStyle was called more times');
        assert.isFalse(applyStyleStub.calledWith(sinon.match(undefinedProps)),
          'card.applyStyle was not called with undefined properties');
      });

      test('user can change swipe direction', function() {
        var currentCard = taskManager.listUI.currentCard;

        // Simulate a swipe that goes to one side, then back again
        var el = currentCard.element;
        el.dispatchEvent(createTouchEvent('touchstart', el, 200, 500));
        el.dispatchEvent(createTouchEvent('touchmove', el, 0, 500));
        el.dispatchEvent(createTouchEvent('touchmove', el, 50, 500));
        el.dispatchEvent(createTouchEvent('touchend', el, 100, 500));

        assert.isTrue(currentCard == taskManager.listUI.currentCard,
                      'current card remains unchanged');
      });

      suite('when the currently displayed app is out of the stack',
      function() {
        setup(function() {
          MockStackManager.mOutOfStack = true;
          MockStackManager.mStack = [
            apps['http://sms.gaiamobile.org'],
            apps['http://game.gaiamobile.org'],
            apps['http://game2.gaiamobile.org']
          ];
          MockStackManager.mCurrent = 1;
          taskManager.show();
        });

        teardown(function() {
          MockStackManager.mOutOfStack = false;
        });

        test('currentPosition should be the last position in the stack',
        function() {
          assert.equal(taskManager.currentPosition, 2);
        });
      });
    });

    suite('display cardsview via holdhome >', function() {
      setup(function(done) {
        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        sendHoldhome();
      });

      teardown(function() {
        taskManager.hide(true);
      });

      test('cardsview should be active', function() {
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());
      });
    });

    suite('populated task manager using task strip >', function() {
      setup(function(done) {
        taskManager.onTaskStripEnabled(true);
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        taskManager.show();
      });

      teardown(function() {
        taskManager.hide(true);
      });

      test('has correct classes', function() {
        console.log('has correct classes: ', screenNode.className);
        assert.isTrue(screenNode.classList.contains('task-manager'));
      });

    });

  });

  suite('empty task manager >', function() {
    setup(function() {
      MockStackManager.mStack = [];
      MockStackManager.mCurrent = -1;
    });

    teardown(function() {
      taskManager.hide(true);
    });

    test('when isTaskStrip is true, empty task manager closes', function(done) {
      var events = [];
      function onOutcome() {
        assert.equal(events.length, 1, 'sanity check, only one event received');
        assert.equal(events[0],
                    'cardviewclosed',
                    'cardviewclosed event raised when shown with empty stack');
        assert.isFalse(cardsView.classList.contains('active'));
        assert.isFalse(taskManager.isShown());
      }
      window.Promise.race([
        waitForEvent(window, 'cardviewclosed').then(function() {
          events.push('cardviewclosed');
        }, failOnReject),
        waitForEvent(window, 'cardviewshown').then(function() {
          events.push('cardviewshown');
        }, failOnReject)
      ]).then(onOutcome, onOutcome)
        .then(done, done);

      // Haida/rocketbar mode: taskManager aborts show when empty
      taskManager.onTaskStripEnabled(true);
      taskManager.show();
    });

    test('when isTaskStrip is false, empty task manager opens', function(done) {
      var events = [];
      window.Promise.race([
        waitForEvent(window, 'cardviewclosed').then(function() {
          events.push('cardviewclosed');
        }, failOnReject),
        waitForEvent(window, 'cardviewshown').then(function() {
          events.push('cardviewshown');
        }, failOnReject)
      ]).then(function() {
        assert.equal(events.length, 1, 'sanity check, only one event received');
        assert.equal(events[0],
                    'cardviewshown',
                    'cardviewshown event raised when shown with empty stack');
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());
        done();
      }, failOnReject);
      // Pre-Haida/Cardsview mode: taskManager shows empty message
      taskManager.onTaskStripEnabled(false);
      taskManager.show();
    });

    suite('display empty cardsview >', function() {
      setup(function(done) {
        assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
        waitForEvent(window, 'cardviewshown')
          .then(function() { done(); }, failOnReject);
        taskManager.show();
      });

      test('on touchstart, empty cardsview is closed and back to home screen',
      function(done) {
        var events = [];
        assert.isTrue(cardsView.classList.contains('empty'));
        assert.isTrue(cardsView.classList.contains('active'));
        assert.isTrue(taskManager.isShown());

        waitForEvent(window, 'cardviewclosedhome').then(function(){
          events.push('cardviewclosedhome');
        }, failOnReject).then(function() {
          assert.equal(events.length, 1, 'sanity check, only 1 event received');
          assert.equal(events[0],
                      'cardviewclosedhome',
                      'cardviewclosedhome event raised when touch starts');
          assert.isFalse(cardsView.classList.contains('active'));
          assert.isFalse(taskManager.isShown());
          done();
        }, failOnReject);

        cardsView.dispatchEvent(
          createTouchEvent('touchstart', cardsView, 100, 100));
      });
    });
  });

  suite('hide > ', function() {
    setup(function(done) {
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps['http://game.gaiamobile.org']
      ];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = apps;
      MockAppWindowManager.mDisplayedApp = 'http://sms.gaiamobile.org';

      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.onTaskStripEnabled(false);
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide(false);
      cardsList.innerHTML = '';
    });

    test('taskManager should not be active', function() {
      taskManager.hide(true);
      assert.isFalse(taskManager.isShown(), 'isShown is false');
      assert.isFalse(cardsView.classList.contains('active'),
                    'no .active class');
    });

    test('removes classes', function() {
      taskManager.hide(true);
      assert.isFalse(screenNode.classList.contains('task-manager'));
      assert.isFalse(screenNode.classList.contains('cards-view'));
    });

    test('hide: raises cardviewclosed event', function(done) {
      waitForEvent(window, 'cardviewclosed').then(function(event) {
        assert.equal(typeof event.detail, 'object',
                    'gets event with detail object');
        assert.equal(event.detail.newStackPosition, 0,
                    'newStackPosition is the position passed to hide method');
        done();
      }, failOnReject);
      taskManager.hide(true, 0);
    });

    test('hide: removes cards', function(done) {
      function onOutcome() {
        assert.equal(cardsList.childNodes.length, 0,
                    'all card elements are gone');
        assert.equal(Object.keys(taskManager.listUI.cardsByAppID).length, 0,
                    'cards lookup is empty');
      }
      waitForEvent(window, 'cardviewclosed').then(onOutcome, onOutcome)
                                            .then(done, done);
      taskManager.hide(true);
    });

    test('hide: calls card.destroy', function(done) {
      var firstCard = taskManager.listUI.getCardAtIndex(0);
      var secondCard = taskManager.listUI.getCardAtIndex(1);
      var destroyStub1 = this.sinon.stub(firstCard, 'destroy');
      var destroyStub2 = this.sinon.stub(secondCard, 'destroy');

      function onOutcome() {
        assert.isTrue(destroyStub1.calledOnce,
                      '1st card.destroy was called once');
        assert.isTrue(destroyStub2.calledOnce,
                      '2nd card.destroy was called once');
      }
      waitForEvent(window, 'cardviewclosed').then(onOutcome, onOutcome)
                                            .then(done, done);
      taskManager.hide(true);
    });

  });

  suite('one app is displayed >', function() {
    setup(function(done) {
      MockStackManager.mStack = [apps['http://sms.gaiamobile.org']];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org']
      };
      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.onTaskStripEnabled(false);
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide(true);
    });

    test('Prevent reflowing during swipe to remove', function() {
      var card = cardsView.querySelector('.card');

      var touchstart = createTouchEvent('touchstart', card, 0, 500);
      var touchmove = createTouchEvent('touchmove', card, 0, 200);
      var touchend = createTouchEvent('touchend', card, 0, 200);

      assert.isFalse(card.dispatchEvent(touchstart));
      assert.isFalse(card.dispatchEvent(touchmove));
      assert.isFalse(card.dispatchEvent(touchend));
    });
  });

  suite('tapping on an app >', function() {

    setup(function(done) {
      MockStackManager.mStack = [apps['http://sms.gaiamobile.org']];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org']
      };

      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.onTaskStripEnabled(false);
      taskManager.show();
    });

    teardown(function() {
      taskManager.hide(true);
    });

    test('displays the new app before dismissing the task manager',
    function(done) {
      function onOutcome(evt) {
        console.log('onOutcome: cardviewclosed event: ', evt, evt.type);
        assert.ok(evt.detail);
        assert.ok(!isNaN(evt.detail.newStackPosition),
                  'cardviewclosed evt has new position detail');
      }


      waitForEvent(window, 'cardviewclosed').then(function(evt) {
        console.log('waitForEvent callback for cardviewclosed: ', evt.type);
        return onOutcome(evt);
      }, function(evt) {
        console.log('waitForEvent errback for cardviewclosed: ', evt.type);
        return onOutcome(evt);
      }).then(done, done);

      // stub the display method to fire the 'appopen' event normally
      // triggered by the transition controller
      this.sinon.stub(MockAppWindowManager, 'display', function() {
        console.log('AppWindowManager display called');
        setTimeout(function() {
          console.log('sending appopen event');
          sendAppopen(MockStackManager.mStack[0]);
        });
      });

      console.log('displays the new app before dismissing the task manager');
      taskManager.listUI.handleEvent({
        type: 'tap',
        target: cardsList.firstElementChild
      });
    });
  });
  suite('closeApp', function() {
    setup(function(done) {
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps['http://game.gaiamobile.org']
      ];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org'],
        'http://game.gaiamobile.org': apps['http://game.gaiamobile.org']
      };

      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.onTaskStripEnabled(false);
      taskManager.show();
    });
    teardown(function() {
      taskManager.hide(true);
      cardsList.innerHTML = '';
    });

    test('removes the card for that app', function() {
      var card = taskManager.listUI.getCardAtIndex(0);
      this.sinon.stub(card.app, 'kill', function(){
        var evt = new CustomEvent('appterminated', { detail: this });
        window.dispatchEvent(evt);
      });
      var removeCardStub = this.sinon.stub(taskManager.listUI, 'removeCard');
      taskManager.closeApp(card.app);
      assert.isTrue(removeCardStub.calledOnce);
    });

    test('destroys the card', function() {
      var card = taskManager.listUI.getCardAtIndex(0);
      this.sinon.stub(card.app, 'kill', function(){
        var evt = new CustomEvent('appterminated', { detail: this });
        window.dispatchEvent(evt);
      });

      assert.isTrue(card && card.element &&
                    card.element.parentNode == taskManager.listUI.cardsList);
      var destroySpy = this.sinon.spy(card, 'destroy');
      var instanceID = card.app.instanceID;
      taskManager.closeApp(card.app);
      assert.isTrue(destroySpy.calledOnce);
      assert.equal(cardsList.childNodes.length, 1);
      assert.isFalse(instanceID in taskManager.listUI.cardsByAppID);
    });
  });
  suite('app is killed', function() {
    setup(function(done) {
      MockStackManager.mStack = [
        apps['http://sms.gaiamobile.org'],
        apps['http://game.gaiamobile.org']
      ];
      MockStackManager.mCurrent = 0;
      MockAppWindowManager.mRunningApps = {
        'http://sms.gaiamobile.org': apps['http://sms.gaiamobile.org'],
        'http://game.gaiamobile.org': apps['http://game.gaiamobile.org']
      };

      assert.isFalse(taskManager.isShown(), 'taskManager isnt showing yet');
      waitForEvent(window, 'cardviewshown')
        .then(function() { done(); }, failOnReject);
      taskManager.isRocketbar = false;
      taskManager.show();
    });
    teardown(function() {
      taskManager.hide(true);
      cardsList.innerHTML = '';
    });

    test('removeCard is called on appterminated', function() {
      var deadApp = apps['http://game.gaiamobile.org'];
      var card = taskManager.cardsByAppID[deadApp.instanceID];
      var removeCardSpy = this.sinon.spy(taskManager, 'removeCard');
      var destroySpy = this.sinon.spy(card, 'destroy');
      var event = new CustomEvent('appterminated',
                                  { detail: deadApp });
      window.dispatchEvent(event);

      assert.isTrue(removeCardSpy.calledOnce, 'removeCard was called');
      assert.isTrue(destroySpy.calledOnce, 'card.destroy was called');
      assert.equal(cardsList.childNodes.length, 1);
    });
  });

});
