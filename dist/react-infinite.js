(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Infinite = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var React = require('react'),
    _isFinite = require('lodash.isfinite'),
    ConstantInfiniteComputer = require('./computers/constant_infinite_computer.js'),
    ArrayInfiniteComputer = require('./computers/array_infinite_computer.js');

var Infinite = React.createClass({displayName: "Infinite",

  propTypes: {
    handleScroll: React.PropTypes.func,

    // preloadBatchSize causes updates only to
    // happen each preloadBatchSize pixels of scrolling.
    // Set a larger number to cause fewer updates to the
    // element list.
    preloadBatchSize: React.PropTypes.number,
    // preloadAdditionalHeight determines how much of the
    // list above and below the container is preloaded even
    // when it is not currently visible to the user. In the
    // regular scroll implementation, preloadAdditionalHeight
    // is equal to the entire height of the list.
    preloadAdditionalHeight: React.PropTypes.number, // page to screen ratio

    // The provided elementHeight can be either
    //  1. a constant: all elements are the same height
    //  2. an array containing the height of each element
    elementHeight: React.PropTypes.oneOfType([
      React.PropTypes.number,
      React.PropTypes.arrayOf(React.PropTypes.number)
    ]).isRequired,
    // This is the total height of the visible window.
    containerHeight: React.PropTypes.number.isRequired,

    infiniteLoadBeginBottomOffset: React.PropTypes.number,
    onInfiniteLoad: React.PropTypes.func,
    loadingSpinnerDelegate: React.PropTypes.node,

    isInfiniteLoading: React.PropTypes.bool,
    timeScrollStateLastsForAfterUserScrolls: React.PropTypes.number,

    className: React.PropTypes.string
  },

  getDefaultProps:function() {
    return {
      handleScroll: function()  {},
      loadingSpinnerDelegate: React.createElement("div", null),
      onInfiniteLoad: function()  {},
      isInfiniteLoading: false,
      timeScrollStateLastsForAfterUserScrolls: 150
    };
  },

  // automatic adjust to scroll direction
  // give spinner a ReactCSSTransitionGroup
  getInitialState:function() {
    var computer = this.createInfiniteComputer(this.props.elementHeight, this.props.children);

    var preloadBatchSize = this.getPreloadBatchSizeFromProps(this.props);
    var preloadAdditionalHeight = this.getPreloadAdditionalHeightFromProps(this.props);

    return {
      infiniteComputer: computer,

      numberOfChildren: React.Children.count(this.props.children),
      displayIndexStart: 0,
      displayIndexEnd: computer.getDisplayIndexEnd(
                        preloadBatchSize + preloadAdditionalHeight
                      ),

      isInfiniteLoading: false,

      preloadBatchSize: preloadBatchSize,
      preloadAdditionalHeight: preloadAdditionalHeight,

      scrollTimeout: undefined,
      isScrolling: false
    };
  },

  createInfiniteComputer:function(data, children) {
    var computer;
    var numberOfChildren = React.Children.count(children);

    if (_isFinite(data)) {
      computer = new ConstantInfiniteComputer(data, numberOfChildren);
    } else if (Array.isArray(data)) {
      computer = new ArrayInfiniteComputer(data, numberOfChildren);
    } else {
      throw new Error('You must provide either a number or an array of numbers as the elementHeight prop.');
    }

    return computer;
  },

  componentWillReceiveProps:function(nextProps) {
    var that = this,
        newStateObject = {};

    // TODO: more efficient elementHeight change detection
    newStateObject.infiniteComputer = this.createInfiniteComputer(
                                        nextProps.elementHeight,
                                        nextProps.children
                                      );

    if (nextProps.isInfiniteLoading !== undefined) {
      newStateObject.isInfiniteLoading = nextProps.isInfiniteLoading;
    }

    newStateObject.preloadBatchSize = this.getPreloadBatchSizeFromProps(nextProps);
    newStateObject.preloadAdditionalHeight = this.getPreloadAdditionalHeightFromProps(nextProps);

    this.setState(newStateObject, function()  {
      that.setStateFromScrollTop(that.getScrollTop());
    });
  },

  getPreloadBatchSizeFromProps:function(props) {
    return typeof props.preloadBatchSize === 'number' ?
      props.preloadBatchSize :
      props.containerHeight / 2;
  },

  getPreloadAdditionalHeightFromProps:function(props) {
    return typeof props.preloadAdditionalHeight === 'number' ?
      props.preloadAdditionalHeight :
      props.containerHeight;
  },

  componentDidUpdate:function(prevProps) {
    if (React.Children.count(this.props.children) !== React.Children.count(prevProps.children)) {
      this.setStateFromScrollTop(this.getScrollTop());
    }
  },

  componentWillMount:function() {
    if (Array.isArray(this.props.elementHeight)) {
      if (React.Children.count(this.props.children) !== this.props.elementHeight.length) {
        throw new Error('There must be as many values provided in the elementHeight prop as there are children.');
      }
    }
  },

  getScrollTop:function() {
    return this.refs.scrollable.scrollTop;
  },

  // Given the scrollTop of the container, computes the state the
  // component should be in. The goal is to abstract all of this
  // from any actual representation in the DOM.
  // The window is the block with any preloadAdditionalHeight
  // added to it.
  setStateFromScrollTop:function(scrollTop) {
    var blockNumber = this.state.preloadBatchSize === 0 ? 0 : Math.floor(scrollTop / this.state.preloadBatchSize),
        blockStart = this.state.preloadBatchSize * blockNumber,
        blockEnd = blockStart + this.state.preloadBatchSize,
        windowTop = Math.max(0, blockStart - this.state.preloadAdditionalHeight),
        windowBottom = Math.min(this.state.infiniteComputer.getTotalScrollableHeight(),
                        blockEnd + this.state.preloadAdditionalHeight);
    this.setState({
      displayIndexStart: this.state.infiniteComputer.getDisplayIndexStart(windowTop),
      displayIndexEnd: this.state.infiniteComputer.getDisplayIndexEnd(windowBottom)
    });
  },

  infiniteHandleScroll:function(e) {
    if (e.target !== this.refs.scrollable) {
      return;
    }

    this.props.handleScroll(this.refs.scrollable);
    this.handleScroll(e.target.scrollTop);
  },

  manageScrollTimeouts:function() {
    // Maintains a series of timeouts to set this.state.isScrolling
    // to be true when the element is scrolling.

    if (this.state.scrollTimeout) {
      clearTimeout(this.state.scrollTimeout);
    }

    var that = this,
        scrollTimeout = setTimeout(function()  {
          that.setState({
            isScrolling: false,
            scrollTimeout: undefined
          });
        }, this.props.timeScrollStateLastsForAfterUserScrolls);

    this.setState({
      isScrolling: true,
      scrollTimeout: scrollTimeout
    });
  },

  handleScroll:function(scrollTop) {
    this.manageScrollTimeouts();
    this.setStateFromScrollTop(scrollTop);
    var infiniteScrollBottomLimit = scrollTop >
        (this.state.infiniteComputer.getTotalScrollableHeight() -
          this.props.containerHeight -
          this.props.infiniteLoadBeginBottomOffset);
    if (infiniteScrollBottomLimit && !this.state.isInfiniteLoading) {
      this.setState({
        isInfiniteLoading: true
      });
      this.props.onInfiniteLoad();
    }
  },

  // Helpers for React styles.
  buildScrollableStyle:function() {
    return {
      height: this.props.containerHeight,
      overflowX: 'hidden',
      overflowY: 'scroll'
    };
  },

  buildHeightStyle:function(height) {
    return {
      width: '100%',
      height: Math.ceil(height)
    };
  },

  render:function() {
    var displayables = this.props.children.slice(this.state.displayIndexStart,
                                                 this.state.displayIndexEnd + 1);

    var infiniteScrollStyles = {};
    if (this.state.isScrolling) {
      infiniteScrollStyles.pointerEvents = 'none';
    }

    var topSpacerHeight = this.state.infiniteComputer.getTopSpacerHeight(this.state.displayIndexStart),
        bottomSpacerHeight = this.state.infiniteComputer.getBottomSpacerHeight(this.state.displayIndexEnd);

    // topSpacer and bottomSpacer take up the amount of space that the
    // rendered elements would have taken up otherwise
    return React.createElement("div", {className: this.props.className ? this.props.className : '', 
                ref: "scrollable", 
                style: this.buildScrollableStyle(), 
                onScroll: this.infiniteHandleScroll}, 
      React.createElement("div", {ref: "smoothScrollingWrapper", style: infiniteScrollStyles}, 
        React.createElement("div", {ref: "topSpacer", 
             style: this.buildHeightStyle(topSpacerHeight)}), 
            displayables, 
        React.createElement("div", {ref: "bottomSpacer", 
             style: this.buildHeightStyle(bottomSpacerHeight)}), 
        React.createElement("div", {ref: "loadingSpinner"}, 
             this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null
        )
      )
    );
  }
});

module.exports = Infinite;


},{"./computers/array_infinite_computer.js":3,"./computers/constant_infinite_computer.js":4,"lodash.isfinite":2,"react":undefined}],2:[function(require,module,exports){
(function (global){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsFinite = global.isFinite;

/**
 * Checks if `value` is a finite primitive number.
 *
 * **Note:** This method is based on [`Number.isFinite`](http://ecma-international.org/ecma-262/6.0/#sec-number.isfinite).
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a finite number, else `false`.
 * @example
 *
 * _.isFinite(10);
 * // => true
 *
 * _.isFinite('10');
 * // => false
 *
 * _.isFinite(true);
 * // => false
 *
 * _.isFinite(Object(10));
 * // => false
 *
 * _.isFinite(Infinity);
 * // => false
 */
function isFinite(value) {
  return typeof value == 'number' && nativeIsFinite(value);
}

module.exports = isFinite;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
/* @flow */

var InfiniteComputer = require('./infinite_computer.js'),
    bs = require('../utils/binary_index_search.js');

for(var InfiniteComputer____Key in InfiniteComputer){if(InfiniteComputer.hasOwnProperty(InfiniteComputer____Key)){ArrayInfiniteComputer[InfiniteComputer____Key]=InfiniteComputer[InfiniteComputer____Key];}}var ____SuperProtoOfInfiniteComputer=InfiniteComputer===null?null:InfiniteComputer.prototype;ArrayInfiniteComputer.prototype=Object.create(____SuperProtoOfInfiniteComputer);ArrayInfiniteComputer.prototype.constructor=ArrayInfiniteComputer;ArrayInfiniteComputer.__superConstructor__=InfiniteComputer;

  function ArrayInfiniteComputer(heightData/* : Array<number> */, numberOfChildren   )/* : void */ {"use strict";
    InfiniteComputer.call(this,heightData, numberOfChildren);
    this.prefixHeightData = this.heightData.reduce(function(acc, next)  {
      if (acc.length === 0) {
        return [next];
      } else {
        acc.push(acc[acc.length - 1] + next);
        return acc;
      }
    }, []);
  }

  Object.defineProperty(ArrayInfiniteComputer.prototype,"maybeIndexToIndex",{writable:true,configurable:true,value:function(index   )/* : number */ {"use strict";
    if (typeof index === 'undefined' || index === null) {
      return this.prefixHeightData.length - 1;
    } else {
      return index;
    }
  }});

  Object.defineProperty(ArrayInfiniteComputer.prototype,"getTotalScrollableHeight",{writable:true,configurable:true,value:function()/* : number */ {"use strict";
    var length = this.prefixHeightData.length;
    return length === 0 ? 0 : this.prefixHeightData[length - 1];
  }});

  Object.defineProperty(ArrayInfiniteComputer.prototype,"getDisplayIndexStart",{writable:true,configurable:true,value:function(windowTop   )/* : number */ {"use strict";
    var foundIndex = bs.binaryIndexSearch(this.prefixHeightData, windowTop, bs.opts.CLOSEST_HIGHER);
    return this.maybeIndexToIndex(foundIndex);
  }});

  Object.defineProperty(ArrayInfiniteComputer.prototype,"getDisplayIndexEnd",{writable:true,configurable:true,value:function(windowBottom   )/* : number */ {"use strict";
    var foundIndex = bs.binaryIndexSearch(this.prefixHeightData, windowBottom, bs.opts.CLOSEST_HIGHER);
    return this.maybeIndexToIndex(foundIndex);
  }});

  Object.defineProperty(ArrayInfiniteComputer.prototype,"getTopSpacerHeight",{writable:true,configurable:true,value:function(displayIndexStart   )/* : number */ {"use strict";
    var previous = displayIndexStart - 1;
    return previous < 0 ? 0 : this.prefixHeightData[previous];
  }});

  Object.defineProperty(ArrayInfiniteComputer.prototype,"getBottomSpacerHeight",{writable:true,configurable:true,value:function(displayIndexEnd   )/* : number */ {"use strict";
    if (displayIndexEnd === -1) {
      return 0;
    }
    return this.getTotalScrollableHeight() - this.prefixHeightData[displayIndexEnd];
  }});


module.exports = ArrayInfiniteComputer;


},{"../utils/binary_index_search.js":6,"./infinite_computer.js":5}],4:[function(require,module,exports){
/* @flow */

var InfiniteComputer = require('./infinite_computer.js');

for(var InfiniteComputer____Key in InfiniteComputer){if(InfiniteComputer.hasOwnProperty(InfiniteComputer____Key)){ConstantInfiniteComputer[InfiniteComputer____Key]=InfiniteComputer[InfiniteComputer____Key];}}var ____SuperProtoOfInfiniteComputer=InfiniteComputer===null?null:InfiniteComputer.prototype;ConstantInfiniteComputer.prototype=Object.create(____SuperProtoOfInfiniteComputer);ConstantInfiniteComputer.prototype.constructor=ConstantInfiniteComputer;ConstantInfiniteComputer.__superConstructor__=InfiniteComputer;function ConstantInfiniteComputer(){"use strict";if(InfiniteComputer!==null){InfiniteComputer.apply(this,arguments);}}
  Object.defineProperty(ConstantInfiniteComputer.prototype,"getTotalScrollableHeight",{writable:true,configurable:true,value:function()/* : number */ {"use strict";
    return this.heightData * this.numberOfChildren;
  }});

  Object.defineProperty(ConstantInfiniteComputer.prototype,"getDisplayIndexStart",{writable:true,configurable:true,value:function(windowTop   )/* : number */ {"use strict";
    return Math.floor(windowTop / this.heightData);
  }});

  Object.defineProperty(ConstantInfiniteComputer.prototype,"getDisplayIndexEnd",{writable:true,configurable:true,value:function(windowBottom   )/* : number */ {"use strict";
    var nonZeroIndex = Math.ceil(windowBottom / this.heightData);
    if (nonZeroIndex > 0) {
      return nonZeroIndex - 1;
    }
    return nonZeroIndex;
  }});

  Object.defineProperty(ConstantInfiniteComputer.prototype,"getTopSpacerHeight",{writable:true,configurable:true,value:function(displayIndexStart   )/* : number */ {"use strict";
    return displayIndexStart * this.heightData;
  }});

  Object.defineProperty(ConstantInfiniteComputer.prototype,"getBottomSpacerHeight",{writable:true,configurable:true,value:function(displayIndexEnd   )/* : number */ {"use strict";
    var nonZeroIndex = displayIndexEnd + 1;
    return Math.max(0, (this.numberOfChildren - nonZeroIndex) * this.heightData);
  }});


module.exports = ConstantInfiniteComputer;


},{"./infinite_computer.js":5}],5:[function(require,module,exports){
// An infinite computer must be able to do the following things:
//  1. getTotalScrollableHeight()
//  2. getDisplayIndexStart()
//  3. getDisplayIndexEnd()


  function InfiniteComputer(heightData, numberOfChildren) {"use strict";
    this.heightData = heightData;
    this.numberOfChildren = numberOfChildren;
  }

  Object.defineProperty(InfiniteComputer.prototype,"getTotalScrollableHeight",{writable:true,configurable:true,value:function() {"use strict";
    throw new Error('getTotalScrollableHeight not implemented.');
  }});

  /* eslint-disable no-unused-vars */
  Object.defineProperty(InfiniteComputer.prototype,"getDisplayIndexStart",{writable:true,configurable:true,value:function(windowTop) {"use strict";
  /* eslint-enable no-unused-vars */
    throw new Error('getDisplayIndexStart not implemented.');
  }});

  /* eslint-disable no-unused-vars */
  Object.defineProperty(InfiniteComputer.prototype,"getDisplayIndexEnd",{writable:true,configurable:true,value:function(windowBottom) {"use strict";
  /* eslint-enable no-unused-vars */
    throw new Error('getDisplayIndexEnd not implemented.');
  }});

  // These are helper methods, and can be calculated from
  // the above details.
  /* eslint-disable no-unused-vars */
  Object.defineProperty(InfiniteComputer.prototype,"getTopSpacerHeight",{writable:true,configurable:true,value:function(displayIndexStart) {"use strict";
  /* eslint-enable no-unused-vars */
    throw new Error('getTopSpacerHeight not implemented.');
  }});

  /* eslint-disable no-unused-vars */
  Object.defineProperty(InfiniteComputer.prototype,"getBottomSpacerHeight",{writable:true,configurable:true,value:function(displayIndexEnd) {"use strict";
  /* eslint-enable no-unused-vars */
    throw new Error('getBottomSpacerHeight not implemented.');
  }});


module.exports = InfiniteComputer;


},{}],6:[function(require,module,exports){
/* @flow */

var opts = {
  CLOSEST_LOWER: 1,
  CLOSEST_HIGHER: 2
};

var binaryIndexSearch = function(array/* : Array<number> */,
                                 item/* : number */,
                                 opt/* : number */)/* : ?number */{
  var index;

  var high = array.length - 1,
      low = 0,
      middle,
      middleItem;

  while (low <= high) {
    middle = low + Math.floor((high - low) / 2);
    middleItem = array[middle];

    if (middleItem === item) {
      return middle;
    } else if (middleItem < item) {
      low = middle + 1;
    } else if (middleItem > item) {
      high = middle - 1;
    }
  }

  if (opt === opts.CLOSEST_LOWER && low > 0) {
    index = low - 1;
  } else if (opt === opts.CLOSEST_HIGHER && high < array.length - 1) {
    index = high + 1;
  }

  return index;
};

module.exports = {
  binaryIndexSearch: binaryIndexSearch,
  opts: opts
};


},{}]},{},[1])(1)
});