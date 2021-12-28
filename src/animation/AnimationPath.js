import * as THREE from "three"
import {LineGeometry} from "./../../potree/libs/three.js/lines/LineGeometry.js"
import {LineMaterial} from "./../../potree/libs/three.js/lines/LineMaterial.js"
import {Line2} from "./../../potree/libs/three.js/lines/Line2.js"
import {EventDispatcher} from "Potree";
import {ThreeJsObjectKeyingSet} from "./ThreeJsObjectKeyingSet.js"
import {CameraKeyframeFrustum} from "./CameraKeyframeFrustum.js"
import {updatePositionKeyframe, updateRotationKeyframe} from "./UpdateAnimation"

class AnimationPath extends EventDispatcher {
    constructor(options) {
        super();

        this.viewer = options.viewer;
        this._object = options.object;

        this.node = new THREE.Object3D();
        this.node.name = "AnimationPath";
        this.viewer.scene.scene.add(this.node);

        this.visible = true;
        this.frustums = [];
    }

    _createPath() {
        const geometry = new LineGeometry();

        let material = new LineMaterial({
            color: 0x00ff00,
            dashSize: 5,
            gapSize: 2,
            linewidth: 2,
            resolution: new THREE.Vector2(1000, 1000),
        });

        const line = new Line2(geometry, material);

        this.line = line;
        this.node.add(line);
    }

    dispose() {
        this.viewer.scene.scene.remove(this.node);
    }

    // instead of updating remove old and create new
    // we need to delete previous line and recreate
    // I don't know why
    update() {
        this.updatePath();
        this._updateFrustums();
    }

    updatePath() {
        this.node.remove(this.line);

        const animationData = this._object.animationData;
        const layers = animationData.layers;

        if(layers.length === 0) {
            return;
        }

        const firstLayer = layers[0];
        const keyframeCount = firstLayer.values.length;

        if(keyframeCount < 2) {
            return;
        }

        this._createPath();

        const positionXLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionX)[0];
        const positionYLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionY)[0];
        const positionZLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionZ)[0];

        let positions = [];

        for(let i = 0; i < keyframeCount ; i++) {
            const positionX = positionXLayer.values[i].value;
            const positionY = positionYLayer.values[i].value;
            const positionZ = positionZLayer.values[i].value;

            positions.push(positionX, positionY, positionZ);
        }

        this.line.geometry.setPositions(positions);
        this.line.geometry.verticesNeedUpdate = true;
        this.line.geometry.computeBoundingSphere();
        this.line.computeLineDistances();
    }

    _updateFrustums() {
        for (let i = 0; i < this.frustums.length; i++)
            this.node.remove(this.frustums[i]);

        this.frustums = [];

        const animationData = this._object.animationData;
        const layers = animationData.layers;

        if(layers.length === 0) {
            return;
        }

        if (this._object.type !== "PerspectiveCamera")
            return;

        const firstLayer = layers[0];
        const keyframeCount = firstLayer.values.length;

        const positionXLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionX)[0];
        const positionYLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionY)[0];
        const positionZLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionZ)[0];
        const rotationXLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.RotationX)[0];
        const rotationYLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.RotationY)[0];
        const rotationZLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.RotationZ)[0];

        for(let i = 0; i < keyframeCount ; i++) {
            let frustum = new CameraKeyframeFrustum(this._object, i);

            frustum.addEventListener('position_changed', (e) =>{
                const position = e.target.position;

                updatePositionKeyframe(this._object, i, position);
            });

            frustum.addEventListener('orientation_changed', (e) =>{
                let rotation = e.target.rotation.clone();

                // trick
                rotation.x = -rotation.x;
                rotation.z = rotation.z + Math.PI;

                updateRotationKeyframe(this._object, i, rotation);
            });

            this.node.add(frustum);

            this.frustums.push(frustum);

            const positionX = positionXLayer.values[i].value;
            const positionY = positionYLayer.values[i].value;
            const positionZ = positionZLayer.values[i].value;

            frustum.position.set(positionX, positionY, positionZ);

            const rotationX = rotationXLayer.values[i].value;
            const rotationY = rotationYLayer.values[i].value;
            const rotationZ = rotationZLayer.values[i].value;

            frustum.rotation.set(rotationX + Math.PI, 0, rotationZ);

            frustum.updateBoundingBox();
        }
    }
}

export {AnimationPath};