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
    this.bind(appWindow);
  }
  Card._createElement = function() {
    var elm = document.createElement('div');
    elm.classList.add('card');
    elm.style.width = windowWidth + 'px';
    // everthing in container is scaled down, but card should be full height
    elm.style.height = windowHeight/SCALE_FACTOR + 'px';
    return elm;
  };
  Card.prototype.bind = function(appWindow) {
    if (!this.element) {
      this.element = Card._createElement();
    }
    this.app = appWindow;
    this.transform = new Transform({
      translateX: 0
    });
    this.app.enterTaskManager();
    this.element.addEventListener('click', this);
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

    start: function() {
      debug('started');
      // stash some measurements now to avoid unexpected reflow later
      windowWidth = this._windowWidth = window.innerWidth;
      windowHeight = this._windowHeight = window.innerHeight;
      this._fetchElements();
      this._registerEvents();
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
      if (evt.target.classList.contains('card')) {
        var matches = this._cards.filter(function(card) {
          return card.element === evt.target;
        });
        if (matches.length) {
          evt.stopPropagation();
          this.cardAction(matches[0], 'select');
        }
      }
    },

    cardAction: function(card, actionName) {
      switch (actionName) {
        // case 'close' :
        //     this.closeApp(card);
        //   return;
        // case 'favorite' :
        //   debug('cardAction: TODO: favorite ' + card.element.origin);
        //   return;
        case 'select' :
          this.newStackPosition = card.position;
          AppWindowManager.display(
            card.app,
            'from-cardview',
            null
          );
          this.hide();
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

      this.stackPointer = StackManager.position;

      var cardWidth = this._windowWidth;
      var centerX = this._windowWidth / 2;
      var screenElm = this.screenElement;

      var cardsMap = this._cardsMap = {};
      var cards = this._cards = [];
      var gutter = windowWidth/10;

      var frag = document.createDocumentFragment();
      var totalWidth = 0;

      function positionFor(position, total) {
        var lastIndex = total - 1;
        var x = SCALE_FACTOR * (lastIndex - position) * (gutter + cardWidth);
        return x;
      }
      function eachStackEntry(appWindow, position, total) {
        var card = new Card(appWindow, position);
        var elm = card.element;
        elm.dataset.position = position;
        var key = appWindow.origin + ': ' + appWindow.instanceID;
        cardsMap[key] = card;

        var leftEdge = positionFor(position, total);
        totalWidth += leftEdge;
        debug('card ' + position + ' of ' + total + ' at: ' + leftEdge);
        card.transform.translateX = leftEdge + 'px';
        card.transform.scale = SCALE_FACTOR;

        card.applyStyle({
          MozTransform: card.transform.toString()
        });

        if(appWindow.isHomescreen) {
          card.app.applyStyle({ backgroundImage: screenElm.style.backgroundImage });
          screenElm.backgroundImage = 'none';
          screenElm.backgroundColor = '#999';
        }
        frag.appendChild(elm);
        return card;
      };

      for(var i = stack.length-1; i >= 0; i--) {
        this._cards.push(eachStackEntry(stack[i], i, stack.length));
      }

      this.containerElement.style.width = totalWidth = 'px';
      this.containerElement.appendChild(frag);
      this.containerElement.setAttribute('data-task-view', true);
      this.containerElement.style.backgroundColor = '#999';
      // scroll over to the current app
      // FIXME: need to generate the no-apps placeholder card;
      this.containerElement.scrollLeft = positionFor(1, stack.length);

      window.addEventListener('click', this);

      // iterate over each to add a 'something' class
      // put up backdrop
      // move settings background into home if its not there already
      // apply class to #screen to style all elements into a horizontal row
      // set transform-origin to 0,0
      // transform to scale elements and translate position
      // scale transition reveals backdrop
      // use native scrolling
      //  so swipe just does scrollTo()
      // tap on element/element-overlay switches to that app, reversing the show sequence
      // home event switches to home, reversing the show sequence

      debug('/show');
    },
    hide: function() {
      this._isShowing = false;
      debug('hide');
      var card;
      var screenElm = this.screenElement;

      window.removeEventListener('click', this);
      this.containerElement.removeAttribute('data-task-view');
      this.containerElement.style.backgroundColor = '';

      while((card = this._cards.shift())) {
        if (card.app.isHomescreen) {
          // put the homescreen background back where it belongs
          screenElm.style.backgroundImage = card.app.element.style.backgroundImage;
          screenElm.style.backgroundColor = 'transparent';
        }
        card.app && card.app.leaveTaskManager();
        this.containerElement.removeChild(card.element);
      }
      this._cardsMap = null;
    }
  };

  function debug(message) {
    if (DEBUG) {
      console.log.apply(console, Array.concat(['TaskSwitcher: '], Array.slice(arguments)));
    }
  }

  exports.TaskSwitcher = TaskSwitcher;
})(window);