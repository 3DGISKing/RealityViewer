import {LineType} from './LineType';
import {Layer} from'./Layer'
import {Line} from'./Line'
import {Arc} from'./Arc'
import {Circle} from'./Circle'
import {Text} from'./Text'
import {Polyline} from'./Polyline'
import {Polyline3d} from'./Polyline3d'
import {Face} from'./Face'
import {Point} from'./Point'
import {Spline} from'./Spline'
import {Ellipse} from'./Ellipse'

import {version} from '../version.js'

class Drawing {
    constructor() {
        this.layers = {};
        this.activeLayer = null;
        this.lineTypes = {};
        this.headers = {};

        this.setUnits('Unitless');

        for (let i = 0; i < Drawing.LINE_TYPES.length; ++i) {
            this.addLineType(Drawing.LINE_TYPES[i].name,
                Drawing.LINE_TYPES[i].description,
                Drawing.LINE_TYPES[i].elements);
        }

        for (let i = 0; i < Drawing.LAYERS.length; ++i) {
            this.addLayer(Drawing.LAYERS[i].name,
                Drawing.LAYERS[i].colorNumber,
                Drawing.LAYERS[i].lineTypeName);
        }

        this.setActiveLayer('0');
    }


    /**
     * @param {string} name
     * @param {string} description
     * @param {array} elements - if elem > 0 it is a line, if elem < 0 it is gap, if elem == 0.0 it is a
     */
    addLineType(name, description, elements) {
        this.lineTypes[name] = new LineType(name, description, elements);
        return this;
    }

    addLayer(name, colorNumber, lineTypeName) {
        this.layers[name] = new Layer(name, colorNumber, lineTypeName);
        return this;
    }

    setActiveLayer(name) {
        this.activeLayer = this.layers[name];
        return this;
    }

    drawLine(x1, y1, x2, y2) {
        this.activeLayer.addShape(new Line(x1, y1, x2, y2));
        return this;
    }

    drawPoint(x, y) {
        this.activeLayer.addShape(new Point(x, y));
        return this;
    }

    drawRect(x1, y1, x2, y2) {
        this.activeLayer.addShape(new Line(x1, y1, x2, y1));
        this.activeLayer.addShape(new Line(x1, y2, x2, y2));
        this.activeLayer.addShape(new Line(x1, y1, x1, y2));
        this.activeLayer.addShape(new Line(x2, y1, x2, y2));
        return this;
    }

    /**
     * @param {number} x1 - Center x
     * @param {number} y1 - Center y
     * @param {number} r - radius
     * @param {number} startAngle - degree
     * @param {number} endAngle - degree
     */
    drawArc(x1, y1, r, startAngle, endAngle) {
        this.activeLayer.addShape(new Arc(x1, y1, r, startAngle, endAngle));
        return this;
    }

    /**
     * @param {number} x1 - Center x
     * @param {number} y1 - Center y
     * @param {number} r - radius
     */
    drawCircle(x1, y1, r) {
        this.activeLayer.addShape(new Circle(x1, y1, r));
        return this;
    }

    /**
     * @param {number} x1 - x
     * @param {number} y1 - y
     * @param {number} height - Text height
     * @param {number} rotation - Text rotation
     * @param {string} value - the string itself
     * @param {string} [horizontalAlignment="left"] left | center | right
     * @param {string} [verticalAlignment="baseline"] baseline | bottom | middle | top
     */
    drawText(x1, y1, height, rotation, value, horizontalAlignment = 'left', verticalAlignment = 'baseline') {
        this.activeLayer.addShape(new Text(x1, y1, height, rotation, value, horizontalAlignment, verticalAlignment));
        return this;
    }

    /**
     * @param {array} points - Array of points like [ [x1, y1], [x2, y2]... ]
     * @param {boolean} closed - Closed polyline flag
     * @param {number} startWidth - Default start width
     * @param {number} endWidth - Default end width
     */
    drawPolyline(points, closed = false, startWidth = 0, endWidth = 0) {
        this.activeLayer.addShape(new Polyline(points, closed, startWidth, endWidth));
        return this;
    }

    /**
     * @param {array} points - Array of points like [ [x1, y1, z1], [x2, y2, z1]... ]
     */
    drawPolyline3d(points) {
        points.forEach(point => {
            if (point.length !== 3) {
                throw "Require 3D coordinate"
            }
        });
        this.activeLayer.addShape(new Polyline3d(points));
        return this;
    }

    /**
     *
     * @param {number} trueColor - Integer representing the true color, can be passed as an hexadecimal value of the form 0xRRGGBB
     */
    setTrueColor(trueColor) {
        this.activeLayer.setTrueColor(trueColor);
        return this;
    }

    /**
     * Draw a spline.
     * @param {[Array]} controlPoints - Array of control points like [ [x1, y1], [x2, y2]... ]
     * @param {number} degree - Degree of spline: 2 for quadratic, 3 for cubic. Default is 3
     * @param {[number]} knots - Knot vector array. If null, will use a uniform knot vector. Default is null
     * @param {[number]} weights - Control point weights. If provided, must be one weight for each control point. Default is null
     * @param {[Array]} fitPoints - Array of fit points like [ [x1, y1], [x2, y2]... ]
     */
    drawSpline(controlPoints, degree = 3, knots = null, weights = null, fitPoints = []) {
        this.activeLayer.addShape(new Spline(controlPoints, degree, knots, weights, fitPoints));
        return this;
    }

    /**
     * Draw an ellipse.
     * @param {number} x1 - Center x
     * @param {number} y1 - Center y
     * @param {number} majorAxisX - Endpoint x of major axis, relative to center
     * @param {number} majorAxisY - Endpoint y of major axis, relative to center
     * @param {number} axisRatio - Ratio of minor axis to major axis
     * @param {number} startAngle - Start angle
     * @param {number} endAngle - End angle
     */
    drawEllipse(x1, y1, majorAxisX, majorAxisY, axisRatio, startAngle = 0, endAngle = 2 * Math.PI) {
        this.activeLayer.addShape(new Ellipse(x1, y1, majorAxisX, majorAxisY, axisRatio, startAngle, endAngle));
        return this;
    }

    /**
     * @param {number} x1 - x
     * @param {number} y1 - y
     * @param {number} z1 - z
     * @param {number} x2 - x
     * @param {number} y2 - y
     * @param {number} z2 - z
     * @param {number} x3 - x
     * @param {number} y3 - y
     * @param {number} z3 - z
     * @param {number} x4 - x
     * @param {number} y4 - y
     * @param {number} z4 - z
     */
    drawFace(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) {
        this.activeLayer.addShape(new Face(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4));
        return this;
    }

    _getDxfLtypeTable() {
        let s = '0\nTABLE\n'; //start table
        s += '2\nLTYPE\n';    //name table as LTYPE table

        for (let lineTypeName in this.lineTypes) {
            s += this.lineTypes[lineTypeName].toDxfString();
        }

        s += '0\nENDTAB\n'; //end table

        return s;
    }

    _getDxfLayerTable() {
        let s = '0\nTABLE\n'; //start table
        s += '2\nLAYER\n'; //name table as LAYER table

        for (let layerName in this.layers) {
            s += this.layers[layerName].toDxfString();
        }

        s += '0\nENDTAB\n';

        return s;
    }

    /**
     * @see https://www.autodesk.com/techpubs/autocad/acadr14/dxf/header_section_al_u05_c.htm
     * @see https://www.autodesk.com/techpubs/autocad/acad2000/dxf/header_section_group_codes_dxf_02.htm
     *
     * @param {string} variable
     * @param {array} values Array of "two elements arrays". [  [value1_GroupCode, value1_value], [value2_GroupCode, value2_value]  ]
     */
    header(variable, values) {
        this.headers[variable] = values;
        return this;
    }

    _getHeader(variable, values) {
        let s = '9\n$' + variable + '\n';

        for (let value of values) {
            s += `${value[0]}\n${value[1]}\n`;
        }

        return s;
    }

    /**
     *
     * @param {string} unit see Drawing.UNITS
     */
    setUnits(unit) {
        let value = (typeof Drawing.UNITS[unit] != 'undefined') ? Drawing.UNITS[unit] : Drawing.UNITS['Unitless'];
        this.header('INSUNITS', [[70, Drawing.UNITS[unit]]]);
        return this;
    }

    setExtent(minX, minY, maxX, maxY) {
        this.header('EXTMIN', [[10, minX], [20, minY]]);
        this.header('EXTMAX', [[10, maxX], [20, maxY]]);

        return this;
    }

    toDxfString() {
        let s = '';

        //start comment
        s += '999\n';
        s += `Reality Cloud ${version}\n`;

        //start section
        s += '0\nSECTION\n';
        //name section as HEADER section
        s += '2\nHEADER\n';

        for (let header in this.headers) {
            s += this._getHeader(header, this.headers[header]);
        }

        //end section
        s += '0\nENDSEC\n';


        //start section
        s += '0\nSECTION\n';
        //name section as TABLES section
        s += '2\nTABLES\n';

        s += this._getDxfLtypeTable();
        s += this._getDxfLayerTable();

        //end section
        s += '0\nENDSEC\n';


        //ENTITES section
        s += '0\nSECTION\n';
        s += '2\nENTITIES\n';

        for (let layerName in this.layers) {
            let layer = this.layers[layerName];
            s += layer.shapesToDxf();
            // let shapes = layer.getShapes();
        }

        s += '0\nENDSEC\n';


        //close file
        s += '0\nEOF';

        return s;
    }

}

//AutoCAD Color Index (ACI)
//http://sub-atomic.com/~moses/acadcolors.html
Drawing.ACI =
    {
        LAYER: 0,
        RED: 1,
        YELLOW: 2,
        GREEN: 3,
        CYAN: 4,
        BLUE: 5,
        MAGENTA: 6,
        WHITE: 7
    };

Drawing.LINE_TYPES =
    [
        {name: 'CONTINUOUS', description: '______', elements: []},
        {name: 'DASHED', description: '_ _ _ ', elements: [5.0, -5.0]},
        {name: 'DOTTED', description: '. . . ', elements: [0.0, -5.0]}
    ];

Drawing.LAYERS =
    [
        {name: '0', colorNumber: Drawing.ACI.WHITE, lineTypeName: 'CONTINUOUS'}
    ];

//https://www.autodesk.com/techpubs/autocad/acad2000/dxf/header_section_group_codes_dxf_02.htm
Drawing.UNITS = {
    'Unitless': 0,
    'Inches': 1,
    'Feet': 2,
    'Miles': 3,
    'Millimeters': 4,
    'Centimeters': 5,
    'Meters': 6,
    'Kilometers': 7,
    'Microinches': 8,
    'Mils': 9,
    'Yards': 10,
    'Angstroms': 11,
    'Nanometers': 12,
    'Microns': 13,
    'Decimeters': 14,
    'Decameters': 15,
    'Hectometers': 16,
    'Gigameters': 17,
    'Astronomical units': 18,
    'Light years': 19,
    'Parsecs': 20
};

export {Drawing}
