import * as THREE from "three"
import {TransformationTool} from "Potree"
import {Utils} from "Potree";

function overrideTransformationToolOfPotree1_8() {
    TransformationTool.prototype.update = function () {
        if(this.selection.length === 1){
            // start reality logic

            if(this.selection[0].transformationEnabled === false) {
                this.scene.visible = false;
                return;
            }

            // end reality logic

            this.scene.visible = true;

            this.scene.updateMatrix();
            this.scene.updateMatrixWorld();

            let selected = this.selection[0];
            let world = selected.matrixWorld;
            let camera = this.viewer.scene.getActiveCamera();
            let domElement = this.viewer.renderer.domElement;
            let mouse = this.viewer.inputHandler.mouse;

            let center = selected.boundingBox.getCenter(new THREE.Vector3()).clone().applyMatrix4(selected.matrixWorld);

            this.scene.scale.copy(selected.boundingBox.getSize(new THREE.Vector3()).multiply(selected.scale));
            this.scene.position.copy(center);
            this.scene.rotation.copy(selected.rotation);

            this.scene.updateMatrixWorld();

            {
                // adjust scale of components
                for(let handleName of Object.keys(this.handles)){
                    let handle = this.handles[handleName];
                    let node = handle.node;

                    let handlePos = node.getWorldPosition(new THREE.Vector3());
                    let distance = handlePos.distanceTo(camera.position);
                    let pr = Utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);

                    let ws = node.parent.getWorldScale(new THREE.Vector3());

                    let s = (7 / pr);
                    let scale = new THREE.Vector3(s, s, s).divide(ws);

                    let rot = new THREE.Matrix4().makeRotationFromEuler(node.rotation);
                    let rotInv = rot.clone().invert();

                    scale.applyMatrix4(rotInv);
                    scale.x = Math.abs(scale.x);
                    scale.y = Math.abs(scale.y);
                    scale.z = Math.abs(scale.z);

                    node.scale.copy(scale);
                }

                // adjust rotation handles
                if(!this.dragging){
                    let tWorld = this.scene.matrixWorld;
                    let tObject = tWorld.clone().invert();
                    let camObjectPos = camera.getWorldPosition(new THREE.Vector3()).applyMatrix4(tObject);

                    let x = this.rotationHandles["rotation.x"].node.rotation;
                    let y = this.rotationHandles["rotation.y"].node.rotation;
                    let z = this.rotationHandles["rotation.z"].node.rotation;

                    x.order = "ZYX";
                    y.order = "ZYX";

                    let above = camObjectPos.z > 0;
                    let below = !above;
                    let PI_HALF = Math.PI / 2;

                    if(above){
                        if(camObjectPos.x > 0 && camObjectPos.y > 0){
                            x.x = 1 * PI_HALF;
                            y.y = 3 * PI_HALF;
                            z.z = 0 * PI_HALF;
                        }else if(camObjectPos.x < 0 && camObjectPos.y > 0){
                            x.x = 1 * PI_HALF;
                            y.y = 2 * PI_HALF;
                            z.z = 1 * PI_HALF;
                        }else if(camObjectPos.x < 0 && camObjectPos.y < 0){
                            x.x = 2 * PI_HALF;
                            y.y = 2 * PI_HALF;
                            z.z = 2 * PI_HALF;
                        }else if(camObjectPos.x > 0 && camObjectPos.y < 0){
                            x.x = 2 * PI_HALF;
                            y.y = 3 * PI_HALF;
                            z.z = 3 * PI_HALF;
                        }
                    }else if(below){
                        if(camObjectPos.x > 0 && camObjectPos.y > 0){
                            x.x = 0 * PI_HALF;
                            y.y = 0 * PI_HALF;
                            z.z = 0 * PI_HALF;
                        }else if(camObjectPos.x < 0 && camObjectPos.y > 0){
                            x.x = 0 * PI_HALF;
                            y.y = 1 * PI_HALF;
                            z.z = 1 * PI_HALF;
                        }else if(camObjectPos.x < 0 && camObjectPos.y < 0){
                            x.x = 3 * PI_HALF;
                            y.y = 1 * PI_HALF;
                            z.z = 2 * PI_HALF;
                        }else if(camObjectPos.x > 0 && camObjectPos.y < 0){
                            x.x = 3 * PI_HALF;
                            y.y = 0 * PI_HALF;
                            z.z = 3 * PI_HALF;
                        }
                    }
                }

                {
                    let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
                    let raycaster = new THREE.Raycaster(ray.origin, ray.direction);
                    let intersects = raycaster.intersectObjects(this.pickVolumes.filter(v => v.visible), true);

                    if(intersects.length > 0){
                        let I = intersects[0];
                        let handleName = I.object.handle;
                        this.setActiveHandle(this.handles[handleName]);
                    }else{
                        this.setActiveHandle(null);
                    }
                }

                //
                for(let handleName of Object.keys(this.scaleHandles)){
                    let handle = this.handles[handleName];
                    let node = handle.node;
                    let alignment = handle.alignment;



                }
            }

        }else{
            this.scene.visible = false;
        }
    }
}

export {overrideTransformationToolOfPotree1_8}