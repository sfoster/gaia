/* global TaskCard, GestureDetector */

'use strict';

(function(exports) {
  var DEBUG = false;

  /**
   * Represent an array of apps as a horizontal strip of cards
   *
   * The view is built and event listeners attached when the show method
   *
   * Implements some of BaseUI interface (but does not extend that class)
   *
   * @class TaskStripUI
   */
  function TaskStripUI(config) {
    this.cardsByOrigin = {};
    for (var key in config) {
      this[key] = config[key];
    }
  }

  TaskStripUI.prototype = Object.create({
    nom: 'TaskStripUI',
    _initialized: false,

    /**
     * The TaskManager instance that created us
     * @memberOf TaskStripUI.prototype
     */
    manager: null,

    /**
     * if 'true' user can close the app by dragging it upwards
     * @memberOf TaskManager.prototype
     */
    allowSwipeToClose: true

  }, {
    /**
     * Getter to access cached window innerWidth measurement
     * @memberOf TaskStripUI.prototype
     */
    windowWidth: {
      get: function cs_getWindowWidth() {
        return this._windowWidth;
      }
    },
    /**
     * Getter to access cached window innerHeight measurement
     * @memberOf TaskStripUI.prototype
     */
    windowHeight: {
      get: function cs_getWindowHeight() {
        return this._windowHeight;
      }
    }
  });

  TaskStripUI.prototype.init = function() {
    if (this._initialized) {
      return;
    }
    this._fetchElements();
    // start gesture detecting asap, but defer most of the init until first
    // call to .show();

    var gd = this.constructor._gestureDetector;
    if (!gd) {
      gd = new GestureDetector(this.element);
      this.constructor._gestureDetector = gd;
      gd.startDetecting();
    }
    this._registerEvents();
    this.destroy = function() {
      this._unregisterEvents();
      gd.stopDetecting();
      gd = null;
    };
    this._initialized = true;
  };

  TaskStripUI.prototype._fetchElements = function() {
    // the DOMElement that contains the appWindows
    this.element = document.getElementById('windows');
    this.screenElement = document.getElementById('screen');
  };

  TaskStripUI.prototype._registerEvents = function(evt) {
  };

  TaskStripUI.prototype.onBeforeShow = function(evt) {
    // stash some measurements now to avoid unexpected reflow later
    this._windowWidth = window.innerWidth;
    this._windowHeight = window.innerHeight;
  };

  TaskStripUI.prototype.show = function() {
    var stack = this.manager.stack;

    // TODO: early return if already showing
    this.currentPosition = this.manager.currentPosition;

    // legacy CSS hook name
    this.screenElement.classList.add('cards-view');
    this.screenElement.classList.add('task-manager');

    // TODO: I think we just return if there are no apps?
    // Or just open/return to homescreen?
    // If there is no running app, show "no recent apps" message
    debug('Zero apps to show');
    if (stack.length) {
      this.element.classList.remove('empty');
    } else {
      this.element.classList.add('empty');
    }

    // TODO: set up swipe to close

    // events to handle while shown
    window.addEventListener('tap', this);

    // TODO: actually set up the cards/apps
    debug('TODO: create cards with ', TaskCard);
    this._showing = true;
  };


  TaskStripUI.prototype.hide = function(removeImmediately,
                                           newStackPosition) {
    // TODO: early return if now showing
    this._showing = false;
    window.removeEventListener('tap', this);
    // TODO: actually hide

    this.screenElement.classList.remove('cards-view');
    this.screenElement.classList.remove('task-manager');
    console.log('TaskStripUI hide, screenElement.className', this.screenElement.className);
  };

  /**
   * Handle (synthetic) tap events on the card list
   *
   * @memberOf TaskStripUI.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskStripUI.prototype.handleTap = function cs_handleTap(evt) {
    // TODO: hook up close, select actions
    //     this.manager.cardAction(card.app, 'close');
    //    this.manager.cardAction(card.app, 'select');
  };

  /**
   * Default event handler
   * @memberOf TaskStripUI.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskStripUI.prototype.handleEvent = function cv_handleEvent(evt) {
    switch (evt.type) {
      case 'tap':
        this.handleTap(evt);
        break;

      case 'cardviewbeforeshow':
        this.onBeforeShow(evt);
        break;

      case 'appterminated':
        var app = evt.detail;
        debug('appterminated: ' + app.origin);
        // TODO: unhook app
        break;
    }
  };

  exports.TaskStripUI = TaskStripUI;

  function debug(message) {
    if (DEBUG) {
      console.log('TaskStripUI > \n  ', message);
    }
  }
})(window);

