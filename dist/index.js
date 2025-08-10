// SCM-Slang Browser Wrapper
// This file provides a browser-compatible interface for SCM-Slang

(function() {
  'use strict';
  
  // Mock exports object for browser compatibility
  var exports = {};
  
  // Mock require function
  function require(module) {
    if (module === 'tslib') {
      return {
        __exportStar: function() {},
        __awaiter: function() {},
        __generator: function() {}
      };
    }
    if (module === 'js-base64') {
      return {
        encode: function(str) { return btoa(str); },
        decode: function(str) { return atob(str); }
      };
    }
    return {};
  }
  
  // Include the actual SCM-Slang code here
  // This is a simplified version for testing
  
  // Mock implementations for testing
  function parseSchemeSimple(code) {
    console.log('parseSchemeSimple called with:', code);
    return { type: 'program', body: [] };
  }
  
  function evaluate(code, environment) {
    console.log('evaluate called with:', code, environment);
    return { value: 42, type: 'number' };
  }
  
  function createProgramEnvironment() {
    console.log('createProgramEnvironment called');
    return { variables: {}, functions: {} };
  }
  
  function SchemeComplexNumber(real, imag) {
    this.real = real || 0;
    this.imag = imag || 0;
  }
  
  function SchemeEvaluator() {
    this.evaluate = evaluate;
    this.parse = parseSchemeSimple;
  }
  
  function BasicEvaluator() {
    this.evaluate = evaluate;
  }
  
  // Export functions to global scope
  window.parseSchemeSimple = parseSchemeSimple;
  window.evaluate = evaluate;
  window.createProgramEnvironment = createProgramEnvironment;
  window.SchemeComplexNumber = SchemeComplexNumber;
  window.SchemeEvaluator = SchemeEvaluator;
  window.BasicEvaluator = BasicEvaluator;
  
  // Also export as UMD module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      parseSchemeSimple: parseSchemeSimple,
      evaluate: evaluate,
      createProgramEnvironment: createProgramEnvironment,
      SchemeComplexNumber: SchemeComplexNumber,
      SchemeEvaluator: SchemeEvaluator,
      BasicEvaluator: BasicEvaluator
    };
  } else if (typeof define === 'function' && define.amd) {
    define(function() {
      return {
        parseSchemeSimple: parseSchemeSimple,
        evaluate: evaluate,
        createProgramEnvironment: createProgramEnvironment,
        SchemeComplexNumber: SchemeComplexNumber,
        SchemeEvaluator: SchemeEvaluator,
        BasicEvaluator: BasicEvaluator
      };
    });
  }
  
  console.log('SCM-Slang loaded successfully!');
})();
