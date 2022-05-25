import * as THREE from "three"
import {Measure, TextSprite, Utils} from "Potree"
import {Line2} from "../../potree/libs/three.js/lines/Line2.js"
import {LineGeometry} from "../../potree/libs/three.js/lines/LineGeometry.js"
import {LineMaterial} from "../../potree/libs/three.js/lines/LineMaterial.js"

function overrideMeasure() {
    Measure.prototype.update = function () {
        if (this.points.length === 0) {
            return;
        } else if (this.points.length === 1) {
            let point = this.points[0];
            let position = point.position;
            this.spheres[0].position.copy(position);

            { // coordinate labels
                let coordinateLabel = this.coordinateLabels[0];

                let msg = position.toArray().map(p => Utils.addCommas(p.toFixed(2))).join(" / ");
                coordinateLabel.setText(msg);

                coordinateLabel.visible = this.showCoordinates;
            }

            return;
        }

        let lastIndex = this.points.length - 1;

        let centroid = new THREE.Vector3();
        for (let i = 0; i <= lastIndex; i++) {
            let point = this.points[i];
            centroid.add(point.position);
        }
        centroid.divideScalar(this.points.length);

        for (let i = 0; i <= lastIndex; i++) {
            let index = i;
            let nextIndex = (i + 1 > lastIndex) ? 0 : i + 1;
            let previousIndex = (i === 0) ? lastIndex : i - 1;

            let point = this.points[index];
            let nextPoint = this.points[nextIndex];
            let previousPoint = this.points[previousIndex];

            let sphere = this.spheres[index];

            // spheres
            sphere.position.copy(point.position);
            sphere.material.color = this.color;

            { // edges
                let edge = this.edges[index];

                edge.material.color = this.color;

                edge.position.copy(point.position);

                edge.geometry.setPositions([
                    0, 0, 0,
                    ...nextPoint.position.clone().sub(point.position).toArray(),
                ]);

                edge.geometry.verticesNeedUpdate = true;
                edge.geometry.computeBoundingSphere();
                edge.computeLineDistances();
                edge.visible = index < lastIndex || this.closed;

                if(!this.showEdges){
                    edge.visible = false;
                }
            }

            { // edge labels
                let edgeLabel = this.edgeLabels[i];

                let center = new THREE.Vector3().add(point.position);
                center.add(nextPoint.position);
                center = center.multiplyScalar(0.5);
                let distance = point.position.distanceTo(nextPoint.position);

                edgeLabel.position.copy(center);

                let suffix = "";
                if(this.lengthUnit != null && this.lengthUnitDisplay != null){
                    distance = distance / this.lengthUnit.unitspermeter * this.lengthUnitDisplay.unitspermeter;  //convert to meters then to the display unit
                    suffix = this.lengthUnitDisplay.code;
                }

                let txtLength = Utils.addCommas(distance.toFixed(2));
                edgeLabel.setText(`${txtLength} ${suffix}`);
                edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
            }

            { // angle labels
                let angleLabel = this.angleLabels[i];
                let angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);

                let dir = nextPoint.position.clone().sub(previousPoint.position);
                dir.multiplyScalar(0.5);
                dir = previousPoint.position.clone().add(dir).sub(point.position).normalize();

                let dist = Math.min(point.position.distanceTo(previousPoint.position), point.position.distanceTo(nextPoint.position));
                dist = dist / 9;

                let labelPos = point.position.clone().add(dir.multiplyScalar(dist));
                angleLabel.position.copy(labelPos);

                let msg = Utils.addCommas((angle * (180.0 / Math.PI)).toFixed(1)) + '\u00B0';
                angleLabel.setText(msg);

                angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
            }
        }

        { // update height stuff
            let heightEdge = this.heightEdge;
            heightEdge.visible = this.showHeight;
            this.heightLabel.visible = this.showHeight;

            if (this.showHeight) {
                let sorted = this.points.slice().sort((a, b) => a.position.z - b.position.z);
                let lowPoint = sorted[0].position.clone();
                let highPoint = sorted[sorted.length - 1].position.clone();
                let min = lowPoint.z;
                let max = highPoint.z;
                let height = max - min;

                let start = new THREE.Vector3(highPoint.x, highPoint.y, min);
                let end = new THREE.Vector3(highPoint.x, highPoint.y, max);

                heightEdge.position.copy(lowPoint);

                heightEdge.geometry.setPositions([
                    0, 0, 0,
                    ...start.clone().sub(lowPoint).toArray(),
                    ...start.clone().sub(lowPoint).toArray(),
                    ...end.clone().sub(lowPoint).toArray(),
                ]);

                heightEdge.geometry.verticesNeedUpdate = true;
                // heightEdge.geometry.computeLineDistances();
                // heightEdge.geometry.lineDistancesNeedUpdate = true;
                heightEdge.geometry.computeBoundingSphere();
                heightEdge.computeLineDistances();

                // heightEdge.material.dashSize = height / 40;
                // heightEdge.material.gapSize = height / 40;

                let heightLabelPosition = start.clone().add(end).multiplyScalar(0.5);
                this.heightLabel.position.copy(heightLabelPosition);

                let suffix = "";
                if(this.lengthUnit != null && this.lengthUnitDisplay != null){
                    height = height / this.lengthUnit.unitspermeter * this.lengthUnitDisplay.unitspermeter;  //convert to meters then to the display unit
                    suffix = this.lengthUnitDisplay.code;
                }

                let txtHeight = Utils.addCommas(height.toFixed(2));
                let msg = `${txtHeight} ${suffix}`;
                this.heightLabel.setText(msg);
            }
        }

        { // update circle stuff
            const circleRadiusLabel = this.circleRadiusLabel;
            const circleRadiusLine = this.circleRadiusLine;
            const circleLine = this.circleLine;
            const circleCenter = this.circleCenter;

            const circleOkay = this.points.length === 3;

            circleRadiusLabel.visible = this.showCircle && circleOkay;
            circleRadiusLine.visible = this.showCircle && circleOkay;
            circleLine.visible = this.showCircle && circleOkay;
            circleCenter.visible = this.showCircle && circleOkay;

            if(this.showCircle && circleOkay){

                const A = this.points[0].position;
                const B = this.points[1].position;
                const C = this.points[2].position;

                if(!A.equals(B) && !B.equals(C) ){ // reality custom code
                    const AB = B.clone().sub(A);
                    const AC = C.clone().sub(A);
                    const N = AC.clone().cross(AB).normalize();

                    const center = Potree.Utils.computeCircleCenter(A, B, C);
                    const radius = center.distanceTo(A);


                    const scale = radius / 20;
                    circleCenter.position.copy(center);
                    circleCenter.scale.set(scale, scale, scale);

                    //circleRadiusLine.geometry.vertices[0].set(0, 0, 0);
                    //circleRadiusLine.geometry.vertices[1].copy(B.clone().sub(center));

                    circleRadiusLine.geometry.setPositions( [
                        0, 0, 0,
                        ...B.clone().sub(center).toArray()
                    ] );

                    circleRadiusLine.geometry.verticesNeedUpdate = true;
                    circleRadiusLine.geometry.computeBoundingSphere();
                    circleRadiusLine.position.copy(center);
                    circleRadiusLine.computeLineDistances();

                    const target = center.clone().add(N);
                    circleLine.position.copy(center);
                    circleLine.scale.set(radius, radius, radius);
                    circleLine.lookAt(target);

                    circleRadiusLabel.visible = true;
                    circleRadiusLabel.position.copy(center.clone().add(B).multiplyScalar(0.5));
                    circleRadiusLabel.setText(`${radius.toFixed(3)}`);
                } // reality custom code
            }
        }

        { // update area label
            this.areaLabel.position.copy(centroid);
            this.areaLabel.visible = this.showArea && this.points.length >= 3;
            let area = this.getArea();

            let suffix = "";
            if(this.lengthUnit != null && this.lengthUnitDisplay != null){
                area = area / Math.pow(this.lengthUnit.unitspermeter, 2) * Math.pow(this.lengthUnitDisplay.unitspermeter, 2);  //convert to square meters then to the square display unit
                suffix = this.lengthUnitDisplay.code;
            }

            let txtArea = Utils.addCommas(area.toFixed(1));
            let msg =  `${txtArea} ${suffix}\u00B2`;
            this.areaLabel.setText(msg);
        }

        // this.updateAzimuth();
    };

    Measure.prototype.getArea = function () {
        if(this.points.length < 3 ){
            return 0;
        }

        if (!window.Cesium) {
            console.warn("Cesium js need to be included to calculate the correct area. \n Do not use Cesium js of Potree. \n It's too old. \n See measurement.html.");
            return 0;
        }

        let positions = [];

        for (let i = 0; i < this.points.length; i++) {
            let position = this.points[i].position;

            positions.push(new Cesium.Cartesian3(position.x, position.y, position.z));
        }

        let geometry = Cesium.CoplanarPolygonGeometry.createGeometry(Cesium.CoplanarPolygonGeometry.fromPositions({
            positions: positions,
            vertexFormat: Cesium.VertexFormat.POSITION_ONLY
        }));

        if (geometry == null) {
            return 0;
        }

        let flatPositions = geometry.attributes.position.values;
        const indices = geometry.indices;

        let area = 0;

        for (let i = 0; i < indices.length; i += 3) {
            let i0 = indices[i];
            let i1 = indices[i + 1];
            let i2 = indices[i + 2];

            let p0 = Cesium.Cartesian3.unpack(flatPositions, i0 * 3, new Cesium.Cartesian3());
            let p1 = Cesium.Cartesian3.unpack(flatPositions, i1 * 3, new Cesium.Cartesian3());
            let p2 = Cesium.Cartesian3.unpack(flatPositions, i2 * 3, new Cesium.Cartesian3());

            area += triangleAreaCesium(p0, p1, p2);
        }

        return area;
    };

    Measure.prototype.addMarker = function(point) {
        if (point.x != null) {
            point = {position: point};
        }else if(point instanceof Array){
            point = {position: new THREE.Vector3(...point)};
        }
        this.points.push(point);

        // sphere
        let sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());

        this.add(sphere);
        this.spheres.push(sphere);

        { // edges
            let lineGeometry = new LineGeometry();
            lineGeometry.setPositions( [
                0, 0, 0,
                0, 0, 0,
            ]);

            let lineMaterial = new LineMaterial({
                color: 0xff0000,
                linewidth: 2,
                resolution:  new THREE.Vector2(1000, 1000),
            });

            lineMaterial.depthTest = false;

            let edge = new Line2(lineGeometry, lineMaterial);
            edge.visible = true;

            this.add(edge);
            this.edges.push(edge);
        }

        { // edge labels
            let edgeLabel = new TextSprite();
            edgeLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
            edgeLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
            edgeLabel.material.depthTest = false;
            edgeLabel.visible = false;
            edgeLabel.fontsize = 16;
            this.edgeLabels.push(edgeLabel);
            this.add(edgeLabel);
        }

        { // angle labels
            let angleLabel = new TextSprite();
            angleLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
            angleLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
            angleLabel.fontsize = 16;
            angleLabel.material.depthTest = false;
            angleLabel.material.opacity = 1;
            angleLabel.visible = false;
            this.angleLabels.push(angleLabel);
            this.add(angleLabel);
        }

        { // coordinate labels
            let coordinateLabel = new TextSprite();
            coordinateLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
            coordinateLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
            coordinateLabel.fontsize = 16;
            coordinateLabel.material.depthTest = false;
            coordinateLabel.material.opacity = 1;
            coordinateLabel.visible = false;
            this.coordinateLabels.push(coordinateLabel);
            this.add(coordinateLabel);
        }

        { // Event Listeners
            let drag = (e) => {
                let I = Utils.getMousePointCloudIntersection(
                    e.drag.end,
                    e.viewer.scene.getActiveCamera(),
                    e.viewer,
                    e.viewer.scene.pointclouds,
                    {pickClipped: true});

                if (I) {
                    let i = this.spheres.indexOf(e.drag.object);
                    if (i !== -1) {
                        let point = this.points[i];

                        // loop through current keys and cleanup ones that will be orphaned
                        for (let key of Object.keys(point)) {
                            if (!I.point[key]) {
                                delete point[key];
                            }
                        }

                        for (let key of Object.keys(I.point).filter(e => e !== 'position')) {
                            point[key] = I.point[key];
                        }

                        this.setPosition(i, I.location);

                        // start reality
                        this.currentPointIndex = i;
                        // end
                    }
                }
            };

            let drop = e => {
                let i = this.spheres.indexOf(e.drag.object);
                if (i !== -1) {
                    this.dispatchEvent({
                        'type': 'marker_dropped',
                        'measurement': this,
                        'index': i
                    });

                    // start reality
                    this.currentPointIndex = -1;
                    // end reality
                }
            };

            let mouseover = (e) => e.object.material.emissive.setHex(0x888888);
            let mouseleave = (e) => e.object.material.emissive.setHex(0x000000);

            sphere.addEventListener('drag', drag);
            sphere.addEventListener('drop', drop);
            sphere.addEventListener('mouseover', mouseover);
            sphere.addEventListener('mouseleave', mouseleave);
        }

        let event = {
            type: 'marker_added',
            measurement: this,
            sphere: sphere
        };
        this.dispatchEvent(event);

        this.setMarker(this.points.length - 1, point);
    };
}

function triangleAreaCesium(p0, p1, p2) {
    let v0Scratch = new Cesium.Cartesian3();
    let v1Scratch = new Cesium.Cartesian3();

    let v0 = Cesium.Cartesian3.subtract(p0, p1, v0Scratch);
    let v1 = Cesium.Cartesian3.subtract(p2, p1, v1Scratch);
    let cross = Cesium.Cartesian3.cross(v0, v1, v0);

    return Cesium.Cartesian3.magnitude(cross) * 0.5;
}

export {overrideMeasure}