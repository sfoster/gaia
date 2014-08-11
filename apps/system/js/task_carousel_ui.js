/* global Card, GestureDetector, Event */

'use strict';

(function(exports) {
  var DEBUG = true;

  /**
   * Represent an array of apps as a kinda carousel
   *
   * The view is built and event listeners attached when the show method
   *
   * Implements some of BaseUI interface (but does not extend that class)
   *
   * @class TaskCarouselUI
   */
  function TaskCarouselUI(config) {
    this.cardsByAppID = {};
    for (var key in config) {
      this[key] = config[key];
    }
  }

  TaskCarouselUI.prototype = Object.create({
    nom: 'TaskCarouselUI',
    _initialized: false,

    /**
     * The TaskManager instance that created us
     * @memberOf TaskCarouselUI.prototype
     */
    manager: null,

    /**
     * Index into the stack of the currently displayed app/card
     * @memberOf TaskManager.prototype
     */
    currentDisplayed: 0,

    /**
     * if 'true' user can close the app by dragging it upwards
     * @memberOf TaskManager.prototype
     */
    allowSwipeToClose: true,

    /**
     * Is a cross-axis drag going on?
     * @memberOf TaskCarouselUI.prototype
     */
    draggingCardUp: false,

    /**
     * Are we moving card left or right?
     * @memberOf TaskCarouselUI.prototype
     */
    sortingDirection: null
  }, {
    /**
     * Getter for the current card
     * @memberOf TaskCarouselUI.prototype
     */
    currentCard: {
      get: function cs_getCurrentCard() {
        console.log('currentCard getter, this.currentDisplayed: ',
          this.currentDisplayed);
        return this.getCardAtIndex(this.currentDisplayed);
      }
    },
    /**
     * Getter for the previous card in the stack
     * @memberOf TaskCarouselUI.prototype
     */
    prevCard: {
      // e.g. stack looks like: 0:phone, 1:Contacts, 2:Settings
      // if currentDisplayed is 0, prev is -1 i.e. null
      get: function cs_getPrevCard() {
        return this.getCardAtIndex(this.currentDisplayed - 1);
      }
    },
    /**
     * Getter for the next card in the stack
     * @memberOf TaskCarouselUI.prototype
     */
    nextCard: {
      // e.g. stack looks like: 0:phone, 1:Contacts, 2:Settings
      // if currentDisplayed is 2, next is 3 i.e. null
      get: function cs_getNextCard() {
        return this.getCardAtIndex(this.currentDisplayed + 1);
      }
    },
    /**
     * Getter to access cached window innerWidth measurement
     * @memberOf TaskCarouselUI.prototype
     */
    windowWidth: {
      get: function cs_getWindowWidth() {
        return this._windowWidth;
      }
    },
    /**
     * Getter to access cached window innerHeight measurement
     * @memberOf TaskCarouselUI.prototype
     */
    windowHeight: {
      get: function cs_getWindowHeight() {
        return this._windowHeight;
      }
    }
  });

  TaskCarouselUI.prototype.init = function() {
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

  TaskCarouselUI.prototype._fetchElements = function() {
    // the DOMElement for the card switcher
    this.element = document.getElementById('cards-view');
    this.cardsList = document.getElementById('cards-list');
    this.screenElement = document.getElementById('screen');
  };

  TaskCarouselUI.prototype._registerEvents = function(evt) {
    window.addEventListener('cardviewbeforeshow', this);
    window.addEventListener('appterminated', this);
  };

  TaskCarouselUI.prototype._unregisterEvents = function(evt) {
    window.removeEventListener('cardviewbeforeshow', this);
    window.removeEventListener('appterminated', this);
    var cardsView = this.element;
    if (cardsView) {
      cardsView.removeEventListener('touchstart', this);
      cardsView.removeEventListener('touchmove', this);
      cardsView.removeEventListener('touchend', this);
      cardsView.removeEventListener('swipe', this);
    }
  };

  TaskCarouselUI.prototype.onBeforeShow = function(evt) {
    // stash some measurements now to avoid unexpected reflow later
    this._windowWidth = window.innerWidth;
    this._windowHeight = window.innerHeight;

    if (!this.initialTouchPosition) {
      this.setupCardSwiping();
    }
  };

  TaskCarouselUI.prototype.show = function() {
    if (this._showing) {
      return;
    }
    var cardsView = this.element;
    var stack = this.stack = this.manager.stack;
    console.log('TCUI show, currentPosition: ', this.manager.currentPosition);
    this.currentDisplayed = this.manager.currentPosition;

    this.screenElement.classList.add('cards-view');
    // If there is no running app, show "no recent apps" message
    if (stack.length) {
      this.element.classList.remove('empty');
    } else {
      this.element.classList.add('empty');
    }

    if (this.allowSwipeToClose) {
      this.element.addEventListener('touchstart', this);
    }

    // events to handle while shown
    window.addEventListener('tap', this);

    // First add an item to the cardsList for each running app
    stack.forEach(function(app, position) {
      this.addCard(position, app);
    }, this);

    this.placeCards();

    // At the beginning only the current card can listen to tap events
    if (stack.length) {
      this.currentCard.applyStyle({pointerEvents: 'auto'});
    }

    cardsView.classList.add('active');

    this._showing = true;
  };

  TaskCarouselUI.prototype.hide = function(removeImmediately) {
    var cardsView = this.element;
    if (!cardsView.classList.contains('active')) {
      // no change
      return;
    }
    cardsView.classList.remove('active');
    this.screenElement.classList.remove('cards-view');
    this._showing = false;
    window.removeEventListener('tap', this);

    if (removeImmediately) {
      this.element.classList.add('no-transition');
    }

    // And remove all the cards from the document after the transition
    if (removeImmediately) {
      this.removeCards();
      cardsView.classList.remove('no-transition');
    } else {
      var cardsViewHidden = (function onTransitionEnd() {
        cardsView.removeEventListener('transitionend', cardsViewHidden);
        this.removeCards();
      }).bind(this);
      cardsView.addEventListener('transitionend', cardsViewHidden);
    }
  };

  /**
   * Insert a new card for the given app
   *
   * @memberOf TaskCarouselUI.prototype
   * @param {Number} position in the stack for the new card
   * @param {AppWindow} app The appWindow the card should wrap and represent
   */
  TaskCarouselUI.prototype.addCard = function cs_addCard(position,
                                                      app) {
    var config = {
      manager: this.manager,
      position: position,
      app: app,
      _windowWidth: this.windowWidth,
      _windowHeight: this.windowHeight
    };
    var card = new Card(config);
    this.cardsByAppID[app.instanceID] = card;
    this.cardsList.appendChild(card.render());
  };

  /**
   * Remove the given card
   *
   * @memberOf TaskCarouselUI.prototype
   * @param {object} card the card instance to be removed
   * @param {Boolean} removeImmediately Whether to skip animations
   */
  TaskCarouselUI.prototype.removeCard = function cs_removeCard(card,
                                                            removeImmediately) {
    var element = card.element;
    var position = element.dataset.position;

    delete this.cardsByAppID[element.dataset.appInstanceId];
    card.destroy();
    element = null;

    // Update the card positions.
    var cardNodes = this.cardsList.childNodes;
    for (var i = position, remainingCard = null; i < cardNodes.length; i++) {
      remainingCard = this.getCardForElement(cardNodes[i]);
      if (remainingCard) {
        remainingCard.position = i;
        cardNodes[i].dataset.position = i;
      }
    }

    // Fix for non selectable cards when we remove the last card
    // Described in https://bugzilla.mozilla.org/show_bug.cgi?id=825293
    var cardsLength = cardNodes.length;
    var currentPosition = this.currentPosition;
    if (cardsLength === this.currentDisplayed) {
      currentPosition = Math.max(0, currentPosition - 1);
      this.manager.currentPosition = currentPosition;
      this.currentDisplayed = currentPosition;
    }

    // If there are no cards left, then dismiss the task switcher.
    if (!cardsLength) {
      this.hide(removeImmediately);
    }
    else {
      this.alignCurrentCard();
    }
  };

  /**
   * Remove all cards
   *
   * @memberOf TaskCarouselUI.prototype
   */
  TaskCarouselUI.prototype.removeCards = function cs_removeCards() {
    // bypass normal removeCards method to efficiently batch-remove all
    Object.keys(this.cardsByAppID).forEach(function(instanceID) {
      var card = this.cardsByAppID[instanceID];
      card.destroy();
    }, this);
    this.cardsByAppID = {};

    this.screenElement.classList.remove('cards-view');
    this.screenElement.classList.remove('task-manager');
    this.cardsList.innerHTML = '';
    this.currentDisplayed = -1;
    this.deltaX = null;
  };

  /**
   * Handle (synthetic) tap events on the card list
   *
   * @memberOf TaskCarouselUI.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskCarouselUI.prototype.handleTap = function cs_handleTap(evt) {
    // Handle close events
    var targetNode = evt.target;
    var containerNode = targetNode.parentNode;
    var card;
    console.log('handleTap with event: ', evt.type);
    if (targetNode.classList.contains('close-card') &&
        this.cardsList.contains(containerNode)) {
      card = this.getCardForElement(containerNode);
      if (card) {
        this.manager.doAction(card.app, 'close');
      }
      return;
    }
    console.log('handleTap, position: ', targetNode.dataset);
    if (('position' in targetNode.dataset) ||
        targetNode.classList.contains('card')) {
      card = this.getCardForElement(targetNode);
      console.log('handleTap, got card: ', card.app.origin);
      if (card) {
        this.manager.doAction(card.app, 'select');
      }
      return;
    }
  };

  /**
   * Handle end-of-drag events on the card list
   *
   * @memberOf TaskCarouselUI.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskCarouselUI.prototype.onEndEvent = function cs_onEndEvent(evt) {
    evt.stopPropagation();
    var element = evt.target;
    var eventDetail = evt.detail;
    var cardsView = this.element;
    var currentPosition = this.manager.currentPosition;

    document.releaseCapture();
    cardsView.removeEventListener('touchmove', this);
    cardsView.removeEventListener('touchend', this);
    cardsView.removeEventListener('swipe', this);

    var eventDetailEnd = eventDetail.end;
    var dx, dy;

    if (eventDetailEnd) {
      dx = eventDetail.dx;
      dy = eventDetail.dy;
    } else {
      if (evt.changedTouches) {
        dx = evt.changedTouches[0].pageX - this.initialTouchPosition[0];
        dy = evt.changedTouches[0].pageY - this.initialTouchPosition[1];
      } else {
        dx = evt.pageX - this.initialTouchPosition[0];
        dy = evt.pageY - this.initialTouchPosition[1];
      }
    }

    if (!this.draggingCardUp) {
      if (Math.abs(dx) > this.threshold) {
        this.onMoveEventForScrolling(dx + this.initialTouchPosition[0]);
        if (this.scrollDirection) {
          if (this.scrollDirection === 'left' &&
                this.currentDisplayed < this.cardsList.childNodes.length - 1) {
            this.currentDisplayed = ++currentPosition;

          } else if (this.scrollDirection === 'right' &&
                     this.currentDisplayed > 0) {
            this.currentDisplayed = --currentPosition;
          }
        }
        this.manager.currentPosition = currentPosition;
        this.alignCurrentCard();
      } else {
        console.log('handling event as tap:', evt.type);
        this.handleTap(evt);
      }
      return;
    }

    // if the element we start dragging on is a card
    if (
      element.classList.contains('card') &&
      this.allowSwipeToClose &&
      this.draggingCardUp
    ) {
      this.draggingCardUp = false;
      var card = this.getCardForElement(element);
      if (-dy > this.swipeUpThreshold &&
          this.manager.attentionScreenApps
            .indexOf(card.app.origin) == -1) {
        // Remove the card from the Task Manager for a smooth transition.
        this.cardsList.removeChild(element);
        this.manager.closeApp(card.app);
      } else {
        card.applyStyle({ MozTransform: '' });
      }
      this.alignCurrentCard();

      return;
    }
  };

  /**
   * Default event handler
   * @memberOf TaskCarouselUI.prototype
   * @param  {DOMEvent} evt The event.
   */
  TaskCarouselUI.prototype.handleEvent = function cv_handleEvent(evt) {
    switch (evt.type) {
      case 'touchstart':
        this.onStartEvent(evt);
        evt.preventDefault();
        break;

      case 'touchmove':
        this.onMoveEvent(evt);
        evt.preventDefault();
        break;

      case 'touchend':
      case 'swipe':
        this.onEndEvent(evt);
        evt.preventDefault();
        break;

      case 'tap':
        console.log('handling event as tap:', evt.type);
        this.handleTap(evt);
        break;

      case 'cardviewbeforeshow':
        this.onBeforeShow(evt);
        break;

      case 'appterminated':
        var app = evt.detail;
        var card = this.cardsByAppID[app.instanceID];
        if (card) {
          this.removeCard(card);
        }
        break;
    }
  };
  /**
   * Set/reset state to prepare for swipe/panning of the card list
   * @memberOf TaskCarouselUI.prototype
   */
  TaskCarouselUI.prototype.setupCardSwiping = function() {
    //scrolling cards (Positon 0 is x-coord and position 1 is y-coord)
    this.initialTouchPosition = [0, 0];
    // For tracking direction changes while scrolling cards
    this.scrollChangePosition = 0;
    this.scrollDirection = null;
    this.lastScrollPosition = 0;
    this.lastScrollDirection = null;
    // If the pointer down event starts outside of a card, then there's
    // no ambiguity between tap/pan, so we don't need a transition
    // threshold.
    //
    // If pointerdown is on a card, then gecko's click detection will
    // resolve the tap/pan ambiguitiy.  So favor responsiveness of
    // switching the card.  It doesn't make sense for users to start
    // swiping because they want to stay on the same card.
    this.threshold = 1;
    // Distance after which dragged card starts moving
    this.moveCardThreshold = this.windowWidth / 6;

    // Arbitrarily chosen to be 4x larger than the gecko18 drag
    // threshold.  This constant should be a truemm/mozmm value, but
    // it's hard for us to evaluate that here.
    this.swipeUpThreshold = 100;
    this.switchingCardThreshold = 30;

    this.deltaX = 0;

    // With this object we avoid several if statements
    this.pseudoCard = {
      applyStyle: function() {},
      element: {
        style: {
          // Empty object
        },
        dataset: {},
        dispatchEvent: function() {
          // Do nothing
        },
        addEventListener: function() {}
      }
    };
  };

  /**
   * Return the card object at the given index into the stack
   * @memberOf TaskCarouselUI.prototype
   * @param {Number} idx index into the stack
   */
  TaskManager.prototype.getCardAtIndex = function(idx) {
    if (this.stack && idx > -1 && idx < this.stack.length) {
      var app = this.stack[idx];
      var card = app && this.cardsByAppID[app.instanceID];
      if (card) {
        return card;
      }
    }
    debug('getCardAtIndex, no card at idx: ' + idx);
    return null;
  };

  /**
   * Return the card object that owns the given element
   * @memberOf TaskCarouselUI.prototype
   * @param {DOMNode} element
   */
  TaskCarouselUI.prototype.getCardForElement = function(element) {
    return element && this.cardsByAppID[element.dataset.appInstanceId];
  };

  /**
   * Arrange the cards around the current position
   * @memberOf TaskCarouselUI.prototype
   */
  TaskCarouselUI.prototype.placeCards = function() {
    var currentCard = this.currentCard;
    if (!currentCard) {
      return;
    }

    var pseudoCard = this.pseudoCard;
    var siblingScale = currentCard.SIBLING_SCALE_FACTOR;
    var currentScale = currentCard.SCALE_FACTOR;
    var siblingOpacity = currentCard.SIBLING_OPACITY;

    currentCard.element.dispatchEvent(new CustomEvent('onviewport'));
    // accumulate style property values on an object
    // which we'll send to that card's applyStyle method
    var currentCardStyle = {};

    var prevCard = this.prevCard || pseudoCard;
    prevCard.element.dispatchEvent(new CustomEvent('onviewport'));
    var prevCardStyle = {};

    var nextCard = this.nextCard || pseudoCard;
    nextCard.element.dispatchEvent(new CustomEvent('onviewport'));
    var nextCardStyle = {};

    // Scaling and translating cards to reach target positions
    prevCardStyle.MozTransform =
      'scale(' + siblingScale + ') translateX(-100%)';
    currentCardStyle.MozTransform =
      'scale(' + currentScale + ') translateX(0)';
    nextCardStyle.MozTransform =
      'scale(' + siblingScale + ') translateX(100%)';

    // Current card sets the z-index to level 2 and opacity to 1
    currentCardStyle.zIndex = 2;
    currentCardStyle.opacity = 1;

    // Previous and next cards set the z-index to level 1 and opacity to 0.4
    prevCardStyle.zIndex = nextCardStyle.zIndex = 1;
    prevCardStyle.opacity = nextCardStyle.opacity = siblingOpacity;

    currentCard.applyStyle(currentCardStyle);
    prevCard.applyStyle(prevCardStyle);
    nextCard.applyStyle(nextCardStyle);
  };

  /**
   * Get the current card front and center
   * @memberOf TaskCarouselUI.prototype
   */
  TaskCarouselUI.prototype.alignCurrentCard = function(noTransition) {
    // We're going to release memory hiding card out of screen
    var currentCard = this.currentCard;
    if (!currentCard) {
      return;
    }
    var pseudoCard = this.pseudoCard;
    var prevCard = this.prevCard || pseudoCard;
    var nextCard = this.nextCard || pseudoCard;
    var prevCardStyle = {
      pointerEvents: 'none',
      MozTransition: currentCard.MOVE_TRANSITION
    };
    var nextCardStyle = {
      pointerEvents: 'none',
      MozTransition: currentCard.MOVE_TRANSITION
    };
    var currentCardStyle = {
      pointerEvents: 'auto',
      MozTransition: currentCard.MOVE_TRANSITION
    };

    if (this.deltaX < 0) {
      prevCard && prevCard.element.dispatchEvent(
        new CustomEvent('outviewport')
      );
    } else {
      nextCard && nextCard.element.dispatchEvent(
        new CustomEvent('outviewport')
      );
    }

    this.placeCards();

    currentCard.applyStyle(currentCardStyle);
    nextCard.applyStyle(nextCardStyle);
    prevCard.applyStyle(prevCardStyle);

    var onCardTransitionEnd = function transitionend() {
      currentCard.element.removeEventListener('transitionend',
                                              onCardTransitionEnd);
      var zeroTransitionStyle = { MozTransition: '' };
      prevCard.applyStyle(zeroTransitionStyle);
      nextCard.applyStyle(zeroTransitionStyle);
      currentCard.applyStyle(zeroTransitionStyle);
    };

    currentCard.element.addEventListener('transitionend', onCardTransitionEnd);

    if (noTransition) {
      currentCard.element.dispatchEvent(new Event('transitionend'));
    }
    // done with delta
    this.deltaX = 0;
  };

  /**
   * Adjust card positions by our current delta values
   * @memberOf TaskCarouselUI.prototype
   */
  TaskCarouselUI.prototype.moveCards = function() {
    var deltaX = this.deltaX;
    var pseudoCard = this.pseudoCard;
    var nextStyle = {};
    var prevStyle = {};
    var currentCardStyle = {};
    var translateSign = (deltaX > 0) ? 100 : -100;
    var movementFactor = Math.abs(deltaX) / this.windowWidth;
    var currentCard = this.currentCard;

    var siblingScale = currentCard.SIBLING_SCALE_FACTOR;
    var currentScale = currentCard.SCALE_FACTOR;
    var scaleFactor = Math.abs((deltaX / this.windowWidth) *
                      (currentScale - siblingScale));
    var siblingOpacity = currentCard.SIBLING_OPACITY;

    // Scaling and translating next or previous sibling
    nextStyle.MozTransform = 'scale(' + (siblingScale + scaleFactor) +
        ') translateX(' + (translateSign * (1 - movementFactor)) + '%)';
    // Fading in new card
    nextStyle.opacity = siblingOpacity + (movementFactor *
                                          (1 - siblingOpacity));
    // Hiding the opposite sibling card progressively
    prevStyle.opacity = siblingOpacity - movementFactor;
    // Fading out current card
    currentCardStyle.opacity = 1 - (movementFactor * (1 - siblingOpacity));

    // Scaling and translating current card
    currentCardStyle.MozTransform = 'scale(' + (currentScale - scaleFactor) +
                                    ') translateX(' + -deltaX + 'px)';

    this.currentCard.applyStyle(currentCardStyle);
    if (deltaX > 0) {
      (this.nextCard || pseudoCard).applyStyle(nextStyle);
      (this.prevCard || pseudoCard).applyStyle(prevStyle);
    } else {
      (this.prevCard || pseudoCard).applyStyle(nextStyle);
      (this.nextCard || pseudoCard).applyStyle(prevStyle);
    }

  };

  /**
   * @memberOf TaskCarouselUI.prototype
   * @param {DOMEvent} evt
   */
  TaskCarouselUI.prototype.onMoveEventForScrolling = function(touchPosition) {
    this.deltaX = this.initialTouchPosition[0] - touchPosition;

    var getScrollDirection = function(position) {
      if (position > 0) {
        if (this.deltaX > 0) {
          return 'left';
        }
      } else if (position < 0) {
        if (this.deltaX < 0) {
          return 'right';
        }
      }
      return null;
    }.bind(this);

    // Track touch direction and allow for scroll direction changes if the user
    // starts dragging in a different direction than before.
    var touchChange = this.lastScrollPosition - touchPosition;
    if (Math.abs(touchChange) !== 0) {
      var touchDirection = getScrollDirection(touchChange);
      if (this.lastScrollDirection != touchDirection) {
        this.scrollChangePosition = touchPosition;
        this.lastScrollDirection = touchDirection;
      }
      this.lastScrollPosition = touchPosition;
    }

    // If the user has dragged past the threshold since the last touch
    // direction change, mark that as the scroll direction.
    var scrollChange = this.scrollChangePosition - touchPosition;
    if (Math.abs(scrollChange) > this.switchingCardThreshold) {
      var scrollDirection = getScrollDirection(scrollChange);
      if (scrollDirection !== this.scrollDirection) {
        this.scrollDirection = scrollDirection;
        this.scrollChangePosition = touchPosition;
      }
    }
  };

  /**
   * @memberOf TaskCarouselUI.prototype
   * @param {DOMEvent} evt
   */
  TaskCarouselUI.prototype.onMoveEventForDeleting = function(evt, deltaY) {
    var dy = deltaY | this.initialTouchPosition[1] -
                              (evt.touches ? evt.touches[0].pageY : evt.pageY);
    this.draggingCardUp = (dy > 0);
    if (this.draggingCardUp) {
      var card = this.getCardForElement(evt.target);
      if (!card) {
        return;
      }
      if ('function' == typeof card.move) {
        card.move(this.deltaX, -dy);
      } else {
        card.applyStyle({
          MozTransform: 'scale(' + card.SCALE_FACTOR + ') ' +
                        'translateY(' + (-dy) + 'px)'
        });
      }
    }
  };

  /**
   * @memberOf TaskCarouselUI.prototype
   * @param {DOMEvent} evt
   */
  TaskCarouselUI.prototype.onStartEvent = function cs_onStartEvent(evt) {
    var cardsView = this.element;
    evt.stopPropagation();

    // If there is no card in the cardsView, go back to home screen
    if (cardsView.classList.contains('empty')) {
      this.manager.goToHomescreen(evt);
      return;
    }

    evt.target.setCapture(true);
    cardsView.addEventListener('touchmove', this);
    cardsView.addEventListener('touchend', this);
    cardsView.addEventListener('swipe', this);
    this._dragPhase = '';

    if (evt.touches) {
      this.initialTouchPosition = [evt.touches[0].pageX, evt.touches[0].pageY];
    } else {
      this.initialTouchPosition = [evt.pageX, evt.pageY];
    }
    this.scrollChangePosition = this.lastScrollPosition =
      this.initialTouchPosition[0];
    this.scrollDirection = this.lastScrollDirection = null;
  };

  /**
   * @memberOf TaskCarouselUI.prototype
   * @param {DOMEvent} evt
   */
  TaskCarouselUI.prototype.onMoveEvent = function cs_onMoveEvent(evt) {
    evt.stopPropagation();
    var touchPosition = evt.touches ? [evt.touches[0].pageX,
                                       evt.touches[0].pageY] :
                                      [evt.pageX, evt.pageY];

    var deltaY = this.initialTouchPosition[1] - touchPosition[1];

    switch (this._dragPhase) {
      case 'cross-slide':
        this.onMoveEventForDeleting(evt, deltaY);
        break;
      case 'scrolling':
        this.onMoveEventForScrolling(touchPosition[0]);
        this.moveCards();
        break;
      default:
        if (this.allowSwipeToClose && deltaY > this.moveCardThreshold &&
            evt.target.classList.contains('card')) {
          // We don't want user to scroll the CardsView when one of the card is
          // already dragger upwards
          this._dragPhase = 'cross-slide';
          this.draggingCardUp = true;
          this.onMoveEventForDeleting(evt, deltaY);
        } else {
          // If we are not removing Cards now and Snapping Scrolling is enabled,
          // we want to scroll the CardList
          this.onMoveEventForScrolling(touchPosition[0]);
          if (Math.abs(this.deltaX) > this.switchingCardThreshold) {
            this._dragPhase = 'scrolling';
          }
          this.moveCards();
        }
    }
  };

  exports.TaskCarouselUI = TaskCarouselUI;

  function debug(message) {
    if (DEBUG) {
      console.log('TaskCarouselUI > \n  ', message);
    }
  }
})(window);

