import * as THREE from "three"
import {LineGeometry} from "./../../potree/libs/three.js/lines/LineGeometry.js"
import {LineMaterial} from "./../../potree/libs/three.js/lines/LineMaterial.js"
import {Line2} from "./../../potree/libs/three.js/lines/Line2.js"

const f = 0.3;

class CameraKeyframeFrustum extends THREE.Object3D {
    constructor(object, keyframeIndex) {
        super();

        this._object = object; // target for animation
        this._keyFrameIndex = keyframeIndex;

        this.type = 'CameraKeyframeFrustum';

        this.addEventListener('select', e => {});
        this.addEventListener('deselect', e => {});

        this._createFrustumOutline();
        this._createFrustumMesh();

        this.boundingBox = new THREE.Box3();

        this.rotation.reorder("ZXY");

    }

    _createFrustumOutline(){
        const positions = [
            0,  0,  0,
            -f, -f, +1,

            0,  0,  0,
            f, -f, +1,

            0,  0,  0,
            f,  f, +1,

            0,  0,  0,
            -f,  f, +1,

            -f, -f, +1,
            f, -f, +1,

            f, -f, +1,
            f,  f, +1,

            f,  f, +1,
            -f,  f, +1,

            -f,  f, +1,
            -f, -f, +1,
        ];

        const geometry = new LineGeometry();

        geometry.setPositions(positions);
        geometry.verticesNeedUpdate = true;
        geometry.computeBoundingSphere();

        let material = new LineMaterial({
            color: 0x6f7292,
            linewidth: 2,
            resolution:  new THREE.Vector2(1000, 1000),
        });

        const frustumOutline = new Line2(geometry, material);

        frustumOutline.computeLineDistances();
        frustumOutline.rotation.reorder("ZXY");

        // draw front face of the frustum
        let frustumFrontFace = new THREE.Geometry();

        frustumFrontFace.vertices.push(new THREE.Vector3(-f, -f, 1));
        frustumFrontFace.vertices.push(new THREE.Vector3(f, -f, 1));
        frustumFrontFace.vertices.push(new THREE.Vector3(f, f, 1));
        frustumFrontFace.vertices.push(new THREE.Vector3(-f, f, 1));

        frustumFrontFace.faces.push(new THREE.Face3(0, 1, 2));
        frustumFrontFace.faces.push(new THREE.Face3(0, 2, 3));

        frustumFrontFace.faceVertexUvs[0].push([
            new THREE.Vector2(0, 1),
            new THREE.Vector2(1, 1),
            new THREE.Vector2(1, 0)
        ]);

        frustumFrontFace.faceVertexUvs[0].push([
            new THREE.Vector2(0, 1),
            new THREE.Vector2(1, 0),
            new THREE.Vector2(0, 0)
        ]);

        material = new THREE.MeshBasicMaterial({
            color: 0x4c4c4c,
            side: THREE.DoubleSide,
            opacity: 0.5,
            transparent: true
        });

        const mesh = new THREE.Mesh(frustumFrontFace, material);

        frustumOutline.add(mesh);

        this._frustumScale = 20;

        frustumOutline.scale.set(this._frustumScale, this._frustumScale, this._frustumScale);

        this.add(frustumOutline);

        this.frustumOutline = frustumOutline;
    }

    _createFrustumMesh() {
        let geometry = new THREE.Geometry();

        geometry.vertices.push(
            new Vector3(0, 0, 0),
            new Vector3(-f, -f, +1),
            new Vector3(-f, f, +1),
            new Vector3(f, f, +1),
            new Vector3(f, -f, +1),
        );

        geometry.faces.push(new THREE.Face3(0, 1, 2));
        geometry.faces.push(new THREE.Face3(0, 2, 3));
        geometry.faces.push(new THREE.Face3(0, 3, 4));
        geometry.faces.push(new THREE.Face3(0, 4, 1));
        geometry.faces.push(new THREE.Face3(1, 2, 3));
        geometry.faces.push(new THREE.Face3(3, 4, 1));

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.1
        });

        this.material = material;

        const frustumMesh = new THREE.Mesh(geometry, material);

        frustumMesh.scale.set(this._frustumScale, this._frustumScale, this._frustumScale);

        frustumMesh.geometry.computeBoundingBox();

        frustumMesh.rotation.reorder("ZXY");

        this.frustumMesh = frustumMesh;

        this.add(frustumMesh);
    }

    updateBoundingBox() {
        this.boundingBox.setFromObject(this.frustumMesh);
    }

    raycast (raycaster, intersects) {
        let is = [];

        this.frustumMesh.raycast(raycaster, is);

        if (is.length > 0) {
            let I = is[0];

            intersects.push({
                distance: I.distance,
                object: this,
                point: I.point.clone()
            });
        }
    }
}

export {CameraKeyframeFrustum};