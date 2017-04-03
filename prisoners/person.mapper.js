(function() {
    'use strict';

    /*
    * Service for transforming SPARQL result triples into more manageable objects.
    *
    * Author Erkki Heino.
    */
    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    .constant('_', _) // eslint-disable-line no-undef

    .service('personMapperService', personMapperService);

    /* ngInject */
    function personMapperService(_, objectMapperService) {

        var multipleValueField = ['camps', 'time_captured', 'death_date', 'birth_date', 'occupation', 'rank', 'rank_uri'];

        PersonMapper.prototype.postProcess = postProcess;

        var proto = Object.getPrototypeOf(objectMapperService);
        PersonMapper.prototype = angular.extend({}, proto, PersonMapper.prototype);

        return new PersonMapper();

        function PersonMapper() {
            this.objectClass = Object;
        }

        function castArray(value) {
            if (value === undefined) {
                return value;
            }
            return _.isArray(value) ? value : [value];
        }

        function postProcess(prisoners) {
            prisoners.forEach( function (prisoner) {
                multipleValueField.forEach( function (field) {
                    prisoner[field] = castArray(prisoner[field]);
                    console.log(field, prisoner[field]);
                });
                prisoner['rankz'] = _.zipObject(prisoner['rank'], prisoner['rank_uri']);
            });

            return prisoners;
        }
    }
})();
