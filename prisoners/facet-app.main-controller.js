/*
 * Semantic faceted search
 *
 */

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    /*
    * Controller for the results view.
    */
    .controller( 'MainController', function ( _, RESULTS_PER_PAGE,
                prisonerService, NgTableParams, facetUrlStateHandlerService ) {
        var vm = this;
        vm.facetOptions = getFacetOptions();
        prisonerService.getFacets().then(function(facets) {
            vm.facets = facets;
        });

        vm.disableFacets = disableFacets;

        function disableFacets() {
            return vm.isLoadingResults;
        }

        function initializeTable() {
            vm.tableParams = new NgTableParams(
                {
                    count: RESULTS_PER_PAGE
                },
                {
                    getData: getData
                }
            );
        }

        function getFacetOptions() {
            var options = prisonerService.getFacetOptions();
            options.updateResults = updateResults;
            options.initialValues = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }

        function getData($defer, params) {
            vm.isLoadingResults = true;

            vm.pager.getPage(params.page() - 1, params.count())
            .then( function( page ) {
                $defer.resolve( page );
                vm.pager.getTotalCount().then(function(count) {
                    vm.tableParams.total( count );
                }).then(function() {
                    vm.isLoadingResults = false;
                });
            });
        }

        function updateResults( facetSelections ) {
            facetUrlStateHandlerService.updateUrlParams(facetSelections);
            vm.isLoadingResults = true;

            prisonerService.getResults( facetSelections )
            .then( function ( pager ) {
                vm.pager = pager;
                if (vm.tableParams) {
                    vm.tableParams.page(1);
                    vm.tableParams.reload();
                } else {
                    initializeTable();
                }
            });
        }
    });
})();
