(function() {
    'use strict';

    /* ngInject */
    angular.module('facetApp').filter('castArray', function(_) {
        return function(input) {
            return input ? _.castArray(input) : input;
        };
    })
    /* ngInject */
    .filter('join', function(_, castArrayFilter) {
        return function(input, delimiter) {
            return castArrayFilter(input).join(delimiter);
        };
    });
})();
