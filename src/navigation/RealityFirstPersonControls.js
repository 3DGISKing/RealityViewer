import * as THREE from "three"
import {MOUSE} from "Potree";
import {Utils} from "Potree";
import {EventDispatcher} from "Potree";

import {defined, ControlModes} from "./RealityNavigationControl.js";
import {navigationConfig} from "./NavigationConfig";

/**
 * @type TouchEvent
 */
let previousTouch = null;

/**
 * @type TouchEvent
 */
let twoFingerTouchStart;
let distanceBetweenTwoFingerWhenTouchStart;

export class RealityFirstPersonControls extends EventDispatcher {
    constructor(viewer) {
        super(viewer);

        this.viewer = viewer;
        this.renderer = viewer.renderer;

        this.scene = null;
        this.sceneControls = new THREE.Scene();

        this.fadeFactor = 20;
        this.wheelDelta = 0;
        this.zoomDelta = new THREE.Vector3();

        this.tweens = [];

        this._controlMode = ControlModes.Unknown;

        // orbit control parameters
        this.yawDelta = 0;
        this.pitchDelta = 0;
        this.panDelta = new THREE.Vector2(0, 0);
        this.radiusDelta = 0;

        //first person control parameters
        this.lockElevation = false;

        // mobile
        this.twoFingerZoomSpeed = 0.5;

        this.keys = {
            FORWARD: ['W'.charCodeAt(0), 38],
            BACKWARD: ['S'.charCodeAt(0), 40],
            LEFT: ['A'.charCodeAt(0), 37],
            RIGHT: ['D'.charCodeAt(0), 39],
            UP: ['R'.charCodeAt(0), 33],
            DOWN: ['F'.charCodeAt(0), 34]
        };

        this.translationDelta = new THREE.Vector3(0, 0, 0);
        this.translationWorldDelta = new THREE.Vector3(0, 0, 0);

        {
            let sg = new THREE.SphereGeometry(1, 16, 16);
            let sm = new THREE.MeshNormalMaterial();
            this.pivotIndicator = new THREE.Mesh(sg, sm);
            this.pivotIndicator.visible = false;
            this.sceneControls.add(this.pivotIndicator);
        }

        /**
         * @param {object} e
         * @param {boolean|undefined} e.ctrlKey
         * @param {object} e.drag
         * @param {number} e.drag.mouse
         */
        let drag = (e) => {
            if (!e.ctrlKey === undefined) {
                console.warn(`ignored the touch move event from input handler`);
                return;
            }

            const mouseButton = e.drag.mouse;

            if (mouseButton === MOUSE.LEFT && e.ctrlKey === false) {
                this._firstPersonLeftDrag(e);
            }

            if (mouseButton === MOUSE.RIGHT ||
                (mouseButton === MOUSE.LEFT && e.ctrlKey === true)) {
                this._orbitControlMouseRightDrag(e);
            }
        };

        let drop = e => {
            this.dispatchEvent({type: 'end'});
        };

        let onMouseUp = e => {
            this.pivot = null;
            this.pivotIndicator.visible = false;

            this._controlMode = ControlModes.Unknown;
        };

        let scroll = (e) => {
            /**
             * Move the camera forwards / backwards to the mouse cursor position.
             * Adjust speed with distance (like Potree Earth Control Scroll or Google Maps Scroll)
             */

            this._controlMode = ControlModes.EarthControl;

            this.wheelDelta += e.delta * navigationConfig.wheelSpeed;
        };

        let dblclick = (e) => {
            this.zoomToLocation(e.mouse);
        };

        /**
         * @param {TouchEvent} e
         */
        let touchStart = e => {
            if (e.touches.length === 1) {
                const mouse = this._touchToMouse(e.touches[0]);

                let I = Utils.getMousePointCloudIntersection(
                    mouse,
                    this.scene.getActiveCamera(),
                    this.viewer,
                    this.scene.pointclouds,
                    {pickClipped: false});

                if (!I)
                    I = this._getMousePointMapIntersection(mouse);

                if (I) {
                    this.pivot = I.location;
                    this.pivotIndicator.visible = true;
                    this.pivotIndicator.position.copy(I.location);
                }
            }

            if (e.touches.length === 2) {
                twoFingerTouchStart = e;
                distanceBetweenTwoFingerWhenTouchStart = distanceBetweenTwoFinger(e);
                this.pivotIndicator.visible = false;
            }

            previousTouch = e;
        };

        let touchEnd = e => {
            this.pivotIndicator.visible = false;
            previousTouch = e;
            twoFingerTouchStart = undefined;
        };

        let touchMove = e => {
            if (e.touches.length === 1 && previousTouch.touches.length === 1) {
                this._onOneFingerTouchMoveFirstPerson(e);
            }

            if (twoFingerTouchStart && previousTouch.touches.length === 2 && e.touches.length === 2) {
                this._onTwoFingerZoom(e);
            }

            if (e.touches.length === 3 && previousTouch.touches.length === 3) {
                this._onThreeFingerTouchMoveFirstPerson(e);
            }

            previousTouch = e;
        };

        this.addEventListener('drag', drag);
        this.addEventListener('drop', drop);
        this.addEventListener('mousewheel', scroll);
        this.addEventListener('mouseup', onMouseUp);
        this.addEventListener('dblclick', dblclick);
        this.addEventListener('touchstart', touchStart);
        this.addEventListener('touchend', touchEnd);
        this.addEventListener('touchmove', touchMove);
    }

    setScene(scene) {
        this.scene = scene;
    }

    stop() {
        this.wheelDelta = 0;
        this.zoomDelta.set(0, 0, 0);

        // orbit control parameters
        this.yawDelta = 0;
        this.pitchDelta = 0;
        this.radiusDelta = 0;
        this.panDelta.set(0, 0);

        //first person control
        this.translationDelta.set(0, 0, 0);
    }

    zoomToLocation(mouse) {
        let camera = this.scene.getActiveCamera();

        let I = Utils.getMousePointCloudIntersection(
            mouse,
            camera,
            this.viewer,
            this.scene.pointclouds);

        if (I === null) {
            return;
        }

        let targetRadius = 0;
        {
            let minimumJumpDistance = 0.2;

            let domElement = this.renderer.domElement;
            let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

            let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
            let lastNode = nodes[nodes.length - 1];
            let radius = lastNode.getBoundingSphere(new THREE.Sphere()).radius;
            targetRadius = Math.min(this.scene.view.radius, radius);
            targetRadius = Math.max(minimumJumpDistance, targetRadius);
        }

        let d = this.scene.view.direction.multiplyScalar(-1);
        let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
        // TODO Unused: let controlsTargetPosition = I.location;

        let animationDuration = 600;
        let easing = TWEEN.Easing.Quartic.Out;

        { // animate
            let value = {x: 0};
            let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
            tween.easing(easing);
            this.tweens.push(tween);

            let startPos = this.scene.view.position.clone();
            let targetPos = cameraTargetPosition.clone();
            let startRadius = this.scene.view.radius;
            let targetRadius = cameraTargetPosition.distanceTo(I.location);

            tween.onUpdate(() => {
                let t = value.x;
                this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
                this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
                this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

                this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
                this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
            });

            tween.onComplete(() => {
                this.tweens = this.tweens.filter(e => e !== tween);
            });

            tween.start();
        }
    }

    update(delta) {
        if (this._controlMode === ControlModes.EarthControl) {
            this._earthControlUpdate(delta);
        } else if (this._controlMode === ControlModes.OrbitControl) {
            this._orbitControlUpdate(delta);
        } else if(this._controlMode === ControlModes.FirstPersonControl) {
            this._updateByControlKeys(delta);
        } else if (this._controlKeyPressed()) {
            // detect pressed key
            this._updateByControlKeys(delta);
        } else {
            console.assert(this._controlMode === ControlModes.Unknown, 'unrecognized control mode: ' + this._controlMode);
        }
    }

    _earthControlUpdate(delta) {
        let view = this.scene.view;
        let fade = Math.pow(0.5, this.fadeFactor * delta);
        let progression = 1 - fade;
        let camera = this.scene.getActiveCamera();

        // compute zoom
        if (this.wheelDelta !== 0) {
            let I;

            if (!twoFingerTouchStart) {
                // desktop version

                I = Utils.getMousePointCloudIntersection(
                    this.viewer.inputHandler.mouse,
                    this.scene.getActiveCamera(),
                    this.viewer,
                    this.scene.pointclouds);

                if (!I)
                    I = this._getMousePointMapIntersection(this.viewer.inputHandler.mouse);
            } else {
                // mobile

                let domElement = this.renderer.domElement;

                let rect = domElement.getBoundingClientRect();

                let x0 = twoFingerTouchStart.touches[0].pageX - rect.left;
                let y0 = twoFingerTouchStart.touches[0].pageY - rect.top;

                let x1 = twoFingerTouchStart.touches[1].pageX - rect.left;
                let y1 = twoFingerTouchStart.touches[1].pageY - rect.top;

                const middleX = (x0 + x1) / 2;
                const middleY = (y0 + y1) / 2;

                const mouse = {
                    x: middleX,
                    y: middleY
                };

                I = Utils.getMousePointCloudIntersection(
                    mouse,
                    this.scene.getActiveCamera(),
                    this.viewer,
                    this.scene.pointclouds);

                if (!I)
                    I = this._getMousePointMapIntersection(mouse);
            }

            if (I) {
                let resolvedPos = new THREE.Vector3().addVectors(view.position, this.zoomDelta);
                let distance = I.location.distanceTo(resolvedPos);
                let jumpDistance = distance * 0.2 * this.wheelDelta;
                let targetDir = new THREE.Vector3().subVectors(I.location, view.position);
                targetDir.normalize();

                resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
                this.zoomDelta.subVectors(resolvedPos, view.position);

                {
                    view.radius = resolvedPos.distanceTo(I.location);
                    let speed = view.radius / 2.5;
                    this.viewer.setMoveSpeed(speed);
                }
            }
        }

        // apply zoom
        if (this.zoomDelta.length() !== 0) {
            let p = this.zoomDelta.clone().multiplyScalar(progression);

            let newPos = new THREE.Vector3().addVectors(view.position, p);
            view.position.copy(newPos);
        }

        if (this.pivotIndicator.visible) {
            let distance = this.pivotIndicator.position.distanceTo(view.position);
            let pixelwidth = this.renderer.domElement.clientwidth;
            let pixelHeight = this.renderer.domElement.clientHeight;
            let pr = Utils.projectedRadius(1, camera, distance, pixelwidth, pixelHeight);
            let scale = (10 / pr);
            this.pivotIndicator.scale.set(scale, scale, scale);
        }

        // decelerate over time
        {
            this.zoomDelta.multiplyScalar(fade);
            this.wheelDelta = 0;
        }
    }

    // same as original orbit control by mouse right button
    _orbitControlMouseRightDrag(e) {
        this._controlMode = ControlModes.OrbitControl;

        if (e.drag.object !== null) {
            return;
        }

        if (e.drag.startHandled === undefined) {
            e.drag.startHandled = true;

            this.dispatchEvent({type: 'start'});
        }

        let ndrag = {
            x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
            y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
        };

        this.panDelta.x += ndrag.x * navigationConfig.panSpeed;
        this.panDelta.y += ndrag.y * navigationConfig.panSpeed;

        this.stopTweens();
    }

    _firstPersonLeftDrag(e) {
        this._controlMode = ControlModes.FirstPersonControl;

        if (e.drag.object !== null) {
            return;
        }

        if (e.drag.startHandled === undefined) {
            e.drag.startHandled = true;

            this.dispatchEvent({type: 'start'});
        }

        let ndrag = {
            x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
            y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
        };

        this.yawDelta += ndrag.x * navigationConfig.firstPersonRotationSpeed * 3;
        this.pitchDelta += ndrag.y * navigationConfig.firstPersonRotationSpeed * 3;
    }

    stopTweens() {
        this.tweens.forEach(e => e.stop());
        this.tweens = [];
    }

    _orbitControlUpdate(delta) {
        let view = this.scene.view;

        if (this.yawDelta !== 0 && this.pitchDelta !== 0) {
            // apply rotation
            let progression = Math.min(1, this.fadeFactor * delta);

            let yaw = view.yaw;
            let pitch = view.pitch;
            let pivot = view.getPivot();

            yaw -= progression * this.yawDelta;
            pitch -= progression * this.pitchDelta;

            view.yaw = yaw;
            view.pitch = pitch;

            let V = this.scene.view.direction.multiplyScalar(-view.radius);
            let position = new THREE.Vector3().addVectors(pivot, V);

            view.position.copy(position);
        }

        { // apply pan
            let progression = Math.min(1, this.fadeFactor * delta);
            let panDistance = progression * view.radius * 3;

            let px = -this.panDelta.x * panDistance;
            let py = this.panDelta.y * panDistance;

            view.pan(px, py);
        }

        { // apply zoom
            let progression = Math.min(1, this.fadeFactor * delta);

            // let radius = view.radius + progression * this.radiusDelta * view.radius * 0.1;
            let radius = view.radius + progression * this.radiusDelta;

            let V = view.direction.multiplyScalar(-radius);
            let position = new THREE.Vector3().addVectors(view.getPivot(), V);
            view.radius = radius;

            view.position.copy(position);
        }

        {
            let speed = view.radius / 2.5;
            this.viewer.setMoveSpeed(speed);
        }

        { // decelerate over time
            let progression = Math.min(1, this.fadeFactor * delta);
            let attenuation = Math.max(0, 1 - this.fadeFactor * delta);

            this.yawDelta *= attenuation;
            this.pitchDelta *= attenuation;
            this.panDelta.multiplyScalar(attenuation);
            // this.radiusDelta *= attenuation;
            this.radiusDelta -= progression * this.radiusDelta;
        }
    }

    _updateByControlKeys(delta) {
        let view = this.scene.view;
        const oldPosition = view.position.clone();

        { // cancel move animations on user input
            let changes = [this.yawDelta,
                this.pitchDelta,
                this.translationDelta.length(),
                this.translationWorldDelta.length()];
            let changeHappens = changes.some(e => Math.abs(e) > 0.001);
            if (changeHappens && this.tweens.length > 0) {
                this.tweens.forEach(e => e.stop());
                this.tweens = [];
            }
        }

        let ih = this.viewer.inputHandler;

        let moveForward = this.keys.FORWARD.some(e => ih.pressedKeys[e]);
        let moveBackward = this.keys.BACKWARD.some(e => ih.pressedKeys[e]);
        let moveLeft = this.keys.LEFT.some(e => ih.pressedKeys[e]);
        let moveRight = this.keys.RIGHT.some(e => ih.pressedKeys[e]);
        let moveUp = this.keys.UP.some(e => ih.pressedKeys[e]);
        let moveDown = this.keys.DOWN.some(e => ih.pressedKeys[e]);

        { // accelerate while input is given
            if (this.lockElevation) {
                let dir = view.direction;
                dir.z = 0;
                dir.normalize();

                if (moveForward && moveBackward) {
                    this.translationWorldDelta.set(0, 0, 0);
                } else if (moveForward) {
                    this.translationWorldDelta.copy(dir.multiplyScalar(navigationConfig.translationSpeed));
                } else if (moveBackward) {
                    this.translationWorldDelta.copy(dir.multiplyScalar(-navigationConfig.translationSpeed));
                }
            } else {
                if (moveForward && moveBackward) {
                    this.translationDelta.y = 0;
                } else if (moveForward) {
                    this.translationDelta.y = navigationConfig.translationSpeed;
                } else if (moveBackward) {
                    this.translationDelta.y = -navigationConfig.translationSpeed;
                }
            }

            if (moveLeft && moveRight) {
                this.translationDelta.x = 0;
            } else if (moveLeft) {
                this.translationDelta.x = -navigationConfig.translationSpeed;
            } else if (moveRight) {
                this.translationDelta.x = navigationConfig.translationSpeed;
            }

            if (moveUp && moveDown) {
                this.translationWorldDelta.z = 0;
            } else if (moveUp) {
                this.translationWorldDelta.z = navigationConfig.translationSpeed;
            } else if (moveDown) {
                this.translationWorldDelta.z = -navigationConfig.translationSpeed;
            }
        }

        { // apply rotation
            let yaw = view.yaw;
            let pitch = view.pitch;

            yaw -= this.yawDelta * delta;
            pitch -= this.pitchDelta * delta;

            view.yaw = yaw;
            view.pitch = pitch;
        }

        { // apply translation
            view.translate(
                this.translationDelta.x * delta,
                this.translationDelta.y * delta,
                this.translationDelta.z * delta
            );

            view.translateWorld(
                this.translationWorldDelta.x * delta,
                this.translationWorldDelta.y * delta,
                this.translationWorldDelta.z * delta
            );
        }

        if (moveForward || moveBackward)
        {
            let delta = new THREE.Vector3().subVectors(oldPosition, view.position);

            delta = delta.length();

            if(moveForward)
                view.radius = view.radius - delta;
            else
                view.radius = view.radius + delta;

            let speed = view.radius / 2.5;
            this.viewer.setMoveSpeed(speed);
        }

        { // decelerate over time
            let attenuation = Math.max(0, 1 - this.fadeFactor * delta);
            this.yawDelta *= attenuation;
            this.pitchDelta *= attenuation;
            this.translationDelta.multiplyScalar(attenuation);
            this.translationWorldDelta.multiplyScalar(attenuation);
        }
    }

    _controlKeyPressed() {
        let ih = this.viewer.inputHandler;

        let moveForward = this.keys.FORWARD.some(e => ih.pressedKeys[e]);
        let moveBackward = this.keys.BACKWARD.some(e => ih.pressedKeys[e]);
        let moveLeft = this.keys.LEFT.some(e => ih.pressedKeys[e]);
        let moveRight = this.keys.RIGHT.some(e => ih.pressedKeys[e]);
        let moveUp = this.keys.UP.some(e => ih.pressedKeys[e]);
        let moveDown = this.keys.DOWN.some(e => ih.pressedKeys[e]);

        return moveForward ||
            moveBackward ||
            moveLeft ||
            moveRight ||
            moveUp ||
            moveDown;
    }

    /**
     * @param {object} mouse
     * @param {number} mouse.x
     * @param {number} mouse.y
     */
    _getMousePointMapIntersection(mouse) {
        if (!window.Cesium)
            return;

        if (!window.toScene)
            return;

        if (!window.cesiumViewer)
            return;

        const mousePosition = new Cesium.Cartesian2(mouse.x, mouse.y);

        const scene = window.cesiumViewer.scene;

        const ray = scene.camera.getPickRay(mousePosition, Cesium.Ray());

        let position = scene.globe.pick(ray, scene, new Cesium.Cartesian3());

        if (!defined(position)) {
            console.warn('failed to pick globe');
            return;
        }

        const carto = Cesium.Cartographic.fromCartesian(position);

        const longitude = Cesium.Math.toDegrees(carto.longitude);
        const latitude = Cesium.Math.toDegrees(carto.latitude);

        let xy = [longitude, latitude];

        xy = window.toScene.forward(xy);

        return {
            location: new THREE.Vector3(xy[0], xy[1], 0)
        };
    }


    // first person
    // same as _orbitControlMouseRightDrag
    _onOneFingerTouchMoveFirstPerson(e) {
        console.assert(e.touches.length === 1 && previousTouch.touches.length === 1, 'length should be 1');
        this._controlMode = ControlModes.FirstPersonControl;

        let delta = this._getOneFingerDelta(previousTouch, e);

        this.yawDelta += delta.x * navigationConfig.firstPersonRotationSpeed * 3;
        this.pitchDelta += delta.y * navigationConfig.firstPersonRotationSpeed * 3;
    }

    // 4.2.2
    // first person
    // same as _firstPersonLeftDrag
    _onThreeFingerTouchMoveFirstPerson(e) {
        console.assert(e.touches.length === 3 && previousTouch.touches.length === 3, 'length should be 3');
        this._controlMode = ControlModes.OrbitControl;

        const prevMouse = this._touchToMouse(previousTouch.touches[0]);
        const curMouse = this._touchToMouse(e.touches[0]);

        const x = curMouse.x - prevMouse.x;
        const y = curMouse.y - prevMouse.y;

        let ndrag = {
            x: x / this.renderer.domElement.clientWidth,
            y: y / this.renderer.domElement.clientHeight
        };

        this.panDelta.x += ndrag.x;
        this.panDelta.y += ndrag.y;

        this.stopTweens();
    }

    // two finger
    // same scroll
    _onTwoFingerZoom(e) {
        console.assert(twoFingerTouchStart !== undefined, 'two finger touch should be started');
        console.assert(previousTouch.touches.length === 2 && e.touches.length === 2, 'length should be 2');

        this._controlMode = ControlModes.EarthControl;

        let prev = previousTouch;
        let curr = e;

        let prevDX = prev.touches[0].pageX - prev.touches[1].pageX;
        let prevDY = prev.touches[0].pageY - prev.touches[1].pageY;
        let prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY);

        let currDX = curr.touches[0].pageX - curr.touches[1].pageX;
        let currDY = curr.touches[0].pageY - curr.touches[1].pageY;
        let currDist = Math.sqrt(currDX * currDX + currDY * currDY);

        let delta = currDist / prevDist;

        /*


        let dist = distanceBetweenTwoFinger(e);

        if(dist < distanceBetweenTwoFingerWhenTouchStart )
            dist = - dist;
         */

        delta *= this.twoFingerZoomSpeed;

        if (currDist < prevDist)
            delta = -delta;

        this.wheelDelta += delta * navigationConfig.wheelSpeed;
    }

    _touchToMouse(touch) {
        let domElement = this.renderer.domElement;

        let rect = domElement.getBoundingClientRect();
        let x = touch.pageX - rect.left;
        let y = touch.pageY - rect.top;

        return {
            x: x,
            y: y,
        };
    }

    /**
     * @param {TouchEvent} prev
     * @param {TouchEvent} curr
     * @return {{x: number, y: number}}
     */
    _getOneFingerDelta(prev, curr) {
        return {
            x: (curr.touches[0].pageX - prev.touches[0].pageX) / this.renderer.domElement.clientWidth,
            y: (curr.touches[0].pageY - prev.touches[0].pageY) / this.renderer.domElement.clientHeight
        };
    }
}

function distanceBetweenTwoFinger(e) {
    console.assert(e.touches.length === 2, 'length should be 2');

    let X0 = e.touches[0].pageX;
    let Y0 = e.touches[0].pageY;
    let X1 = e.touches[1].pageX;
    let Y1 = e.touches[1].pageY;

    return Math.sqrt((X0 - X1) * (X0 - X1) + (Y0 - Y1) * (Y0 - Y1));
}