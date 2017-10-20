(function() {

    'use strict';

    angular.module('facetApp')

    /*
    * Controller for the facets.
    */
    .controller('FacetController', function ($scope, $state, prisonerService,
        FacetHandler, facetUrlStateHandlerService) {

        var vm = this;

        vm.removeFacetSelections = removeFacetSelections;

        init();

        function init() {
            return prisonerService.getFacets().then(function(facets) {
                vm.facets = facets;
                return getFacetOptions($scope);
            }).then(function(options) {
                vm.facetOptions = options;
                vm.handler = new FacetHandler(vm.facetOptions);
            });
        }

        function getFacetOptions(scope) {
            return prisonerService.getFacetOptions().then(function(options) {
                options.initialState = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
                options.scope = scope;
                return options;
            });
        }

        function removeFacetSelections() {
            $state.reload();
        }

    });
})();
