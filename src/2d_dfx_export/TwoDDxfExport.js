import * as THREE from "three"
import {Measure} from "Potree"
import {Drawing} from "./Drawing";
import {saveStringAsTextFile} from "../saveStringAsTextFile";

let scratchVector3 = new THREE.Vector3();

class TwoDDxfExporter {
    constructor() {
        this._boundingBox = new THREE.Box2();

        this.reset();
    }

    reset() {
        this._viewer = null;
        this._projectBox = null;
        this._projectPlane = null;
        this._useAutomaticTextHeight = true;
        this._textHeight = 1;
        this._color = 0xFFD700; // gold
        this._annotaionColor = 0xB22222;   // firebrick
        this._rotationAngle = 0;
    }

    get viewer() {
        return this._viewer
    }

    set viewer(v) {
        this._viewer = v;
    }

    get projectBox() {
        return this._projectBox;
    }

    set projectBox(p) {
        this._projectBox = p;
    }

    get boundingBox() {
        return this._boundingBox;
    }

    set boundingBox(b) {
        this._boundingBox = b;
    }

    get textHeight() {
        return this._textHeight;
    }

    set textHeight(t) {
        this._textHeight = t;
    }

    /**
     * @param options
     * @param options.projectBox
     * @param options.useAutomaticTextHeight
     * @param options.annotationColor
     * @param options.textHeight
     * @param options.rotationAngle
     * @param options.color
     */
    setDrawingOptions(options) {
        this._projectBox = options.projectBox;

        if(options.useAutomaticTextHeight === false) {
            this._useAutomaticTextHeight = false;
            this._textHeight = options.textHeight;
        }

        if(options.rotationAngle) {
            this._rotationAngle = options.rotationAngle;
        }

        if(options.annotationColor) {
            this._annotaionColor = options.annotationColor;
        }

        if(options.color) {
            this._color = options.color;
        }
    }

    export2DDxf(viewer, fileName, addTo = false) {
        if(!this._projectBox) {
            console.warn('you need to set export options!');
            return;
        }

        this._viewer = viewer;

        const boxVolume = this._projectBox;

        boxVolume.updateMatrixWorld();
        this._projectPlane = this._getPlaneBoxFromBoxVolume(boxVolume);

        const scene = viewer.scene;
        let projectedMeasurements = this._getProjectedMeasurements(scene.measurements);

        this._determineBoundingBox(projectedMeasurements);

        let drawing = new Drawing();

        const boundingBox = this.boundingBox;

        drawing.setExtent(boundingBox.min.x, boundingBox.min.y, boundingBox.max.x, boundingBox.max.y);
        drawing.setUnits('Meters');

        this._drawProjectPlane(drawing);

        const width = boundingBox.getSize(new THREE.Vector2()).x;
        const height = boundingBox.getSize(new THREE.Vector2()).y;

        if(this._useAutomaticTextHeight)
            this._textHeight = Math.min(width, height ) / 50;

        for (const measurement of projectedMeasurements) {
            this._drawOneProjectedMeasurement(drawing, measurement);
        }

        this._drawAnnotations(drawing, scene.annotations.children);

        saveStringAsTextFile(drawing.toDxfString(), fileName);

        if (addTo) {
            for (const measurement of projectedMeasurements)
                scene.addMeasurement(measurement);
        }

        this.reset();
    }

    /**
     * box volume 's world matrix should be updated before it is passed to this function
     *
     * @param boxVolume
     * @return {Plane|Plane}
     */
    _getPlaneBoxFromBoxVolume(boxVolume) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 0.5));

        plane.applyMatrix4(boxVolume.matrixWorld);

        return plane;
    }

    _getProjectedMeasurements(measurements) {
        let projectedMeasurements = [];

        let measurementCount = 0;
        for (const measurement of measurements) {
            // for example, BoxVolume
            if (!measurement.points)
                continue;

            let projectedMeasurement;

            projectedMeasurement = new Measure();

            if (measurement.name !== '') {
                projectedMeasurement.name = `projected ${measurement.name}${measurementCount}`;
            } else {
                projectedMeasurement.name = `projected ${measurementCount}`;
            }

            measurementCount++;

            projectedMeasurement.closed = measurement.closed;
            projectedMeasurement.showDistances = measurement.showDistances;
            projectedMeasurement.showArea = measurement.showArea;
            projectedMeasurement.showCoordinates = measurement.showCoordinates;
            projectedMeasurement.showAngles = measurement.showAngles;
            projectedMeasurement.showHeight = measurement.showHeight;
            projectedMeasurement.showCircle = measurement.showCircle;
            projectedMeasurement.showAzimuth = measurement.showAzimuth;
            projectedMeasurement.showEdges = measurement.showEdges;
            projectedMeasurement.maxMarkers = measurement.maxMarkers;

            projectedMeasurement.originalMeasurement = measurement;

            projectedMeasurements.push(projectedMeasurement);

            for (const point of measurement.points) {
                const projectedPoint = new THREE.Vector3();

                this._projectPlane.projectPoint(point.position, projectedPoint);

                projectedMeasurement.addMarker(projectedPoint);
            }
        }

        return projectedMeasurements;
    }

    _determineBoundingBox(projectedMeasurements) {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;

        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const measurement of projectedMeasurements) {
            for (let point of measurement.points) {
                const xy = this._get2DCoordinate(point.position);

                const x = xy[0];
                const y = xy[1];

                if ( minX > x )
                    minX = x;

                if(maxX < x)
                    maxX = x;

                if ( minY > y )
                    minY = y;

                if(maxY < y)
                    maxY = y;
            }
        }

        this.boundingBox.min.set(minX, minY);
        this.boundingBox.max.set(maxX, maxY);
    }

    _get2DCoordinate(projectedPosition) {
        const projectBox = this.projectBox;

        const boxVolumeWorldMatrix = projectBox.matrixWorld;
        const invertBoxVolumeWorldMatrix = boxVolumeWorldMatrix.clone().invert();
        const scale = projectBox.scale;

        scratchVector3.copy(projectedPosition);

        scratchVector3.applyMatrix4(invertBoxVolumeWorldMatrix);

        const x = scratchVector3.x * scale.x;
        const y = scratchVector3.y * scale.y;

        if(this._rotationAngle !== 0) {
            return rotate2D([x, y], this._rotationAngle);
        }
        else {
            return [x, y];
        }
    }

    _drawProjectPlane(drawing) {
        const layerName = "Project Plane";

        drawing.addLayer(layerName, Drawing.ACI.YELLOW, 'CONTINUOUS');
        drawing.setActiveLayer(layerName);

        const scale = this.projectBox.scale;

        const minX = -0.5 * scale.x;
        const maxX = 0.5 * scale.x;
        const minY = -0.5 * scale.y;
        const maxY = 0.5 * scale.x;

        let points = [];

        points.push([minX, minY]);
        points.push([maxX, minY]);
        points.push([maxX, maxY]);
        points.push([minX, maxY]);

        drawing.setTrueColor(0xFFFFFF);

        drawing.drawPolyline(points, true, 2, 2);
    }

    _drawAnnotations(drawing, annotations) {
        const layerName = "Annotations";

        drawing.addLayer(layerName, Drawing.ACI.YELLOW, 'CONTINUOUS');
        drawing.setActiveLayer(layerName);

        const projectedPoint = new THREE.Vector3();

        drawing.setTrueColor(this._annotaionColor);

        for(const annotation of annotations) {
            this._projectPlane.projectPoint(annotation.position, projectedPoint);

            const xy = this._get2DCoordinate(projectedPoint);

            let title;

            if(typeof annotation.title === 'string'){
                title = annotation.title;
            }
            else {
                title = annotation.title.toString();
            }

            drawing.drawText(xy[0], xy[1], this._textHeight, 0, title + 'm', 'center', 'middle');
        }
    }

    /**
     * @param {Drawing} drawing
     * @param {Measure} projectedMeasurement
     * @param {Volume} boxVolume
     */
    _drawOneProjectedMeasurement(drawing, projectedMeasurement) {
        if (projectedMeasurement.points.length === 1) {
            this._drawOneProjectedMeasurementPoint(drawing, projectedMeasurement);
        }
        else if (projectedMeasurement.showCircle) {
            this._drawOneProjectedMeasurementCircle(drawing, projectedMeasurement);
        }
        else {
            this._drawOneProjectedMeasurementPolyline(drawing, projectedMeasurement);
        }
    }

    /**
     * @param {Drawing} drawing
     * @param {Measure} projectedMeasurement
     * @param {Volume} boxVolume
     */
    _drawOneProjectedMeasurementPolyline(drawing, projectedMeasurement) {
        const layerName = projectedMeasurement.name;

        drawing.addLayer(layerName, Drawing.ACI.YELLOW, 'CONTINUOUS');
        drawing.setActiveLayer(layerName);
        drawing.setTrueColor(this._color);

        let points = [];

        for (let point of projectedMeasurement.points) {
            points.push(this._get2DCoordinate(point.position));
        }

        if(projectedMeasurement.showDistances){
            for(let i = 0; i < projectedMeasurement.edgeLabels.length -1; i++) {
                const edgeLabel = projectedMeasurement.edgeLabels[i];

                const xy = this._get2DCoordinate(edgeLabel.position);

                drawing.drawText(xy[0], xy[1], this._textHeight, 0, edgeLabel.text + 'm', 'center', 'middle');
            }
        }

        if(projectedMeasurement.showArea) {
            const xy = this._get2DCoordinate(projectedMeasurement.areaLabel.position);

            drawing.drawText(xy[0], xy[1], this._textHeight, 0, projectedMeasurement.originalMeasurement.areaLabel.text, 'center', 'middle');
        }

        if(projectedMeasurement.showAngles){
            for (const angleLabel of projectedMeasurement.angleLabels) {
                const xy = this._get2DCoordinate(angleLabel.position);

                drawing.drawText(xy[0], xy[1], this._textHeight, 0, angleLabel.text, 'center', 'middle');
            }
        }

        if(projectedMeasurement.showAzimuth){
            const originalMeasurement = projectedMeasurement.originalMeasurement;
            const azimuth = originalMeasurement.azimuth;

            const projectedPoint = new THREE.Vector3();

            this._projectPlane.projectPoint(azimuth.north.position, projectedPoint);

            let firstPointXY = this._get2DCoordinate(projectedMeasurement.points[0].position);

            let xy = this._get2DCoordinate(projectedPoint);

            drawing.drawPolyline([firstPointXY, xy], false, 1, 1);

            xy = this._get2DCoordinate(azimuth.label.position);

            drawing.drawText(xy[0], xy[1], this._textHeight, 0, azimuth.label.text, 'center', 'middle');
        }

        drawing.drawPolyline(points, projectedMeasurement.closed, 1, 1);
    }

    /**
     * @param {Drawing} drawing
     * @param {Measure} projectedMeasurement
     */
    _drawOneProjectedMeasurementPoint(drawing, projectedMeasurement) {
        const layerName = projectedMeasurement.name;

        drawing.addLayer(layerName, Drawing.ACI.YELLOW, 'CONTINUOUS');
        drawing.setActiveLayer(layerName);
        drawing.setTrueColor(this._color);

        const xy = this._get2DCoordinate(projectedMeasurement.points[0].position);

        drawing.drawPoint(xy[0], xy[1]);

        const yOffset = this.textHeight * 2;

        drawing.drawText(xy[0], xy[1] + yOffset, this.textHeight, 0, projectedMeasurement.coordinateLabels[0].text, 'center', 'middle');
    }

    /**
     * @param {Drawing} drawing
     * @param {Measure} projectedMeasurement
     * @param {Volume} boxVolume
     */
    _drawOneProjectedMeasurementCircle(drawing, projectedMeasurement) {
        const layerName = projectedMeasurement.name;

        drawing.addLayer(layerName, Drawing.ACI.YELLOW, 'CONTINUOUS');
        drawing.setActiveLayer(layerName);
        drawing.setTrueColor(this._color);

        const xy = this._get2DCoordinate(projectedMeasurement.circleCenter.position);

        drawing.drawCircle(xy[0], xy[1], parseFloat(projectedMeasurement.circleRadiusLabel.text));

        drawing.drawPoint(xy[0], xy[1]);
    }
}

/**
 * @param xy
 * @param angle in degree
 * @return {number[]}
 */
function rotate2D(xy, angle) {
    const cosine = Math.cos(toRadians(angle));
    const sine = Math.sin(toRadians(angle));

    const x = cosine * xy[0] - sine * xy[1];
    const y = sine * xy[0] + cosine * xy[1];

    return [x, y]
}

function toRadians(angleInDegrees) {
    return angleInDegrees * Math.PI / 180;
}

const twoDDxfExporter = new TwoDDxfExporter();

function export2DDxf(viewer, boxVolume, fileName, addTo = false) {
    twoDDxfExporter.export2DDxf(viewer, boxVolume, fileName, addTo);
}

function setDfxExportOptions(options) {
    twoDDxfExporter.setDrawingOptions(options);
}

export {export2DDxf, setDfxExportOptions}