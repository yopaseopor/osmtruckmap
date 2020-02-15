var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/**
 * @module OSMXML2
 */
// FIXME add typedef for stack state objects
import { extend } from 'ol/array';
import Feature from 'ol/Feature';
import { transformGeometryWithOptions } from 'ol/format/Feature';
import XMLFeature from 'ol/format/XMLFeature';
import GeometryLayout from 'ol/geom/GeometryLayout';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { isEmpty } from 'ol/obj';
import { get as getProjection } from 'ol/proj';
import { pushParseAndPop, makeStructureNS } from 'ol/xml';
/**
 * @const
 * @type {Array<null>}
 */
var NAMESPACE_URIS = [null];
/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
// @ts-ignore
var WAY_PARSERS = makeStructureNS(NAMESPACE_URIS, {
    'nd': readNd,
    'tag': readTag
});
/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
// @ts-ignore
var PARSERS = makeStructureNS(NAMESPACE_URIS, {
    'node': readNode,
    'way': readWay
});
/**
 * @classdesc
 * Feature format for reading data in the
 * [OSMXML format](http://wiki.openstreetmap.org/wiki/OSM_XML).
 *
 * @api
 */
var OSMXML2 = /** @class */ (function (_super) {
    __extends(OSMXML2, _super);
    function OSMXML2() {
        var _this = _super.call(this) || this;
        /**
         * @inheritDoc
         */
        _this.dataProjection = getProjection('EPSG:4326');
        return _this;
    }
    /**
     * @inheritDoc
     */
    OSMXML2.prototype.readFeaturesFromNode = function (node, opt_options) {
        var options = this.getReadOptions(node, opt_options);
        if (node.localName == 'osm') {
            var state = pushParseAndPop({
                nodes: {},
                ways: [],
                features: []
            }, PARSERS, node, [options]);
            // parse nodes in ways
            for (var j = 0; j < state.ways.length; j++) {
                var values = /** @type {Object} */ (state.ways[j]);
                /** @type {Array<number>} */
                var flatCoordinates = [];
                for (var i = 0, ii = values.ndrefs.length; i < ii; i++) {
                    var point = state.nodes[values.ndrefs[i]];
                    extend(flatCoordinates, point);
                }
                var geometry = void 0;
                if (values.ndrefs[0] == values.ndrefs[values.ndrefs.length - 1]) {
                    // closed way
                    geometry = new Polygon(flatCoordinates, GeometryLayout.XY, [flatCoordinates.length]);
                }
                else {
                    geometry = new LineString(flatCoordinates, GeometryLayout.XY);
                }
                transformGeometryWithOptions(geometry, false, options);
                var feature = new Feature(geometry);
                feature.setId(values.id);
                feature.setProperties(values.tags, true);
                state.features.push(feature);
            }
            if (state.features) {
                return state.features;
            }
        }
        return [];
    };
    return OSMXML2;
}(XMLFeature));
/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
// @ts-ignore
var NODE_PARSERS = makeStructureNS(NAMESPACE_URIS, {
    'tag': readTag
});
/**
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 */
function readNode(node, objectStack) {
    var options = /** @type {import("./Feature.js").ReadOptions} */ (objectStack[0]);
    var state = /** @type {Object} */ (objectStack[objectStack.length - 1]);
    var id = node.getAttribute('id');
    /** @type {import("../coordinate.js").Coordinate} */
    var coordinates = [
        parseFloat(node.getAttribute('lon')),
        parseFloat(node.getAttribute('lat'))
    ];
    state.nodes[id] = coordinates;
    var values = pushParseAndPop({
        tags: readMeta(node)
    }, NODE_PARSERS, node, objectStack);
    if (!isEmpty(values.tags)) {
        var geometry = new Point(coordinates);
        transformGeometryWithOptions(geometry, false, options);
        var feature = new Feature(geometry);
        feature.setId(id);
        feature.setProperties(values.tags, true);
        state.features.push(feature);
    }
}
/**
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 */
function readWay(node, objectStack) {
    var id = node.getAttribute('id');
    var values = pushParseAndPop({
        id: id,
        ndrefs: [],
        tags: readMeta(node)
    }, WAY_PARSERS, node, objectStack);
    var state = /** @type {Object} */ (objectStack[objectStack.length - 1]);
    state.ways.push(values);
}
/**
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 */
function readNd(node, objectStack) {
    var values = /** @type {Object} */ (objectStack[objectStack.length - 1]);
    values.ndrefs.push(node.getAttribute('ref'));
}
/**
 * @param {Element} node Node.
 * @param {Array<*>} objectStack Object stack.
 */
function readTag(node, objectStack) {
    var values = /** @type {Object} */ (objectStack[objectStack.length - 1]);
    values.tags[node.getAttribute('k')] = node.getAttribute('v');
}
/**
 * @param {Element} node Node.
 */
function readMeta(node){
	var meta = {};
	node.getAttributeNames().forEach(function(attributeName){
		meta[attributeName] = node.getAttribute(attributeName);
	});
	if(!isEmpty(meta)){
		meta.type = node.nodeName;
	}
	return !isEmpty(meta)?{meta:meta}:{};
}
export default OSMXML2;
