'use strict';

(function(exports) {
  var DEBUG = true;
  var windowWidth, windowHeight;

  const SCALE_FACTOR = 0.6;

  function merge(a, b) {
    for(var key in b) {
      a[key] = b[key];
    }
  }

  // Helper for managing css transform properties
  function Transform(props) {
    for(var key in props) {
      this[key] = props[key];
    }
  }
  Transform.prototype.toString = function transform_toString() {
    var str = Object.keys(this).map(function(key) {
      return key + '(' + this[key] + ')';
    }, this).join(' ');
    return str;
  };

  function Card(appWindow){
    this.app = appWindow;
    if (!this.element) {
      this.element = Card._createElement();
    }
  }
  Card._createElement = function() {
    var elm = document.createElement('div');
    elm.classList.add('card');
    elm.classList.add('in-transition');
    elm.style.width = windowWidth + 'px';
    elm.style.visibility = 'hidden';
    // everthing in container is scaled down, but card should be full height
    elm.style.height = windowHeight/SCALE_FACTOR + 'px';
    return elm;
  };
  Card.prototype.bindApp = function(appWindow) {
    this.element.dataset.appId = appWindow.instanceID;
    this.app = appWindow;
    this.transform = new Transform({});
    this.element.style.visibility = 'visible';
    this.element.classList.remove('in-transition');
    this.app.enterTaskManager();
    var appElement = this.app.element,
        cardElement = this.element;
  };
  Card.prototype._applyStyle = function(nameValues) {
    var style = this.element.style;
    for (var property in nameValues) {
      if (undefined === nameValues[property]) {
        delete style[[property]];
      } else {
        style[property] = nameValues[property];
      }
    }
  };
  Card.prototype.applyStyle = function tc_applyStyle(nameValues) {
    var cardStyle = {};
    var appWindowStyle = {};
    var pValue, pName;
    for (pName in nameValues) {
      pValue = nameValues[pName];
      switch (pName) {
        case 'MozTransform':
          appWindowStyle[pName] = pValue.replace(/(translateY)\([^\)]+\)\s*/gi, '');
          cardStyle[pName] = pValue;
          break;
        case 'zIndex':
        case 'pointerEvents':
          cardStyle[pName] = pValue;
          break;
        default:
          cardStyle[pName] = pValue;
          appWindowStyle[pName] = pValue;
      }
    }
    this._applyStyle.call(this, cardStyle);
    debug('applying style to appWindow: ', appWindowStyle);
    this.app.applyStyle(appWindowStyle);
  };

  function TaskSwitcher() {}
  TaskSwitcher.prototype = {
    /**
     * Index into the stack of the currently displayed app/card
     * @memberOf TaskManager.prototype
     */
    currentDisplayed: 0,

    get gestureDetector() {
      return this.constructor._gestureDetector;
    },

    start: function() {
      debug('started');
      // stash some measurements now to avoid unexpected reflow later
      windowWidth = this._windowWidth = window.innerWidth;
      windowHeight = this._windowHeight = window.innerHeight;
      this._fetchElements();
      this._registerEvents();

      cardsSwipeManager.switcher = this;
      var gd = this.gestureDetector;
      if (!gd) {
        gd = new GestureDetector(this.containerElement);
        this.constructor._gestureDetector = gd;
      }
    },

    _fetchElements: function() {
      // the DOMElement for the card switcher
      this.containerElement = document.getElementById('windows'),
      this.screenElement = document.getElementById('screen');
    },

    _registerEvents: function() {
      window.addEventListener('taskmanagershow', this);
      window.addEventListener('taskmanagerhide', this);
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'taskmanagershow':
          if (this._isShowing) {
            this.hide();
          } else {
            this.show();
          }
          break;
        case 'click':
        case 'tap':
          this.handleTap(evt);
          break;

      }
    },

    handleTap: function(evt) {
      var target = evt.touches ? evt.touches[0].target : evt.target;
      console.log('handleTap: looking up card from event target: ', target);
      var id = target.dataset.appId;
      var card = id && this.cardById(id);
      if (card) {
        debug('tap card: ', card.app.origin);
        evt.stopPropagation();
        cardsSwipeManager.resetCard();
        this.cardAction(card, 'select');
      } else {
        debug('tap on non-card element: ', target);
      }
    },

    cardAction: function(card, actionName) {
      var currentApp = card.app;
      debug('cardAction', card, actionName);
      switch (actionName) {
        // case 'close' :
        //     this.closeApp(card);
        //   return;
        // case 'favorite' :
        //   debug('cardAction: TODO: favorite ' + card.element.orpigin);
        //   return;
        case 'select' :
          // FIXME: need to update stack
          // and place nice with window management
          this.newStackPosition = card.position;
          var selectApp = (function() {
            debug('selectApp transition callback');
            card.element.removeEventListener('transitionend', selectApp);
            AppWindowManager.display(
              card.app,
              'from-cardview',
              null
            );
            this.hide();
          }).bind(this);
          card.element.addEventListener('transitionend', selectApp);
          setTimeout(function() {
            card.element.classList.add('in-transition');
            card.app.leaveTaskManager();
          }, 0);
          return;
      }
    },

    show: function() {
      this._isShowing = true;
      debug('show');
      // get stack + homescreen

      // Apps info from Stack Manager.
      var stack = this.stack = StackManager.snapshot();
      stack.unshift(homescreenLauncher.getHomescreen());

      this.stackIndex = StackManager.position;
      this.currentDisplayed = this.stackIndex + 1;

      var cardWidth = this._windowWidth;
      var screenElm = this.screenElement;

      var cardsMap = this._cardsMap = {};
      var cards = this._cards = [];
      var gutter = windowWidth/10;

      var frag = document.createDocumentFragment();
      var totalWidth = 0;
      var wallpaper = screenElm.style.backgroundImage;
      function positionFor(position, total) {
        var lastIndex = total - 1;
        var x = SCALE_FACTOR * (lastIndex - position) * (gutter + cardWidth);
        return x;
      }

      function eachStackEntry(appWindow, position, total) {
        if(appWindow.isHomescreen) {
          appWindow.applyStyle({ backgroundImage: wallpaper });
        }

        var card = new Card(appWindow, position);
        var elm = card.element;
        elm.dataset.position = position;
        cardsMap[appWindow.instanceID] = card;

        var leftEdge = positionFor(position, total);
        totalWidth += leftEdge;
        debug('card ' + position + ' of ' + total + ' at: ' + leftEdge);
        // card.transform.scale = SCALE_FACTOR;

        card.applyStyle({
          left: leftEdge + 'px'
          // MozTransform: card.transform.toString()
        });

        frag.appendChild(elm);
        return card;
      };

      for(var i = stack.length-1; i >= 0; i--) {
        this._cards.push(eachStackEntry(stack[i], i, stack.length));
      }

      this.containerElement.paddingLeft = totalWidth = 'px';
      this.containerElement.appendChild(frag);
      this.containerElement.setAttribute('data-task-view', true);
      this.containerElement.style.backgroundColor = '#999';

      var finishShow = (function() {
        this._cards.forEach(function(card) {
          card.bindApp(card.app);
        });

        // scroll over to the current app
        // FIXME: need to generate the no-apps placeholder card;
        this.containerElement.scrollLeft = positionFor(1, stack.length);

        this.gestureDetector.startDetecting();
        ['touchstart', 'pan', 'tap', 'swipe'].forEach(function(evt) {
          this.containerElement.addEventListener(evt, cardsSwipeManager);
        }, this);

        debug('/show');
      }).bind(this);
      setTimeout(finishShow, 0);
    },

    hide: function(skipTransition) {
      this._isShowing = false;
      debug('hide');
      var currentCard = this._cards[this.currentDisplayed];
      var screenElm = this.screenElement;

      ['touchstart', 'pan', 'tap', 'swipe'].forEach(function(evt) {
        this.containerElement.removeEventListener(evt, cardsSwipeManager);
      }, this);
      this.gestureDetector.stopDetecting();

      // put the homescreen background back where it belongs
      screenElm.style.backgroundImage =
          this._cards[0].app.element.style.backgroundImage;
      screenElm.style.backgroundColor = '';
      this.containerElement.removeAttribute('data-task-view');

      var hideSwitcher = (function ts_hideSwitcher(){
        debug('hideSwitcher transition callback');
        clearTimeout(timeout);
        currentCard.element.removeEventListener(
            'transitionend', hideSwitcher);
        this.containerElement.style.backgroundColor = '';

        var card;
        debug('hideSwitcher, removing cards');
        while((card = this._cards.shift())) {
          if (card.app.isHomescreen) {
            // relinquish the bg we borrowed
            card.app.applyStyle({ backgroundImage: '' });
          }
          card.app && card.app.leaveTaskManager();
          this.containerElement.removeChild(card.element);
        }
        debug('/hideSwitcher');
        this._cardsMap = null;
      }).bind(this);

      // ensure hideSwitcher gets called if we miss the transitionend
      // or no transition runs at all
      var timeout = setTimeout(function() {
        debug('timed out waiting for transitionend, calling hideSwitcher()');
        hideSwitcher();
      }, 600);
      if (skipTransition) {
        // needed even?
      } else {
        currentCard.element.addEventListener('transitionend', hideSwitcher);
      }
      setTimeout(function() {
        currentCard.element.classList.add('in-transition');
        currentCard.app.leaveTaskManager();
      }.bind(this), 0);
    },
    cardById: function(id) {
      return this._cardsMap[id];
    }
  };

  var cardsSwipeManager = {

    TRANSITION_SPEED: 1.8,
    TRANSITION_FRACTION: 0.50,

    switcher: null,
    card: null,
    id: null,
    containerWidth: null,

    resetCard: function() {
      if (this.card) {
        if (this.card.element) {
          this.card.element.style.MozTransition =
              this.originalCardTransition || '';
        }
        if (this.card.app && this.card.app.element) {
          this.card.app.element.style.MozTransition =
              this.originalAppTransition || '';
        }
      }
      this.card = null;
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'touchstart':
          return this.touchstart(e);
        case 'pan':
          return this.pan(e);
        case 'tap':
          return this.tap(e);
        case 'swipe':
          return this.swipe(e);
      }
    },

    touchstart: function cardSwipe_touchstart(e) {
      e.preventDefault();
      debug('touchstart, e.type: ', e.type);
      var target = e.touches[0].target;
      var id = target.dataset.appId;
      this.card = id && this.switcher.cardById(id);
      if (!this.card) {
        debug('touchstart on non-card element? ', target);
        return;
      }
      this.containerWidth = this.switcher.containerElement.clientWidth;

      if (this.switcher.inTransition)
        return;
      debug('/touchstart, setting');
      this.originalAppTransition = this.card.app.element.style.MozTransition;
      this.originalCardTransition = this.card.element.style.MozTransition;
      this.card.applyStyle({ MozTransition: '' });
    },

    pan: function cardSwipe_pan(e) {
      if (this.switcher.inTransition)
        return;
      debug('pan event: ', this.card.app.origin);
      var cardStyle = {};
      var movement = Math.min(this.containerWidth,
                              Math.abs(e.detail.absolute.dx));
      cardStyle.left = e.detail.absolute.dx + 'px';
      this.card.applyStyle(cardStyle);
      var self = this;
      var card = self.card;
      card.element.addEventListener('transitionend', function transitionEnded() {
        card.element.removeEventListener('transitionend', transitionEnded);
        self.resetCard();
      });
    },

    tap: function cardSwipe_tap(e) {
      if (this.switcher.inTransition) {
        return;
      }
      this.switcher.handleTap(e);
    },

    swipe: function tabSwipe_swipe(e) {
      if (this.switcher.inTransition)
        return;

      var cardStyle = {};
      var card = this.card;
      var self = this;
      var distance = e.detail.start.screenX - e.detail.end.screenX;
      var fastenough = Math.abs(e.detail.vx) > this.TRANSITION_SPEED;
      var farenough = Math.abs(distance) >
        this.containerWidth * this.TRANSITION_FRACTION;

      if (!(farenough || fastenough)) {
        // Werent far or fast enough to delete, restore
        var time = Math.abs(distance) / this.TRANSITION_SPEED;
        var transition = 'left ' + time + 'ms linear';
        cardStyle.MozTransition = transition;
        cardStyle.left = '0px';
        cardStyle.opacity = 1;
        card.applyStyle(cardStyle);
        card.element.addEventListener('transitionend', function transitionEnded() {
          card.element.removeEventListener('transitionend', transitionEnded);
          self.resetCard();
        });
        return;
      }

      var speed = Math.max(Math.abs(e.detail.vx), 1.8);
      var time = (this.containerWidth - Math.abs(distance)) / speed;
      var offset = e.detail.direction === 'right' ?
        this.containerWidth : -this.containerWidth;

      debug('TODO: delete card:', this.card);
    }
  };

  function debug(message) {
    if (DEBUG) {
      console.log.apply(console, Array.concat(['TaskSwitcher: '], Array.slice(arguments)));
    }
  }

  exports.TaskSwitcher = TaskSwitcher;
})(window);