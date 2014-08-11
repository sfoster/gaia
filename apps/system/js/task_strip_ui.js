/* global GestureDetector */

'use strict';

(function(exports) {
  var DEBUG = false;

  const GUTTER_WIDTH = 16;

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
    this.stack = [];
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
    allowSwipeToClose: false
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

    if (this.allowSwipeToClose) {
      var gd = this.constructor._gestureDetector;
      if (!gd) {
        gd = new GestureDetector(this.element);
        this.constructor._gestureDetector = gd;
        gd.startDetecting();
      }
    }

    this._registerEvents();

    this._scrollListener = {
      element: this.element,
      parent: this,
      start: function() {
        this.element.addEventListener('scroll', this.parent, false);
      },
      stop: function() {
        this.element.removeEventListener('scroll', this.parent);
      }
    };
    this.destroy = function() {
      this._unregisterEvents();
      if (this._scrollListener) {
        this._scrollListener.stop();
        this._scrollListener = null;
      }
      if (gd) {
        gd.stopDetecting();
        gd = null;
      }
    };
    this._initialized = true;
  };

  TaskStripUI.prototype._registerEvents = function() {
    this.element.addEventListener('click', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('cardviewbeforeshow', this);
  };

  TaskStripUI.prototype._unregisterEvents = function(evt) {
    this.element.removeEventListener('click', this);
    window.removeEventListener('cardviewbeforeshow', this);
    window.removeEventListener('appterminated', this);
    if (this._showing) {
      // events to handle while shown
      window.addEventListener('tap', this);
    }
  };

  TaskStripUI.prototype._fetchElements = function() {
    this.element = document.getElementById('windows');
    this.screenElement = document.getElementById('screen');
    this.stretcher = document.getElementById('stretcher');
    if (!this.stretcher) {
      this.stretcher = document.createElement('div');
      this.stretcher.id = 'stretcher';
      this.element.appendChild(this.stretcher);
    }
  };

  /**
   * Is the view currently showing
   * @memberOf TaskManager.prototype
   */
  TaskStripUI.prototype.isShown = function() {
    return this._showing;
  };

  /**
   * Main entry point to show the card switcher
   *
   * @memberOf TaskManager.prototype
   */
  TaskStripUI.prototype.show = function() {
    if (this.isShown()) {
      return;
    }
    var currentPosition = this.manager.currentPosition;
    var stack = this.stack = this.manager.stack;
    var appsById = this.appsById = {};

    stack.forEach(function(app, idx) {
      appsById[app.instanceID] = app;
      app.enterTaskManager();
    });
    this.stretcher.style.display = 'block';
    // legacy CSS hook name
    this.screenElement.classList.add('cards-view');
    this.screenElement.classList.add('task-manager');
    this.element.classList.add('task-manager');

    if (stack.length) {
      this.element.classList.remove('empty');
    } else {
      this.element.classList.add('empty');
    }

    this._positionAppPreviews();
    setTimeout(function() {
      this.moveToPosition(currentPosition, true);
      setTimeout(this._scrollListener.start.bind(this._scrollListener), 0);
    }.bind(this), 0);

    // events to handle while shown
    window.addEventListener('tap', this);

    this._showing = true;
  };

  /**
   * Hide the card switcher
   *
   * @memberOf TaskManager.prototype
   * @param {Boolean} removeImmediately true to skip transitions when hiding
   * @param {Number} newStackPosition to include in the event detail
   *
   */
  TaskStripUI.prototype.hide = function(removeImmediately,
                                        newStackPosition) {
    if (!this.isShown()) {
      return;
    }
    this._showing = false;
    this._scrollListener.stop();

    var app;
    while((app = this.stack.shift())) {
      app.leaveTaskManager();
    }
    this.stretcher.style.display = 'none';
    this.stretcher.style.width = 1 + this._windowWidth + 'px';

    window.removeEventListener('tap', this);

    this.screenElement.classList.remove('cards-view');
    this.screenElement.classList.remove('task-manager');
    this.element.classList.remove('task-manager');

    console.log('TaskStripUI hide, screenElement.className',
                this.screenElement.className);
  };

  TaskStripUI.prototype._positionAppPreviews = function() {
    var stack = this.stack;
    var totalWidth = 0;

    Array.forEach(stack, function(appWindow, idx, coln) {
      var leftValue = this._calculateCardPosition(idx, coln);
      var style = {
        left: leftValue + 'px'
      };
      if (idx === 0) {
        totalWidth = leftValue + this._windowWidth;
      }
      appWindow.applyStyle(style);
    }, this);

    this.stretcher.style.width = totalWidth + 'px';
  };
  TaskStripUI.prototype.moveToPosition = function(position, doScroll) {
    if (!position || position < 0 || position >= this.stack.length) {
      // out of bounds position, default to 0
      position = 0;
    }
    if (doScroll) {
      this.scrollToPosition(position);
    }

    this.stack.forEach(function(app, idx) {
      var offset = idx - position;
      if (Math.abs(offset) >= 1) {
        var evt = new CustomEvent('onviewport', {
          detail: app
        });
        app.element.dispatchEvent(evt);
      }
    }, this);
  };

  TaskStripUI.prototype._scrollInProgress = function() {
    if (!this._scrolling) {
      console.log('start scrolling');
      this._scrolling = true;
    }
    // reset timer
    if (this._scrollingTimerId) {
      clearTimeout(this._scrollingTimerId);
    }
    this._scrollingTimerId = setTimeout(this._notScrolling.bind(this), 120);
  };
  TaskStripUI.prototype._notScrolling = function() {
    console.log('stop scrolling');
    if (this._scrollingTimerId) {
      clearTimeout(this._scrollingTimerId);
      this._scrollingTimerId = null;
    }
    this._scrolling = false;

    var nearestPosition = this.manager.currentPosition =
        this._getNearestPositionFromScrollOffset(this.element.scrollLeft);
    this.moveToPosition(nearestPosition, false);
  };
  TaskStripUI.prototype._getAppAtPosition = function(position) {
    return this.manager.stack[position];
  };
  TaskStripUI.prototype._getNearestPositionFromScrollOffset = function(offset) {
    if (isNaN(offset)) {
      offset = this.element.scrollLeft;
    }
    var scaledCardWidth = this._cardWidth / 2;
     // 50% width + GUTTER_WIDTH
    var columnWidth = scaledCardWidth + GUTTER_WIDTH;
    var lastIndex = this.stack.length - 1;
    var zeroLeft = (this._windowWidth / 2) - scaledCardWidth;
    offset -= zeroLeft;
    var position = lastIndex - Math.min(lastIndex,
                                        Math.round(offset / columnWidth));
    console.log('nearest position for offset: ', offset, position);
    return position;
  };
  TaskStripUI.prototype._calculateCardPosition = function(position) {
    var scaledCardWidth = this._cardWidth / 2;
    // scale transform-origin is center,
    // so left edge is at center minus full scaled-width
    var zeroLeft = (this._windowWidth / 2) - scaledCardWidth;
    // 50% width + GUTTER_WIDTH gutter
    var columnWidth = scaledCardWidth + GUTTER_WIDTH;
    var count = this.stack.length;
    var left = zeroLeft + ((count - (position + 1)) * columnWidth);
    return left;
  };

  /**
   * Default event handler
   * @memberOf TaskStripUI.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskStripUI.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case 'scroll' :
        this._scrollInProgress();
        break;
      case 'click' :
      case 'tap':
        console.log('handle click:', evt);
        this.handleTap(evt);
        break;
      case 'appterminated':
        var app = evt.detail;
        debug('appterminated: ' + app.origin);
        this.onAppTerminated(evt);
        break;
      case 'cardviewbeforeshow':
        this.onBeforeShow(evt);
        break;
    }
  };

  /**
   * Handle (synthetic) tap events on the card list
   *
   * @memberOf TaskStripUI.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskStripUI.prototype.handleTap = function(evt) {
    // Handle close events
    var targetNode = evt.target;
    var app = this.getAppForElement(targetNode);

    if (app && ('buttonAction' in targetNode.dataset)) {
      evt.stopPropagation();
      this.manager.doAction(app, targetNode.dataset.buttonAction);
      return;
    }

    if (app) {
      // fallback action is to select the app under the tap
      this.manager.doAction(app, 'select');
      return;
    } else {
      console.log('handleTap: no appWindow match for click:', evt);
    }
  };

  TaskStripUI.prototype.onAppTerminated = function(evt) {
    var app = evt.detail;
    var position = this.stack.indexOf(app);
    var lastIndex = this.stack.length - 1;
    if (position > -1) {
      // TODO: check spec for how to animate?
      // positioning after removing an app /should/ be cheap,
      this._positionAppPreviews();
      console.log('appterminated handler, ', app.detail.name);
      this.moveToPosition(Math.min(position, lastIndex), true);
    }
  };

  TaskStripUI.prototype.getAppForElement = function(elem) {
    var appElem;
    var tmpNode = elem;
    do {
      if (tmpNode.classList && tmpNode.classList.contains('appWindow')) {
        appElem = tmpNode;
        break;
      }
      if (tmpNode == this.element) {
        break;
      }
    } while((tmpNode = tmpNode.parentNode));

    if (!appElem) {
      console.log('no appWindow found for node: ', elem);
      return;
    }
    return this.stack.filter(function(app) {
      return app.instanceID === appElem.id;
    })[0];
  };

  TaskStripUI.prototype.scrollToPosition = function(position) {
    this._scrollListener.stop();
    var app = this._getAppAtPosition(position);
    console.log('scrollToPosition: ', position, app.name);
    var elem = app.element;
    var centerOffset = this._windowWidth / 2;
    var leftOffset = parseInt(elem.style.left) + (this._cardWidth/2);
    var scrollOffset = Math.max(0, leftOffset - centerOffset);
    try {
      this.element.scrollLeft = scrollOffset;
    } catch (ex) {
      console.log('Exception setting scrollLeft: ' + ex.message);
    }
    setTimeout(this._scrollListener.start.bind(this._scrollListener), 0);
  };

  TaskStripUI.prototype.onBeforeShow = function(evt) {
    // stash some measurements now to avoid unexpected reflow later
    this._windowWidth = window.innerWidth;
    this._windowHeight = window.innerHeight;
    this._cardWidth = Math.min(320, this._windowWidth);
  };

  exports.TaskStripUI = TaskStripUI;

  function debug(message) {
    if (DEBUG) {
      console.log('TaskStripUI > \n  ', message);
    }
  }
})(window);

