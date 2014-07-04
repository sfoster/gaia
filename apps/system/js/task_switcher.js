'use strict';

(function(exports) {
  var DEBUG = true;
  var windowWidth, windowHeight;

  const SCALE_FACTOR = 0.5;

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

  function Card(appWindow, position){
    this.app = appWindow;
    this.position = position;
    if (!this.element) {
      this.element = Card._createElement();
    }
    this.transform = new Transform({
      scale: 0.5
    });
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
  Card.prototype = Object.create(BaseUI.prototype);
  Card.prototype.constructor = Card;

  /**
   * @type {String}
   * @memberof Card.prototype
   */
  Card.prototype.EVENT_PREFIX = 'card-';

  Card.prototype._template = '<section class="card-inner">' +
    '<header class="card-header"><h1 class="title">{title}</h1>' +
    '<p class="subtitle">{subTitle}</p></header>' +
    '<div class="appPreview"></div>' +
    '<footer class="card-tray">'+
      '<button class="appIcon" data-button-action="select" ' +
      '   style="background-image:{iconValue}">' +
      '</button>' +
      '<menu class="buttonbar">' +
        '<button class="close-button" data-button-action="close" ' +
        '   role="button" ' +
        '   style="visibility: {closeButtonVisibility}"></button>' +
        '<button class="favorite-button" data-button-action="favorite" ' +
        '   role="button" ' +
        '   style="visibility: {favoriteButtonVisibility}"></button>' +
    '</menu></footer>' +
  '</section>';

  Card.prototype._registerEvents = function tc__registerEvents() {
  };
  Card.prototype._unregisterEvents = function c__registerEvents() {
  };

  Card.prototype._fetchElements = function tc__fetchElements() {
    this.headerContent = this.element.querySelector('header.card-header');
    this.footerContent = this.element.querySelector('footer.card-tray');
    this.footerMenu = this.element.querySelector('.buttonbar');
  };

  /**
   * Populate properties on the instance before templating
   * @memberOf Card.prototype
   */
  Card.prototype._populateViewData = function() {
    var app = this.app;
    this.title = app.name,
    this.subTitle = '';
    this.iconValue = 'none';
    this.closeButtonVisibility = 'visible';
    this.favoriteButtonVisibility = 'visible';
    this.viewClassList = [];

    // app icon overlays screenshot by default
    // and will be removed if/when we display the screenshot
    var iconURI = CardsHelper.getIconURIForApp(this.app);
    if (iconURI) {
        this.iconValue = 'url(' + iconURI + ')';
    }
  };

  /**
   * Build a card representation of an app window.
   * @memberOf Card.prototype
   */
  Card.prototype.render = function() {
    this.publish('willrender');
    var elem = this.element;
    // we maintaine position value on the instance and on the element.dataset
    elem.dataset.position = this.position;

    // we maintaine origin value on the instance and on the element.dataset
    elem.dataset.origin = this.app.origin;

    this._populateViewData();

    // populate the view
    elem.innerHTML = this.view();
    this.viewClassList.forEach(function(cls) {
      elem.classList.add(cls);
    });

    this._fetchElements();
    this._registerEvents();
    this.publish('rendered');
    return elem;
  };

  /**
   * Card html view - builds the innerHTML for a card element
   * @memberOf Card.prototype
   */
  Card.prototype.view = function c_view() {
    var viewData = this;
    return this._template.replace(/\{([^\}]+)\}/g, function(m, key) {
        return viewData[key];
    });
  };

  Card.prototype.bindApp = function(appWindow) {
    this.element.dataset.appId = appWindow.instanceID;
    this.app = appWindow;
    this.render();
    this.element.style.visibility = 'visible';
    this.element.classList.remove('in-transition');
    this.app.enterTaskManager();
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
      this.underlayElement = document.getElementById('screen');
    },

    _registerEvents: function() {
      window.addEventListener('taskmanagershow', this);
      window.addEventListener('taskmanagerhide', this);
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'lockscreen-appopened':
        case 'attentionscreenshow':
          this.attentionScreenApps =
              AttentionScreen.getAttentionScreenOrigins();
          this.hide();
          break;

        case 'taskmanagershow':
          console.log('taskmanagershow handler, is showing? ', this._isShowing);
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
      // hack-central
      var node = target.classList.contains('card-inner') ? target.parentNode :
                 target;
      console.log('handleTap: looking up card from event target: ', target);
      var id = node.dataset.appId;
      var card = id && this.cardById(id);
      if (card) {
        debug('tap card: ', card.app.origin);
        evt.stopPropagation();
        cardsSwipeManager.resetCard();
        this.cardAction(card, 'select');
      } else {
        debug('tap on non-card element: ', node);
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
          this.stackIndex = this.newStackPosition = card.position;
          if (card.position == StackManager.position) {
            console.log('cardAction/select: no change: ', card.app.origin);
            this.hide();
            return;
          }
          console.log('cardAction/select: switch to app: ', card.app.origin);
          var openSequence = new Sequence(
            function() {
              var promise = whenTransitionEnds(card.app.element);
              card.element.classList.add('in-transition');
              card.app.leaveTaskManager();
              return promise;
            },
            onNextFrame(function() {
              AppWindowManager.display(
                card.app,
                'from-cardview',
                null
              );
              this.hide();
            }.bind(this))
          );
          openSequence.start();
      }
    },

    show: function() {
      this._isShowing = true;
      debug('show');

      var screenElm = this.screenElement;
      var containerElement = this.containerElement;
      // XXX borrow the system wallpaper for the homescreen appWindow
      var wallpaper = screenElm.style.backgroundImage;

      // get stack + homescreen
      var stack = this.stack = StackManager.snapshot();
      var cardsMap = this._cardsMap = {};
      var cards = this._cards = [];

      var homeApp = homescreenLauncher.getHomescreen();
      var currentApp = homeApp;

      var stackIndex = this.stackIndex = StackManager.position + 1;
      // put the homescreen at the top of the stack
      // means that all our indices are 1 + StackManager's position
      stack.unshift(homeApp);
      this.currentDisplayed = stackIndex;
      if (stack.length > 1) {
        currentApp = stack[stackIndex];
      }

      var cardWidth = this._windowWidth;
      var gutter = cardWidth/10;

      function positionFor(position, total) {
        var lastIndex = total - 1;
        return (lastIndex - position) * (gutter + cardWidth);
      }

      function createCard(appWindow, position, total) {
        var card = new Card(appWindow, position);
        var elm = card.element;
        elm.dataset.position = position;
        cardsMap[appWindow.instanceID] = card;

        var leftOffset = positionFor(position, total);
        // totalWidth += box.l + cardWidth;
        debug('card ' + position + ' of ' + position + ' at: ', leftOffset);
        debug('card transform ' + card.transform.toString());

        card.transform.translateX = leftOffset + 'px';
        var cardStyle = {
          MozTransform: card.transform.toString()
        };
        // TODO: we'll need to update first/last margins
        // when cards close
        // it would be better to use :first-of-type / :last-of-type but
        // we don't currently insert in any significant order
        // if (position == 0) {
        //   cardStyle.marginRight = '25%';
        // }
        // if (position == total - 1) {
        //   cardStyle.marginLeft = '25%';
        // }

        card.applyStyle(cardStyle);
        return card;
      };

      // call enterTaskManager to start the scale transition on current app
      var showSequence = new Sequence(
        function() {
          homeApp.applyStyle({ backgroundImage: wallpaper });
          screenElm.classList.add('task-manager');
          containerElement.setAttribute('data-task-view', true);
        },
        onNextFrame(function() {
          // create the first card initially and
          // start scaling the appWindow (via enterTaskManager)
          var promise = whenTransitionEnds(currentApp.element);
          var currentCard = createCard(currentApp, stackIndex, stack.length);
          cards[stackIndex] = currentCard;
          containerElement.appendChild(currentCard.element);
          currentCard.bindApp(currentApp);
          return promise;
        }),
        onNextFrame(function layoutCards() {
          var frag = document.createDocumentFragment();
          var totalWidth = stack.length * (cardWidth + gutter);
          var card;

          for(var i = stack.length-1; i >= 0; i--) {
            if (i == stackIndex) {
              // the current card is already done
              continue;
            }
            console.log('layoutCards, creating card at index: ', i);
            card = cards[i] = createCard(stack[i], i, stack.length);

            // XXX hack! cant call fadein() as its not active
            // and we don't want to change state - but we do want to see it
            card.app.element.classList.remove('fadeout');

            frag.appendChild(card.element);
          }
          // force overflow of container
          var lastIndex = stack.length - 1;
          var minWidth = SCALE_FACTOR *
                         (lastIndex - stackIndex) * (cardWidth + gutter);
          var rightEdge = SCALE_FACTOR * (
                            (stack.length * cardWidth) +
                            (lastIndex * gutter) +
                            cardWidth / 4
                          );

          // scroll to center the first app
          containerElement.scrollLeft = minWidth;

          // batch up insertion of the cards to reduce reflows
          containerElement.appendChild(frag);
        }, this),
        (function finishShow() {
          cards.forEach(function(card) {
            card.bindApp(card.app);
          });

          this.gestureDetector.startDetecting();
          ['touchstart', 'pan', 'tap', 'swipe'].forEach(function(evt) {
            containerElement.addEventListener(evt, cardsSwipeManager);
          });
        }).bind(this)
      );
      return showSequence.start().then(null, function(err) {
        console.error('showSequence exception: ', err);
      });
    },

    hide: function(noTransition) {
      this._isShowing = false;
      debug('hide');
      var currentCard = this._cards[this.currentDisplayed];
      var screenElm = this.screenElement;
      var containerElement = this.containerElement;
      var cards = this._cards;

      var hideSequence = new Sequence(
        (function unlisten() {
          ['touchstart', 'pan', 'tap', 'swipe'].forEach(function(evt) {
            containerElement.removeEventListener(evt, cardsSwipeManager);
          });
          this.gestureDetector.stopDetecting();

          // hide the other cards during the transition
          cards.forEach(function(card) {
            if (card !== currentCard) {
              card.applyStyle({
                visibility: 'hidden'
              });
            }
          });
        }).bind(this),
        function startExit() {
          var promise = whenTransitionEnds(currentCard.app.element);
          // put the homescreen background back where it belongs
          // screenElm.style.backgroundImage =
          //     this._cards[0].app.element.style.backgroundImage;

          // reset scroll
          containerElement.scrollLeft = 0;
          // Hack! leave the background there until we're done animating
          if (currentCard.app.isHomescreen) {
            delete currentCard.app._dirtyStyleProperties.backgroundImage;
          }
          currentCard.app.element.classList.add('exit-task-manager');
          currentCard.app.leaveTaskManager();
          setTimeout(function() {
            currentCard.element.classList.add('in-transition');
          }, 0)
          return promise;
        },
        onNextFrame(function finishExit() {
          // current app is back at 100%
          // tear down the task cards
          containerElement.style.backgroundColor = '';
          containerElement.removeAttribute('data-task-view');
          currentCard.app.element.classList.remove('exit-task-manager');
          if (currentCard.app.isHomescreen) {
            delete currentCard.app.element.style.backgroundImage;
          }

          var card;
          debug('hideSwitcher, removing cards');
          while((card = this._cards.shift())) {
            if (card.app.isHomescreen) {
              // relinquish the bg we borrowed
              card.app.applyStyle({ backgroundImage: '' });
            }
            card.app && card.app.leaveTaskManager();
            containerElement.removeChild(card.element);
          }
          debug('/hideSwitcher');
          this._cardsMap = null;
        }, this)
      );
      return hideSequence.start().then(null, function(err) {
        console.warn('Exception in hideSequence: ', err);
      });
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
      // hack-central
      var node = target.classList.contains('card-inner') ? target.parentNode :
                 target;
      var id = node.dataset.appId;
      this.card = id && this.switcher.cardById(id);
      if (!this.card) {
        debug('touchstart on non-card element? ', node);
        return;
      }
      this.containerWidth = this.switcher.containerElement.clientWidth;

      if (this.switcher.inTransition) {
        return;
      }
      debug('/touchstart, setting');
      this.originalAppTransition = this.card.app.element.style.MozTransition;
      this.originalCardTransition = this.card.element.style.MozTransition;
      this.card.applyStyle({ MozTransition: '' });
    },

    pan: function cardSwipe_pan(e) {
      if (1 || this.switcher.inTransition) {
        return;
      }
      debug('pan event: ', this.card.app.origin);
      var cardStyle = {};
      var movement = Math.min(this.containerWidth,
                              Math.abs(e.detail.absolute.dx));
      // scroll go here
      // this.containerElement.style.transform = 'translateX(' +
      //                                         e.detail.absolute.dx +
      //                                         'px)';
      // this.card.applyStyle(cardStyle);
      // var self = this;
      // var card = self.card;
      // card.element.addEventListener('transitionend', function transitionEnded() {
      //   card.element.removeEventListener('transitionend', transitionEnded);
      //   self.resetCard();
      // });
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

      var card = this.card;
      if (!card) {
        return;
      }
      var self = this;
      var cardStyle = {};
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

  // Flow control for a series of steps that may return promises
  function Sequence() {
    var sequence = Array.slice(arguments);
    var aborted = false;
    sequence.abort = function() {
      aborted = true;
      this.length = 0;
      if (typeof this.onabort === 'function') {
        this.onabort();
      }
    };
    sequence.complete = function(result) {
      if(!aborted && typeof this.oncomplete === 'function') {
        this.oncomplete(result);
      }
    };
    sequence.fail = function(reason) {
      this.complete(reason);
    };
    sequence.next = function(previousTaskResult) {
      var result, exception;
      if (aborted) {
        return;
      }
      var task = this.shift();
      if (task) {
        try {
          result = task.apply(null, arguments);
        } catch(e) {
          exception = e;
        }
        if (exception) {
          this.fail(exception);
        } else if (result && typeof result.then === 'function') {
          result.then(this.next.bind(this), this.fail.bind(this));
        } else {
          this.next(result);
        }
      } else {
        this.complete(previousTaskResult);
      }
    };
    sequence.start = function() {
      var p = new Promise(function(resolve, reject) {
        sequence.oncomplete = function(outcome) {
          if (typeof outcome === 'object' && outcome instanceof Error) {
            reject(outcome);
          } else {
            resolve(outcome);
          }
        };
        sequence.next();
      });
      return p;
    };
    return sequence;
  }

  function onNextFrame(fn, thisObj) {
    return function() {
      var promise = new Promise(function(resolve, reject) {
        requestAnimationFrame(function() {
          fn.call(thisObj || window);
          resolve();
        });
      });
      return promise;
    }
  }

  function whenTransitionEnds(elem, timeout) {
    var promise = new Promise(function(resolve, reject) {
      elem.addEventListener('transitionend', function onEnd(evt) {
        clearTimeout(timerId);
        elem.removeEventListener('transitionend', onEnd);
        resolve();
      });
      var timerId = setTimeout(resolve, timeout || 1000);
    });
    return promise;
  }

  function debug(message) {
    if (DEBUG) {
      console.log.apply(console, Array.concat(['TaskSwitcher: '], Array.slice(arguments)));
    }
  }

  exports.TaskSwitcher = TaskSwitcher;
})(window);