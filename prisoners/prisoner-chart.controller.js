(function() {

    'use strict';

    angular.module('facetApp')

    .controller('PrisonerChartController', PrisonerChartController);

    /* @ngInject */
    function PrisonerChartController($scope, $q, $state, $stateParams, $translate, _, personChartService,
            prisonerService, FacetHandler, facetUrlStateHandlerService, EVENT_REQUEST_CONSTRAINTS) {

        var vm = this;
        vm.errorHandler = chartErrorHandler;
        vm.updateVisualization = updateVisualization;

        var meta = {
            'age': { description: 'VIS_AGE_META_DESCRIPTION', title: 'VIS_AGE_TITLE' },
            'path': { description: 'VIS_PATH_META_DESCRIPTION', title: 'VIS_PATH_TITLE' },
            'bar': { description: 'VIS_BAR_META_DESCRIPTION', title: 'VIS_BAR_TITLE' }
        };

        vm.visualizationType = $stateParams.type;
        vm.metaDescription = meta[vm.visualizationType].description;
        vm.title = meta[vm.visualizationType].title;

        if (vm.visualizationType == 'age') {
            vm.chart = personChartService.getColumnChart();
            $translate(['AGE', 'NUM_PEOPLE', 'AGE_DISTRIBUTION'])
            .then(function(translations) {
                vm.chart.data.cols[0].label = translations['AGE'];
                vm.chart.data.cols[1].label = translations['NUM_PEOPLE'];
                vm.chart.options.title = translations['AGE_DISTRIBUTION'];
                vm.chart.options.hAxis.title = translations['AGE'];
                vm.chart.options.vAxis.title = translations['NUM_PEOPLE'];
            });
        } else if (vm.visualizationType == 'path') {
            vm.chart = personChartService.getSankeyChart();
        } else if (vm.visualizationType == 'bar') {
            vm.chart = personChartService.getBarChart();
            $translate(['NUM_PEOPLE'])
            .then(function(translations) {
                vm.chart.data.cols[1].label = translations['NUM_PEOPLE'];
                vm.chart.options.hAxis.title = translations['NUM_PEOPLE'];
            });
        } else {
            return;
        }

        var defaultPath = [
            'birthPlace',
            'residencePlace',
            'capturingPlace',
            'deathPlace',
        ];

        var selections = [
            'birthPlace',
            'residencePlace',
            'capturingPlace',
            'deathPlace',
            'unit',
            'rank',
            'occupation',
            'numChildren',
        ];

        vm.barSelection = selections[4];

        prisonerService.getFacets().then(function(facets) {
            vm.facets = facets;
            vm.pathSelections = [];
            vm.predicates = _.transform(facets, function(result, value) {
                var pred = {
                    facetId: value.facetId,
                    name: value.name,
                    predicate: value.predicate,
                };
                if (_.includes(selections, pred.facetId)) {
                    result.push(pred);
                    if (_.includes(defaultPath, pred.facetId)) {
                        vm.pathSelections.push(pred);
                    }
                }
            }, []);
        }).then(function() {
            var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
                updateResults(event, config);
                initListener();
            });
            $scope.$on('sf-facet-constraints', updateResults);
            $scope.$emit(EVENT_REQUEST_CONSTRAINTS);  // Request facet selections from facet handler
        });

        function updateVisualization() {
            return fetchResults(vm.previousSelections);
        }

        function updateResults(event, facetSelections) {
            if (vm.previousSelections && _.isEqual(facetSelections.constraint,
                vm.previousSelections.constraint)) {
                return;
            }
            vm.previousSelections = _.clone(facetSelections);
            facetUrlStateHandlerService.updateUrlParams(facetSelections);
            return fetchResults(facetSelections);
        }

        var latestUpdate;
        function fetchResults(facetSelections) {
            vm.isLoadingResults = true;
            vm.resultSetTooLarge = false;
            vm.chart.data.rows = [];
            vm.error = undefined;

            var updateId = _.uniqueId();
            latestUpdate = updateId;

            var getResults;

            if (vm.visualizationType === 'path') {
                if (facetSelections.constraint.length < 2) {
                    vm.resultSetTooLarge = true;
                    vm.isLoadingResults = false;
                    return $q.when();
                }
                vm.pathSelections = _.uniq(_.compact(vm.pathSelections));
                if (vm.pathSelections.length < 2) {
                    vm.isLoadingResults = false;
                    return $q.when();
                }
                getResults = getPathResults;
            } else if (vm.visualizationType === 'bar') {
                getResults = getBarResults;
            } else {
                // Default to age visualization
                getResults = getResultsAge;
            }

            return getResults(facetSelections).then(function(res) {
                if (latestUpdate !== updateId) {
                    return;
                }
                vm.chart.options.height = vm.visualizationType === 'path' ? _.max([res.length * 10, 1000]) : 1000;
                vm.chart.data.rows = res;
                vm.isLoadingResults = false;
                return res;
            }).catch(handleError);
        }

        function chartErrorHandler(message, chart) {
            console.log(message);
            console.log(chart);
        }

        function handleError(error) {
            vm.isLoadingResults = false;
            vm.error = error;
        }

        function getResultsAge(facetSelections) {
            return personChartService.getResultsAge(facetSelections.constraint.join(' '), '<http://ldf.fi/schema/warsa/date_of_birth>', '<http://ldf.fi/schema/warsa/prisoners/date_of_capture>');
        }

        function getPathResults(facetSelections) {
            return personChartService.getResultsPath(facetSelections, vm.pathSelections);
        }

        function getBarResults(facetSelections) {
            return personChartService.getResultsBarChart(facetSelections, _.find(vm.predicates, ['facetId', vm.barSelection]).predicate);
        }
    }
})();
