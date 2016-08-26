(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    /*
     * prisoner service
     */
    .service( 'prisonerService', prisonerService );

    /* @ngInject */
    function prisonerService( $q, $translate, _, FacetResultHandler, personMapperService ) {

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
            '<http://www.w3.org/2004/02/skos/core#prefLabel>': {
                name: 'NAME',
                type: 'text',
                enabled: true
            },
            // Basic facets
            '<http://ldf.fi/schema/warsa/prisoners/occupation>': { name: 'OCCUPATION' },
//            '<http://ldf.fi/schema/warsa/prisoners/cause_of_death>': { name: 'CAUSE_OF_DEATH' },
            '<http://ldf.fi/schema/warsa/prisoners/marital_status>': { name: 'MARITAL_STATUS' }
        };

        // The SPARQL endpoint URL
        var endpointUrl = 'http://ldf.fi/warsa/sparql';

        var facetOptions = {
            endpointUrl: endpointUrl,
            rdfClass: '<http://ldf.fi/schema/warsa/prisoners/PrisonerOfWar>',
            // Include the label (name) as a constraint so that we can use it for sorting.
            // Have to use ?s here as the subject variable.
            constraint: '?s skos:prefLabel ?name .',
            preferredLang : 'fi'
        };

        var properties = [
            '?name',
            '?occupation',
            '?rank',
            '?marital_status',
            '?children',
            '?explanation',
            '?place_captured',
            '?birth_date',
            '?time_captured',
            '?death_date',
//            '?cause_of_death',
        ];

        var prefixes =
        ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>' +
        ' PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>' +
        ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>' +
        ' PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>' +
        ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>' +
        ' PREFIX text: <http://jena.apache.org/text#>' +
        ' PREFIX pow: <http://ldf.fi/schema/warsa/prisoners/>';

        // The query for the results.
        // ?id is bound to the prisoner URI.
        var query =
        ' SELECT ?id <PROPERTIES> WHERE {' +
        '  { ' +
        '    <RESULT_SET> ' +
        '  } ' +
        '  OPTIONAL { ?id skos:prefLabel ?name . }' +
        '  OPTIONAL { ?id pow:occupation ?occupation . }' +
        '  OPTIONAL { ?id pow:rank ?rank . }' +
        '  OPTIONAL { ?id pow:amount_children ?children . }' +
        '  OPTIONAL { ?id pow:marital_status ?marital_status . }' +
        '  OPTIONAL { ?id pow:explanation ?explanation . }' +
        '  OPTIONAL { ?id pow:place_captured ?place_captured . }' +
        '  OPTIONAL { ?id pow:birth_date ?birth_date . }' +
        '  OPTIONAL { ?id pow:time_captured ?time_captured . }' +
        '  OPTIONAL { ?id pow:death_date ?death_date . }' +
//        '  OPTIONAL { ?id pow:cause_of_death ?cause_of_death . }' +
        ' }';

        query = query.replace(/<PROPERTIES>/g, properties.join(' '));

        var resultOptions = {
            queryTemplate: query,
            prefixes: prefixes,
            mapper: personMapperService, // use a custom object mapper
            pagesPerQuery: 2 // get two pages of results per query
        };

        // The FacetResultHandler handles forming the final queries for results,
        // querying the endpoint, and mapping the results to objects.
        var resultHandler = new FacetResultHandler(endpointUrl, facets, facetOptions,
                resultOptions);

        function getResults(facetSelections) {
            // Get the results sorted by ?name.
            // Any variable declared in facetOptions.constraint can be used in the sorting,
            // and any valid SPARQL ORDER BY sequence can be given.
            // The results are sorted by URI by default.
            return resultHandler.getResults(facetSelections, '?name');
        }

        function getFacets() {
            // Translate the facet headers.
            return $translate(['NAME', 'OCCUPATION', 'CAUSE_OF_DEATH', 'NUM_CHILDREN', 'MARITAL_STATUS', 'RANK'])
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
