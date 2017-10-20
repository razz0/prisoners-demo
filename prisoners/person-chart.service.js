(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    .service('personChartService', personChartService);

    /* @ngInject */
    function personChartService($q, $translate, _, AdvancedSparqlService,
            personMapperService, baseRepository, PREFIXES, ENDPOINT_CONFIG) {

        var self = this;
        var endpoint = new AdvancedSparqlService(ENDPOINT_CONFIG, personMapperService);

        self.getResultsAge = getResultsAge;
        self.getResultsBarChart = getResultsBarChart;
        self.getResultsPath = getResultsPath;

        self.getColumnChart = getColumnChart;
        self.getBarChart = getBarChart;
        self.getSankeyChart = getSankeyChart;

        /* Implementation */

        var queryAge = PREFIXES +
        '  SELECT ?age (count(DISTINCT ?id) as ?count)' +
        '  WHERE {' +
        '  { ' +
        '    <RESULT_SET> ' +
        '  } ' +
        '  ?id <START_PROP> ?birth .' +
        '  ?id <END_PROP> ?end .' +
        '  BIND( year(?end) - year(?birth) - if(month(?end) < month(?birth) || ' +
        '   (month(?end) = month(?birth) && day(?end) < day(?birth)), 1, 0) as ?age )' +
        '  FILTER(BOUND(?age) && ?age < 200) ' +
        '  } GROUP BY ?age ORDER BY ?age';

        var queryBarChart = PREFIXES +
        '  SELECT ?var (count(DISTINCT ?id) as ?count)' +
        '  WHERE {' +
        '  { ' +
        '    <RESULT_SET> ' +
        '  } ' +
        '  ?id <PREDICATE> ?var . ' +
        '  } GROUP BY ?var ORDER BY DESC(?count)';

        var pathPart =
        ' { ' +
        '   { ' +
        '     <RESULT_SET> ' +
        '   } ' +
        '   OPTIONAL { ?id <FROM> ?from . }' +
        '   OPTIONAL { ?id <TO> ?to . }' +
        '   BIND(<LEVEL> as ?level)' +
        ' } ';

        var queryPath = PREFIXES +
        ' SELECT ?from ?to ?level (COUNT(?id) as ?count) WHERE {' +
        '   <PATH> ' +
        ' } GROUP BY ?from ?to ?level';

        function getPathQuery(path) {
            var paths = [];
            var level = 0;
            var pairs = [];
            path = _.compact(path);
            for (var i = 1; i < path.length; i++) {
                pairs.push([path[i - 1], path[i]]);
            }
            pairs.forEach(function(p) {
                paths.push(pathPart.replace(/<FROM>/g, p[0])
                    .replace(/<TO>/g, p[1])
                    .replace(/<LEVEL>/g, level));
                level += 1;
            });
            var qry = queryPath.replace('<PATH>', paths.join(' UNION '));
            return qry;
        }

        function getColumnChart() {
            return {
                type: 'ColumnChart',
                data: {
                    rows: [],
                    cols: [
                        { id: 'x', label: '', type: 'number' },
                        { id: 'y', label: '', type: 'number' }
                    ]
                },
                options: {
                    title: '',
                    hAxis: {
                        title: '',
                        ticks: [ 0, 15, 30, 45, 60, 75 ]
                    },
                    vAxis: { title: '' },
                }
            };
        }

        function getSankeyChart() {
            return {
                type: 'Sankey',
                data: {
                    rows: [],
                    cols: [
                        { id: 'from', type: 'string' },
                        { id: 'to', type: 'string' },
                        { id: 'weight', type: 'number' }
                    ]
                },
                options: {
                    height: 1000,  // TODO: change this according to the amount of results
                    sankey: {
                        node: { label: { fontSize: 16 } },
                    }
                }
            };
        }

        function getBarChart() {
            return {
                type: 'BarChart',
                data: {
                    rows: [],
                    cols: [
                        { id: 'x', label: '', type: 'string' },
                        { id: 'y', label: '', type: 'number' }
                    ]
                },
                options: {
                    title: '',
                    hAxis: {
                        title: '',
                    },
                    vAxis: { title: '' },
                }
            };
        }

        //'  ?id m_schema:syntymaeaika ?birth .' +
        //'  ?id m_schema:kuolinaika ?death .' +
        function getResultsAge(constraint, birthProp, endProp) {
            var q = queryAge.replace(/<RESULT_SET>/g, constraint)
                .replace('<START_PROP>', birthProp)
                .replace('<END_PROP>', endProp);
            return endpoint.getObjectsNoGrouping(q).then( function(res) {
                return _.map(res, function(obj) {
                    return { c: [{ v: parseInt(obj.age)}, { v: parseInt(obj.count) }] };
                });
            });
        }

        function getResultsBarChart(facetSelections, predicate) {
            var q = queryBarChart.replace(/<PREDICATE>/g, predicate).replace(/<RESULT_SET>/g, facetSelections.constraint.join(' '));
            return endpoint.getObjectsNoGrouping(q).then(function(res) {
                var ids = _.compact(_.uniq(_.map(res, 'var')));
                return baseRepository.getLabel(ids).then(function(labels) {
                    var labelDict = _.keyBy(labels, 'id');
                    res.forEach(function(r) {
                        var lbl = labelDict[r.var];
                        r.var = lbl ? lbl.getLabel() : r.var;
                    });
                    return res;
                });
            }).then(function(res) {
                return _.map(res, function(obj) {
                    return { c: [{ v: obj.var }, { v: parseInt(obj.count) }] };
                });
            });
        }

        function mapResults(original, labels, predicates) {
            var labelDict = _.keyBy(labels, 'id');
            return _.map(original, function(row) {
                var res = {};
                ['from', 'to'].forEach(function(attr) {
                    var level = parseInt(row.level) + (attr === 'to' ? 1 : 0);

                    res[attr] = predicates[level] + ': ';

                    if (row[attr]) {
                        var label = labelDict[row[attr]];
                        res[attr] += label ? label.getLabel() : row[attr];
                    } else {
                        res[attr] += '?';
                    }
                });
                return {
                    c: [
                        { v: res.from },
                        { v: res.to },
                        { v: parseInt(row.count) }
                    ]
                };
            });
        }

        function getResultsPath(facetSelections, path) {
            var q = getPathQuery(_.map(path, 'predicate')).replace(/<RESULT_SET>/g, facetSelections.constraint.join(' '));
            return endpoint.getObjectsNoGrouping(q).then(function(res) {
                var ids = _.compact(_.uniq(_.flatMap(res, function(obj) {
                    return [obj.from, obj.to];
                })));
                return baseRepository.getLabel(ids).then(function(labels) {
                    var results =  mapResults(res, labels, _.map(path, 'name'));
                    return results;
                });
            });
        }
    }
})();
