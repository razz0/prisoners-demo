/*
 * facetApp module definition
 */
(function() {

    'use strict';

    var server = 'https://ldf.fi';
    var SPARQL_ENDPOINT_URL = server + '/warsa/sparql';
    var PNR_ENDPOINT_URL = server + '/pnr/sparql';

    angular.module('facetApp', [
        'ui.router',
        'seco.facetedSearch',
        'seco.translateableObjectMapper',
        'ngTable',
        'googlechart',
        'pascalprecht.translate'
    ])

    .constant('_', _) // eslint-disable-line no-undef
    .constant('RESULTS_PER_PAGE', 25)
    .constant('PAGES_PER_QUERY', 1)
    .constant('defaultLocale', 'fi')
    .constant('supportedLocales', ['fi', 'en'])
    .constant('ENDPOINT_CONFIG', { endpointUrl: SPARQL_ENDPOINT_URL, usePost: true })
    .constant('PNR_ENDPOINT_CONFIG', { endpointUrl: PNR_ENDPOINT_URL, usePost: true })

    .config(function($urlMatcherFactoryProvider) {
        $urlMatcherFactoryProvider.strictMode(false);
    })

    .config(function($stateProvider) {
        $stateProvider
        .state('facetApp', {
            url: '/{lang}',
            controller: 'FacetController',
            controllerAs: 'facetCtrl',  // Must be different from child controllers
            templateUrl: 'views/main.html',
            resolve: {
                checkLang: checkLang
            }
        })
        .state('facetApp.prisoners', {
            url: '/prisoners',
            templateUrl: 'views/prisoners.persons.html',
            controller: 'MainController',
            controllerAs: 'vm'
        })
        .state('facetApp.prisonersVisu', {
            url: '/prisoners/vis/{type}',
            templateUrl: 'views/person-chart.html',
            controller: 'PrisonerChartController',
            controllerAs: 'vm'
        });
    })

    .config(function($locationProvider) {
        $locationProvider.html5Mode(true);
    })

    .config(function($translateProvider, defaultLocale) {
        $translateProvider.useStaticFilesLoader({
            prefix: 'prisoners/lang/locale-',
            suffix: '.json'
        });
        $translateProvider.preferredLanguage(defaultLocale);
        $translateProvider.useSanitizeValueStrategy('sanitizeParameters');
    })

    .config(chartsConfigLoader)

    .run(function($state, $transitions, $location) {
        $transitions.onError({}, function(transition) {
            // Temporary workaround for transition.error() not returning
            // the error (https://github.com/angular-ui/ui-router/issues/2866)
            return transition.promise.catch(function($error$) {
                if ($error$ && $error$.redirectTo) {
                    // Redirect to the given URL (the previous URL was missing
                    // the language code.
                    $location.url($error$.redirectTo);
                }
            });
        });
    });

    /* @ngInject */
    function chartsConfigLoader(agcLibraryLoaderProvider, agcGstaticLoaderProvider){

        // Select the loader strategy.
        agcLibraryLoaderProvider.setLoader('gstatic');

        // Provider supports method chaining.
        agcGstaticLoaderProvider
        .setVersion('45')
        .addPackage('corechart')
        .addPackage('sankey');
    }


    /* @ngInject */
    function checkLang($location, $stateParams, $q, $translate, _, supportedLocales, defaultLocale) {
        var lang = $stateParams.lang;
        if (lang && _.includes(supportedLocales, lang)) {
            return $translate.use(lang);
        }
        if (lang === 'prisoners') {
            // No language code in URL, reject the transition with a fixed URL.
            var url = '/' + defaultLocale + $location.url();
            return $q.reject({ redirectTo: url });
        }

        return $q.reject();
    }
})();
