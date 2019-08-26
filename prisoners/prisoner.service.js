(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    /*
     * prisoner service
     */
    .service('prisonerService', prisonerService);

    /* @ngInject */
    function prisonerService($translate, _, FacetResultHandler, personMapperService, ENDPOINT_CONFIG, PNR_ENDPOINT_CONFIG) {

        /* Public API */

        // Get the results based on facet selections.
        // Return a promise.
        this.getResults = getResults;
        // Get the facets.
        // Return a promise (because of translation).
        this.getFacets = getFacets;
        // Get the facet options.
        // Return an object.
        this.getFacetOptions = getFacetOptions;

        /* Implementation */

        var facets = {
            // Text search facet for name
            name: {
                facetId: 'name',
                predicate: '<http://www.w3.org/2004/02/skos/core#prefLabel>',
                name: 'NAME',
                enabled: true
            },
            birthDate: {
                facetId: 'birthDate',
                predicate: '<http://ldf.fi/date_of_birth>',
                name: 'BIRTH_DATE',
                startPredicate: '<http://ldf.fi/schema/warsa/date_of_birth>',
                endPredicate: '<http://ldf.fi/schema/warsa/date_of_birth>',
                // min: '1939-09-30',
                max: '1945-06-21',
                enabled: true
            },
            timeCaptured: {
                facetId: 'timeCaptured',
                predicate: '<http://ldf.fi/time_captured>',
                name: 'TIME_CAPTURED',
                startPredicate: '<http://ldf.fi/schema/warsa/prisoners/date_of_capture>',
                endPredicate: '<http://ldf.fi/schema/warsa/prisoners/date_of_capture>',
                min: '1939-09-30',
                max: '1945-06-21',
                enabled: true
            },
            deathDate: {
                facetId: 'deathDate',
                predicate: '<http://ldf.fi/death_date>',
                name: 'DEATH_DATE',
                startPredicate: '<http://ldf.fi/schema/warsa/prisoners/date_of_death>',
                endPredicate: '<http://ldf.fi/schema/warsa/prisoners/date_of_death>',
                min: '1939-12-07',
//                max: '1989-12-31',
                enabled: true
            },

            rank: {
                facetId: 'rank',
                predicate: '<http://ldf.fi/schema/warsa/prisoners/rank>',
                name: 'RANK'
            },
            unit: {
                facetId: 'unit',
                predicate: '<http://ldf.fi/schema/warsa/prisoners/unit>',
                name: 'UNIT'
            },
            // camps: {
            //     facetId: 'camps',
            //     predicate: '<http://ldf.fi/schema/warsa/prisoners/captivity>/<http://ldf.fi/schema/warsa/prisoners/location_literal>',
            //     name: 'CAMPS'
            // },
            occupation: {
                facetId: 'occupation',
                predicate: '<http://ldf.fi/schema/bioc/has_occupation>',
                name: 'OCCUPATION'
            },
            maritalStatus: {
                facetId: 'maritalStatus',
                predicate: '<http://ldf.fi/schema/warsa/prisoners/marital_status>',
                name: 'MARITAL_STATUS'
            },
            numChildren: {
                facetId: 'numChildren',
                predicate: '<http://ldf.fi/schema/warsa/prisoners/number_of_children>',
                name: 'NUM_CHILDREN'
            },
            birthPlace: {
                facetId: 'birthPlace',
                predicate: '<http://ldf.fi/schema/warsa/municipality_of_birth>',
                name: 'BIRTH_MUNICIPALITY'
            },
            residencePlace: {
                facetId: 'residencePlace',
                predicate: '<http://ldf.fi/schema/warsa/prisoners/municipality_of_residence>',
                name: 'RESIDENCE_MUNICIPALITY'
            },
            domicilePlace: {
                facetId: 'domicilePlace',
                predicate: '<http://ldf.fi/schema/warsa/prisoners/municipality_of_domicile>',
                name: 'DOMICILE_MUNICIPALITY'
            },
            capturingPlace: {
                facetId: 'capturingPlace',
                predicate: '<http://ldf.fi/schema/warsa/prisoners/municipality_of_capture>',
                name: 'CAPTURE_MUNICIPALITY'
            },
            deathPlace: {
                facetId: 'deathPlace',
                predicate: '<http://ldf.fi/schema/warsa/prisoners/municipality_of_death>',
                name: 'DEATH_MUNICIPALITY',
                services: [PNR_ENDPOINT_CONFIG.endpointUrl]
            }
        };

        var properties = [
            '?name',
            '?warsa_person',
            '?occupation_label',
            '?occupation_literal',
            '?rank__id',
            '?rank__label',
            '?rank_orig',
            '?unit',
            '?warsa_unit',
            '?marital_status',
            '?children',
            '?explanation',
            '?place_captured__id',
            '?place_captured__label',
            '?place_mia',
            '?birth_date',
            '?birth_place',
            '?time_captured',
            '?time_mia',
            '?death_date',
            '?returned_date',
            '?camps',
        ];

        var prefixes =
            ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
            ' PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>' +
            ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>' +
            ' PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>' +
            ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>' +
            ' PREFIX text: <http://jena.apache.org/text#>' +
            ' PREFIX bioc: <http://ldf.fi/schema/bioc/>' +
            ' PREFIX pow: <http://ldf.fi/schema/warsa/prisoners/>' +
            ' PREFIX warsa: <http://ldf.fi/schema/warsa/>';

        // The query for the results.
        // ?id is bound to the prisoner URI.
        var query =
            ' SELECT ?id <PROPERTIES> WHERE {' +
            '  { ' +
            '    <RESULT_SET> ' +
            '  } ' +
            '  OPTIONAL { ?id skos:prefLabel ?name . }' +
            '  OPTIONAL { ?id crm:P70_documents ?warsa_person . }' +
            '  OPTIONAL { ?id bioc:has_occupation/skos:prefLabel ?occupation_label . }' +
            '  OPTIONAL { ?id pow:occupation_literal ?occupation_literal . }' +
            '  OPTIONAL { ?id pow:rank ?rank__id . ?rank__id skos:prefLabel ?rank__label  . }' +
            '  OPTIONAL { ?id pow:rank_literal ?rank_orig . }' +
            '  OPTIONAL { ?id pow:unit_literal ?unit . }' +
            '  OPTIONAL { ?id pow:unit ?warsa_unit . }' +
            '  OPTIONAL { ?id pow:number_of_children ?children . }' +
            '  OPTIONAL { ?id pow:marital_status ?marital_status . }' +
            '  OPTIONAL { ?id pow:explanation ?explanation . }' +
            '  OPTIONAL { ?id pow:municipality_of_capture ?place_captured__id . ?place_captured__id skos:prefLabel ?place_captured__label }' +
            '  OPTIONAL { ?id pow:municipality_of_capture_literal ?place_captured_literal . }' +
            '  OPTIONAL { ?id pow:place_of_going_mia_literal ?place_mia . }' +
            '  OPTIONAL { ?id warsa:date_of_birth ?birth_date . }' +
            '  OPTIONAL { ?id pow:birth_place_literal ?birth_place . }' +
            '  OPTIONAL { ?id pow:date_of_capture ?time_captured . }' +
            '  OPTIONAL { ?id pow:date_of_going_mia ?time_mia . }' +
            '  OPTIONAL { ?id pow:date_of_death ?death_date . }' +
            '  OPTIONAL { ?id pow:date_of_return ?returned_date . }' +
            '  OPTIONAL { ?id pow:captivity/pow:location_literal ?camps . }' +
            ' }';

        query = query.replace(/<PROPERTIES>/g, properties.join(' '));

        var facetOptions = {
            endpointUrl: ENDPOINT_CONFIG.endpointUrl,
            rdfClass: '<http://ldf.fi/schema/warsa/PrisonerRecord>',
            // Include the label (name) as a constraint so that we can use it for sorting.
            // Have to use ?s here as the subject variable.
            constraint: '?id skos:prefLabel ?name .'
        };

        var resultOptions = {
            queryTemplate: query,
            prefixes: prefixes,
            mapper: personMapperService, // use a custom object mapper
            pagesPerQuery: 2 // get two pages of results per query
        };

        // The FacetResultHandler handles forming the final queries for results,
        // querying the endpoint, and mapping the results to objects.
        var resultHandler = new FacetResultHandler(ENDPOINT_CONFIG, resultOptions);

        function getResults(facetSelections) {
            // Get the results sorted by ?name.
            // Any variable declared in facetOptions.constraint can be used in the sorting,
            // and any valid SPARQL ORDER BY sequence can be given.
            // The results are sorted by URI by default.
            return resultHandler.getResults(facetSelections, '?name');
        }

        function getFacets() {
            // Translate the facet headers.
            return $translate(_.map(facets, 'name'))
                .then(function(translations) {
                    var facetsCopy = angular.copy(facets);
                    _.forOwn(facetsCopy, function(val) {
                        val.name = translations[val.name];
                    });
                    return facetsCopy;
                });
        }

        function getFacetOptions() {
            return $translate('NO_SELECTION').then(function(noSelection) {
                var prefLang = $translate.use();
                var facetOptionsCopy = angular.copy(facetOptions);
                facetOptionsCopy.preferredLang = [prefLang, prefLang === 'en' ? 'fi' : 'en', 'sv'];
                facetOptionsCopy.noSelectionString = noSelection;
                return facetOptionsCopy;
            });
        }
    }
})();
