(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    /*
     * prisoner service
     */
    .service( 'prisonerService', prisonerService);

    /* @ngInject */
    function prisonerService( $translate, _, FacetResultHandler, personMapperService ) {

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

            timeCaptured: {
                facetId: 'timeCaptured',
                predicate: '<http://ldf.fi/time_captured>',
                name: 'TIME_CAPTURED',
                startPredicate: '<http://ldf.fi/schema/warsa/prisoners/time_captured>',
                endPredicate: '<http://ldf.fi/schema/warsa/prisoners/time_captured>',
                min: '1939-10-01',
                max: '1989-12-31',
                enabled: true
            },

            deathDate: {
                facetId: 'deathDate',
                predicate: '<http://ldf.fi/death_date>',
                name: 'DEATH_DATE',
                startPredicate: '<http://ldf.fi/schema/warsa/prisoners/death_date>',
                endPredicate: '<http://ldf.fi/schema/warsa/prisoners/death_date>',
                min: '1939-10-01',
                max: '1989-12-31',
                enabled: true
            },

            // Basic facets
//            '<http://ldf.fi/schema/warsa/prisoners/cause_of_death>': { name: 'CAUSE_OF_DEATH' },
            // '<http://ldf.fi/schema/warsa/prisoners/marital_status>': { name: 'MARITAL_STATUS' },
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
            camps: {
              facetId: 'camps',
              predicate: '<http://ldf.fi/schema/warsa/prisoners/camps_and_hospitals>',
              name: 'CAMPS'
            },
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
              predicate: '<http://ldf.fi/schema/warsa/prisoners/amount_children>',
              name: 'NUM_CHILDREN'
            },
            birthPlace: {
              facetId: 'birthPlace',
              predicate: '<http://ldf.fi/schema/warsa/prisoners/birth_place>',
              name: 'BIRTH_MUNICIPALITY'
            }
        };

        var properties = [
            '?name',
            '?occupation',
            '?rank',
            '?unit',
            '?marital_status',
            '?children',
            '?explanation',
            '?place_captured',
            '?birth_date',
            '?birth_place',
            '?time_captured',
            '?death_date',
            '?returned_date',
            '?camps',
//            '?cause_of_death',
        ];

        var prefixes =
        ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
        ' PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>' +
        ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>' +
        ' PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>' +
        ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>' +
        ' PREFIX text: <http://jena.apache.org/text#>' +
        ' PREFIX bioc: <http://ldf.fi/schema/bioc/>' +
        ' PREFIX pow: <http://ldf.fi/schema/warsa/prisoners/>';

        // The query for the results.
        // ?id is bound to the prisoner URI.
        var query =
        ' SELECT ?id <PROPERTIES> WHERE {' +
        '  { ' +
        '    <RESULT_SET> ' +
        '  } ' +
        '  OPTIONAL { ?id skos:prefLabel ?name . }' +
        '  OPTIONAL { ?id bioc:has_occupation ?occupation . }' +
        '  OPTIONAL { ?id pow:rank ?rank . }' +
        '  OPTIONAL { ?id pow:unit ?unit . }' +
        '  OPTIONAL { ?id pow:amount_children ?children . }' +
        '  OPTIONAL { ?id pow:marital_status ?marital_status . }' +
        '  OPTIONAL { ?id pow:explanation ?explanation . }' +
        '  OPTIONAL { ?id pow:place_captured ?place_captured . }' +
        '  OPTIONAL { ?id pow:birth_date ?birth_date . }' +
        '  OPTIONAL { ?id pow:birth_place ?birth_place . }' +
        '  OPTIONAL { ?id pow:time_captured ?time_captured . }' +
        '  OPTIONAL { ?id pow:death_date ?death_date . }' +
        '  OPTIONAL { ?id pow:returned_date ?returned_date . }' +
        '  OPTIONAL { ?id pow:camps_and_hospitals ?camps . }' +
//        '  OPTIONAL { ?id pow:cause_of_death ?cause_of_death . }' +
        ' }';

        query = query.replace(/<PROPERTIES>/g, properties.join(' '));

        var endpointUrl = 'http://ldf.fi/warsa/sparql';
//        var endpointUrl = 'http://localhost:3030/warsa/sparql';

        var facetOptions = {
            endpointUrl: endpointUrl,
            rdfClass: '<http://ldf.fi/schema/warsa/prisoners/PrisonerOfWar>',
            // Include the label (name) as a constraint so that we can use it for sorting.
            // Have to use ?s here as the subject variable.
            constraint: '?id skos:prefLabel ?name .',
            preferredLang : 'fi'
        };

        var resultOptions = {
            queryTemplate: query,
            prefixes: prefixes,
            mapper: personMapperService, // use a custom object mapper
            pagesPerQuery: 2 // get two pages of results per query
        };

        // The FacetResultHandler handles forming the final queries for results,
        // querying the endpoint, and mapping the results to objects.
        var resultHandler = new FacetResultHandler(endpointUrl, resultOptions);

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
            return facetOptions;
        }
    }
})();
