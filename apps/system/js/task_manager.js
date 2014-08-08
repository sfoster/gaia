/* global AppWindowManager, sleepMenu, SettingsListener, AttentionScreen,
          OrientationManager, System,UtilityTray, StackManager,
          TaskCarouselUI, TaskStripUI
*/

'use strict';

(function(exports) {
  var DEBUG = false;

  /**
   * Manage interactions and cards-view state for a stack of apps
   *
   * The view is built and event listeners attached when the show method
   *
   * Implements some of BaseUI interface (but does not extend that class)
   *
   * @class TaskManager
   */
  function TaskManager() {
    this.stack = null;
    // Unkillable apps which have attention screen now
    this.attentionScreenApps = [];

    // Listen for settings changes
    this.onTaskStripEnabled = function(value) {
      debug('taskstrip.enabled: '+ value);
      var oldValue = this.isTaskStrip;
      if (oldValue !== value) {
        if (this.listUI) {
          this.listUI.destroy();
          this.listUI = null;
        }
        this.isTaskStrip = value;
      }
    }.bind(this);
    SettingsListener.observe('taskstrip.enabled', false,
                             this.onTaskStripEnabled);
  }

  TaskManager.prototype = {
    /**
     * Use the carousel-style card view (false) or
     * the Haida-style horizontal task strip (true)
     */
    isTaskStrip: true,

    /**
     * The setting that enables/disables using screenshots vs. icons for the
     *  card preview
     * @memberof TaskCard.prototype
     */
    SCREENSHOT_PREVIEWS_SETTING_KEY: 'app.cards_view.screenshots.enabled',

    /**
     * Cached value of the screenshots.enabled setting
     * @memberOf TaskManager.prototype
     */
    useAppScreenshotPreviews: true,

    _showing: false
  };

  /**
   * initialize
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.start = function() {
    var previewSettingKey = this.SCREENSHOT_PREVIEWS_SETTING_KEY;
    // get initial setting value for screenshot previews
    // and watch for changes
    var settingRequest = SettingsListener.getSettingsLock()
                         .get(previewSettingKey);

    settingRequest.onsuccess = function() {
      var settingValue = settingRequest.result[previewSettingKey];
      this.useAppScreenshotPreviews = settingValue;
    }.bind(this);

    this._registerEvents();

    this.listUI = this._createListUI();
    this.listUI.init();

    this.stop = function() {
      this._unregisterEvents();
      this.listUI.destroy();
      this.listUI = null;
    };
  };

  TaskManager.prototype._createListUI = function() {
    var listUI;
    if (this.isTaskStrip) {
      listUI = new TaskStripUI({
        manager: this
      });
    } else {
      listUI = new TaskCarouselUI({
        manager: this
      });
    }
    return listUI;
  };

  TaskManager.prototype._registerEvents = function() {
    window.addEventListener('attentionscreenshow', this);
    window.addEventListener('attentionscreenhide', this);
    window.addEventListener('taskmanagershow', this);
    window.addEventListener('taskmanagerhide', this);
    window.addEventListener('holdhome', this);
    window.addEventListener('home', this);
    window.addEventListener('appopen', this);

    this.onPreviewSettingsChange = function(settingValue) {
      this.useAppScreenshotPreviews = settingValue;
    }.bind(this);

    SettingsListener.observe(this.SCREENSHOT_PREVIEWS_SETTING_KEY,
                             this.useAppScreenshotPreviews,
                             this.onPreviewSettingsChange);
  };

  TaskManager.prototype._unregisterEvents = function() {
    window.removeEventListener('attentionscreenshow', this);
    window.removeEventListener('attentionscreenhide', this);
    window.removeEventListener('taskmanagershow', this);
    window.removeEventListener('taskmanagerhide', this);
    window.removeEventListener('holdhome', this);
    window.removeEventListener('home', this);
    window.removeEventListener('appopen', this);

    SettingsListener.unobserve(this.SCREENSHOT_PREVIEWS_SETTING_KEY,
                               this.onPreviewSettingsChange);
    SettingsListener.unobserve('taskstrip.enabled',
                               this.onTaskStripEnabled);
  };

  /**
   * Is the view currently showing
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.isShown = function() {
    return this._showing;
  };

  /**
   * Hide the card switcher
   *
   * @memberOf TaskManager.prototype
   * @param {Boolean} removeImmediately true to skip transitions when hiding
   * @param {Number} newStackPosition to include in the event detail
   *
   */
  TaskManager.prototype.hide = function cs_hideCardSwitcher(removeImmediately,
                                                            newStackPosition) {
    if (!this.isShown()) {
      return;
    }

    // events to stop handling
    window.removeEventListener('lockscreen-appopened', this);
    window.removeEventListener('opencurrentcard', this);

    // Let everyone know we're about to close the cards view
    this.fireCardViewBeforeClose();
    // Make the cardsView overlay inactive
    this.listUI.hide(removeImmediately);
    this._showing = false;
    this.fireCardViewClosed(newStackPosition);
  };

  /**
   * Main entry point to show the card switcher
   *
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.show = function cs_showCardSwitcher() {
    // Build and display the card switcher overlay
    // Note that we rebuild the switcher each time we need it rather
    // than trying to keep it in sync with app launches.

    // Apps info from Stack Manager.
    var stack = this.stack = StackManager.snapshot();
    if (this.isTaskStrip) {
      stack.reverse();
    }
    var currentPosition = StackManager.position;

    // If we are currently displaying the homescreen but we have apps in the
    // stack we will display the most recently used application.
    if ((currentPosition == -1 || StackManager.outOfStack()) &&
        stack.length) {
      currentPosition = stack.length - 1;
    }
    this.currentPosition =  currentPosition;
    var currentApp = (stack.length && currentPosition > -1 &&
                     stack[currentPosition]);

    // Return early if isTaskStrip and there are no apps.
    if (!currentApp && this.isTaskStrip) {
      // Fire a cardchange event to notify rocketbar that there are no cards
      this.fireCardViewClosed();
      return;
    } else {
      // We can listen to appclose event
    }

    if (!this.listUI) {
      this.listUI = this._createListUI();
      this.listUI.init();
    }

    // Close utility tray if it is opened.
    UtilityTray && UtilityTray.hide(true);

    // Now we can switch to the homescreen.
    // while the task manager is shown, the active app is the homescreen
    // so selecting an app switches from homescreen to that app
    // which gets us in the right state
    AppWindowManager.display(null, null, 'to-cardview');

    // We're committed to showing the card switcher.
    // Homescreen fades (shows its fade-overlay) on cardviewbeforeshow events
    this.fireCardViewBeforeShow();

    // events to handle while shown
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('opencurrentcard', this);

    // Make sure we're in default orientation
    screen.mozLockOrientation(OrientationManager.defaultOrientation);

    console.log('calling listUI.show', this.listUI.nom);
    this.listUI.show();
    this._showing = true;
    this.fireCardViewShown();
  };

  /**
   * Handle the given action on the given card.
   *
   * @memberOf TaskManager.prototype
   * @param  {Card} card The card to call the action on.
   * @param  {String} actionName The name of the action to invoke.
   */
  TaskManager.prototype.doAction = function doAction(app, actionName) {
    switch (actionName) {
      case 'close' :
          this.closeApp(app);
        return;
      case 'favorite' :
        debug('cardAction: TODO: favorite ' + app.name);
        return;
      case 'select' :
        console.log('cardAction: select, calling AppWindowManager.display ' +
            ', set newStackPosition: ', this.stack.indexOf(app));
        this.newStackPosition = this.stack.indexOf(app);
        AppWindowManager.display(
          app,
          'from-cardview',
          null
        );
        // Card switcher will get hidden when 'appopen' is fired.
        return;
    }
  };

  /**
   * Close (kill) the app associated with the given card and remove that card
   *
   * @memberOf TaskManager.prototype
   * @param  {AppWindow}
   * @param  {Boolean} removeImmediately Skip any animations when closing
   */
  TaskManager.prototype.closeApp = function cs_closeApp(app,
                                                        removeImmediately) {
    var position = this.stack.indexOf(app);
    app && app.kill();
    if (position > -1) {
      // stop tracking this app in our own stack.
      this.stack.splice(position, 1);
    }
  };

  /**
   * Handle home events - hide the switcher and show the homescreen
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.goToHomescreen = function cs_goToHomescreen(evt) {
    if (!this.isShown()) {
      return;
    }
    console.log('goToHomescreen, firing cardviewclosed');
    window.dispatchEvent(new CustomEvent('cardviewclosedhome'));

    evt.stopImmediatePropagation();
    this.hide();
  };

  /**
   * Default event handler
   * @memberOf TaskManager.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskManager.prototype.handleEvent = function cv_handleEvent(evt) {
    var app;

    switch (evt.type) {
      case 'opencurrentcard':
        AppWindowManager.display(
          this.stack[this.currentPosition].origin,
          'from-cardview',
          null);
        break;

      case 'home':
        this.goToHomescreen(evt);
        break;

      case 'lockscreen-appopened':
      case 'attentionscreenshow':
        this.attentionScreenApps =
            AttentionScreen.getAttentionScreenOrigins();
        this.hide();
        break;

      case 'attentionscreenhide':
        this.attentionScreenApps =
            AttentionScreen.getAttentionScreenOrigins();
        break;

      case 'taskmanagershow':
        this.show();
        break;

      case 'taskmanagerhide':
        this.hide();
        break;

      case 'holdhome':
        if (this.isShown() || System.locked) {
          return;
        }
        sleepMenu.hide();
        if (this.isTaskStrip) {
          this.show();
        } else {
          app = AppWindowManager.getActiveApp();
          if (app) {
            app.getScreenshot(function onGettingRealtimeScreenshot() {
              this.show();
            }.bind(this));
          } else {
            // empty list entry point
            this.show();
          }
        }
        break;

      case 'appopen':
        if (this.isShown() && !evt.detail.isHomescreen) {
          debug('handling appopen, with newStackPosition: ',
                this.newStackPosition);
          this.hide(/* immediately */ true, this.newStackPosition);
        }
        break;
    }
  };

  /**
   * @memberOf TaskManager.prototype
   * @param  {String} eventName
   */
  TaskManager.prototype.fireEventNextTick = function(eventName) {
    setTimeout(function nextTick() {
      window.dispatchEvent(new CustomEvent(eventName));
    });
  };

  /**
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.fireCardViewBeforeShow = function() {
    window.dispatchEvent(new CustomEvent('cardviewbeforeshow'));
  };

  /**
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.fireCardViewShown = function() {
    this.fireEventNextTick('cardviewshown');
  };

  /**
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.fireCardViewBeforeClose = function() {
    this.fireEventNextTick('cardviewbeforeclose');
  };

  /**
   * @memberOf TaskManager.prototype
   */
  TaskManager.prototype.fireCardViewClosed = function(newStackPosition) {
    var detail = null;

    if (!isNaN(newStackPosition)) {
      detail = { 'detail': { 'newStackPosition': newStackPosition }};
    }

    console.log('fireCardViewClosed with newStackPosition: ', newStackPosition);
    var event = new CustomEvent('cardviewclosed', detail);
    setTimeout(function nextTick() {
      window.dispatchEvent(event);
    });
  };

  exports.TaskManager = TaskManager;

  function debug(message) {
    if (DEBUG) {
      console.log('TaskManager > \n  ', message);
    }
  }
})(window);
