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
    /* @ngInject */
    .controller('MainController', function($scope, _, RESULTS_PER_PAGE, EVENT_REQUEST_CONSTRAINTS,
        prisonerService, NgTableParams, FacetHandler, facetUrlStateHandlerService ) {

        var vm = this;

        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);
        $scope.$emit(EVENT_REQUEST_CONSTRAINTS);  // Request facet selections from facet handler

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

        function updateResults(event, facetSelections) {
            if (_.isEqual(vm.previousSelections, facetSelections.constraint)) {
                return;
            }
            vm.previousSelections = angular.copy(facetSelections.constraint);

            facetUrlStateHandlerService.updateUrlParams(facetSelections);
            vm.isLoadingResults = true;

            prisonerService.getResults(facetSelections)
            .then(function(pager) {
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
