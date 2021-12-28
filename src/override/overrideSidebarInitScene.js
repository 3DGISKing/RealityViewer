import * as THREE from "three"
import {Sidebar} from "Potree";
import {GeoJSONExporter} from "Potree"
import {DXFExporter} from "Potree"
import {PropertiesPanel} from "Potree"
import {Volume} from "Potree"
import {PointCloudTree} from "Potree"
import {Measure} from "Potree"
import {Profile} from "Potree";
import {Annotation} from "Potree";
import {PolygonClipVolume} from "Potree";
import {CameraMode} from "Potree";
import {OrientedImage} from "Potree";
import {Images360} from "Potree";
import {Utils} from "Potree";

import {deleteObject} from "../deleteObject.js";
import {isAnimatableObject} from "../isAnimatableObject.js";

function overrideSideInitScene(viewer) {
    Sidebar.prototype.initScene = function () {
        let elScene = $("#menu_scene");
        let elObjects = elScene.next().find("#scene_objects");
        let elProperties = elScene.next().find("#scene_object_properties");

        {
            let elExport = $("#scene_export");

            let geoJSONIcon = `${Potree.resourcePath}/icons/file_geojson.svg`;
            let dxfIcon = `${Potree.resourcePath}/icons/file_dxf.svg`;

            elExport.append(`
				Export: <br>
				<a href="#" download="measure.json"><img name="geojson_export_button" src="${geoJSONIcon}" class="button-icon" style="height: 24px" /></a>
				<a href="#" download="measure.dxf"><img name="dxf_export_button" src="${dxfIcon}" class="button-icon" style="height: 24px" /></a>				
			`);

            let elDownloadJSON = elExport.find("img[name=geojson_export_button]").parent();

            elDownloadJSON.click((event) => {
                let scene = this.viewer.scene;
                let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

                if (measurements.length > 0) {
                    let geoJson = GeoJSONExporter.toString(measurements);

                    let url = window.URL.createObjectURL(new Blob([geoJson], {type: 'data:application/octet-stream'}));
                    elDownloadJSON.attr('href', url);
                } else {
                    this.viewer.postError("no measurements to export");
                    event.preventDefault();
                }
            });

            let elDownloadDXF = elExport.find("img[name=dxf_export_button]").parent();

            elDownloadDXF.click((event) => {
                let scene = this.viewer.scene;
                let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

                if (measurements.length > 0) {
                    let dxf = DXFExporter.toString(measurements);

                    let url = window.URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
                    elDownloadDXF.attr('href', url);
                } else {
                    this.viewer.postError("no measurements to export");
                    event.preventDefault();
                }
            });

            // let elDownloadPotree = elExport.find("img[name=potree_export_button]").parent();
            // elDownloadPotree.click( (event) => {
            //
            // 	let data = Potree.saveProject(this.viewer);
            // 	let dataString = JSON5.stringify(data, null, "\t")
            //
            // 	let url = window.URL.createObjectURL(new Blob([dataString], {type: 'data:application/octet-stream'}));
            // 	elDownloadPotree.attr('href', url);
            // });
        }

        let propertiesPanel = new PropertiesPanel(elProperties, this.viewer);

        this.propertiesPanel = propertiesPanel;

        propertiesPanel.setScene(this.viewer.scene);

        localStorage.removeItem('jstree');

        let tree = $(`<div id="jstree_scene"></div>`);

        elObjects.append(tree);

        tree.jstree({
            'plugins': ["checkbox", "state",
                // start reality logic
                "contextmenu"
                // end reality logic
            ],
            'core': {
                "dblclick_toggle": false,
                "state": {
                    "checked": true
                },
                'check_callback': true,
                "expand_selected_onload": true
            },
            "checkbox": {
                "keep_selected_style": true,
                "three_state": false,
                "whole_node": false,
                "tie_selection": false,
            },
            // start reality logic
            "contextmenu": {
                items: function ($node) {
                    return {
                        "Delete": {
                            "separator_before": false,
                            "separator_after": false,
                            "label": "Delete",
                            "action": function (obj) {
                                if (!$node.data)
                                    return;

                                tree.jstree("delete_node", $node.id);

                                deleteObject(viewer, $node.data);
                            }
                        }
                    }
                }
            }
            //end reality logic
        });

        let createNode = (parent, text, icon, object) => {
            let nodeID = tree.jstree('create_node', parent, {
                    "text": text,
                    "icon": icon,
                    "data": object
                },
                "last", false, false);

            if (object.visible) {
                tree.jstree('check_node', nodeID);
            } else {
                tree.jstree('uncheck_node', nodeID);
            }

            return nodeID;
        };

        let pcID = tree.jstree('create_node', "#", {
            "text": "<b>Point Clouds</b>",
            "id": "pointclouds"
        }, "last", false, false);
        // let pcID = tree.jstree('create_node', "#", { "text": "<b>Point Clouds</b>", "id": "pointclouds", "li_attr" : { "class" : "hidden" }}, "last", false, false);
        let measurementID = tree.jstree('create_node', "#", {
            "text": "<b>Measurements</b>",
            "id": "measurements"
        }, "last", false, false);
        let annotationsID = tree.jstree('create_node', "#", {
            "text": "<b>Annotations</b>",
            "id": "annotations"
        }, "last", false, false);
        let otherID = tree.jstree('create_node', "#", {"text": "<b>Other</b>", "id": "other"}, "last", false, false);
        let vectorsID = tree.jstree('create_node', "#", {
            "text": "<b>Vectors</b>",
            "id": "vectors"
        }, "last", false, false);
        let imagesID = tree.jstree('create_node', "#", {
            "text": "<b> Images</b>",
            "id": "images"
        }, "last", false, false);
        // let vectorsID = tree.jstree('create_node', "#", { "text": "<b>Vectors</b>", "id": "vectors", "li_attr" : { "class" : "hidden" } }, "last", false, false);
        // let imagesID = tree.jstree('create_node', "#", { "text": "<b> Images</b>", "id": "images", "li_attr" : { "class" : "hidden" } }, "last", false, false);

        tree.jstree("check_node", pcID);
        tree.jstree("check_node", measurementID);
        tree.jstree("check_node", annotationsID);
        tree.jstree("check_node", otherID);
        tree.jstree("check_node", vectorsID);
        tree.jstree("check_node", imagesID);

        tree.on('create_node.jstree', (e, data) => {
            tree.jstree("open_all");
        });

        tree.on("select_node.jstree", (e, data) => {
            let object = data.node.data;

            // start reality logic
            if (object === null) {
                this.viewer.animationEditor.hide();
                return;
            }
            // end reality logic

            propertiesPanel.set(object);

            // start reality logic
            // why? because of enableObjectSelectionInSceneTreeByInputHandler
            if (!object.selectedByInputHandler) {
                // end reality logic

                this.viewer.inputHandler.deselectAll();

                if (object instanceof Volume) {
                    this.viewer.inputHandler.toggleSelection(object);
                }

                // start reality logic
                object.selectedByInputHandler = undefined;
            }
            // end reality logic

            $(this.viewer.renderer.domElement).focus();

            // start reality logic
            if (object) {
                if (object instanceof PointCloudTree) {
                    // does not support animation for point cloud
                    this.viewer.animationEditor.hide();
                    return;
                }

                if (object.type === "Camera") {
                    object = this.viewer.scene.getActiveCamera();
                }

                if(!isAnimatableObject(object)){
                    this.viewer.animationEditor.hide();
                    return;
                }

                this.viewer.animationEditor.setTargetThreeJsObject(object);
                this.viewer.animationEditor.show();
            } else
                this.viewer.animationEditor.hide();
            // end reality logic
        });

        tree.on("deselect_node.jstree", (e, data) => {
            propertiesPanel.set(null);
        });

        tree.on("delete_node.jstree", (e, data) => {
            propertiesPanel.set(null);
        });

        tree.on('dblclick', '.jstree-anchor', (e) => {

            let instance = $.jstree.reference(e.target);
            let node = instance.get_node(e.target);
            let object = node.data;

            // ignore double click on checkbox
            if (e.target.classList.contains("jstree-checkbox")) {
                return;
            }

            if (object instanceof PointCloudTree) {
                let box = this.viewer.getBoundingBox([object]);
                let node = new THREE.Object3D();
                node.boundingBox = box;
                this.viewer.zoomTo(node, 1, 500);
            } else if (object instanceof Measure) {
                let points = object.points.map(p => p.position);
                let box = new THREE.Box3().setFromPoints(points);
                if (box.getSize(new THREE.Vector3()).length() > 0) {
                    let node = new THREE.Object3D();
                    node.boundingBox = box;
                    this.viewer.zoomTo(node, 2, 500);
                }
            } else if (object instanceof Profile) {
                let points = object.points;
                let box = new THREE.Box3().setFromPoints(points);
                if (box.getSize(new THREE.Vector3()).length() > 0) {
                    let node = new THREE.Object3D();
                    node.boundingBox = box;
                    this.viewer.zoomTo(node, 1, 500);
                }
            } else if (object instanceof Volume) {

                let box = object.boundingBox.clone().applyMatrix4(object.matrixWorld);

                if (box.getSize(new THREE.Vector3()).length() > 0) {
                    let node = new THREE.Object3D();
                    node.boundingBox = box;
                    this.viewer.zoomTo(node, 1, 500);
                }
            } else if (object instanceof Annotation) {
                object.moveHere(this.viewer.scene.getActiveCamera());
            } else if (object instanceof PolygonClipVolume) {
                let dir = object.camera.getWorldDirection(new THREE.Vector3());
                let target;

                if (object.camera instanceof THREE.OrthographicCamera) {
                    dir.multiplyScalar(object.camera.right)
                    target = new THREE.Vector3().addVectors(object.camera.position, dir);
                    this.viewer.setCameraMode(CameraMode.ORTHOGRAPHIC);
                } else if (object.camera instanceof THREE.PerspectiveCamera) {
                    dir.multiplyScalar(this.viewer.scene.view.radius);
                    target = new THREE.Vector3().addVectors(object.camera.position, dir);
                    this.viewer.setCameraMode(CameraMode.PERSPECTIVE);
                }

                this.viewer.scene.view.position.copy(object.camera.position);
                this.viewer.scene.view.lookAt(target);
            } else if (object instanceof THREE.SpotLight) {
                let distance = (object.distance > 0) ? object.distance / 4 : 5 * 1000;
                let position = object.position;
                let target = new THREE.Vector3().addVectors(
                    position,
                    object.getWorldDirection(new THREE.Vector3()).multiplyScalar(distance));

                this.viewer.scene.view.position.copy(object.position);
                this.viewer.scene.view.lookAt(target);
            } else if (object instanceof THREE.Object3D) {
                let box = new THREE.Box3().setFromObject(object);

                if (box.getSize(new THREE.Vector3()).length() > 0) {
                    let node = new THREE.Object3D();
                    node.boundingBox = box;
                    this.viewer.zoomTo(node, 1, 500);
                }
            } else if (object instanceof OrientedImage) {
                // TODO zoom to images

                // let box = new THREE.Box3().setFromObject(object);

                // if(box.getSize(new THREE.Vector3()).length() > 0){
                // 	let node = new THREE.Object3D();
                // 	node.boundingBox = box;
                // 	this.viewer.zoomTo(node, 1, 500);
                // }
            } else if (object instanceof Images360) {
                // TODO
            } else if (object instanceof Geopackage) {
                // TODO
            }
        });

        tree.on("uncheck_node.jstree", (e, data) => {
            let object = data.node.data;

            if (object) {
                object.visible = false;
            }
        });

        tree.on("check_node.jstree", (e, data) => {
            let object = data.node.data;

            if (object) {
                object.visible = true;
            }
        });

        let onPointCloudAdded = (e) => {
            let pointcloud = e.pointcloud;
            let cloudIcon = `${Potree.resourcePath}/icons/cloud.svg`;
            let node = createNode(pcID, pointcloud.name, cloudIcon, pointcloud);

            pointcloud.addEventListener("visibility_changed", () => {
                if (pointcloud.visible) {
                    tree.jstree('check_node', node);
                } else {
                    tree.jstree('uncheck_node', node);
                }
            });
        };

        let onMeasurementAdded = (e) => {
            let measurement = e.measurement;
            let icon = Utils.getMeasurementIcon(measurement);
            createNode(measurementID, measurement.name, icon, measurement);
        };

        let onVolumeAdded = (e) => {
            let volume = e.volume;
            let icon = Utils.getMeasurementIcon(volume);
            let node = createNode(measurementID, volume.name, icon, volume);

            volume.addEventListener("visibility_changed", () => {
                if (volume.visible) {
                    tree.jstree('check_node', node);
                } else {
                    tree.jstree('uncheck_node', node);
                }
            });
        };

        let onProfileAdded = (e) => {
            let profile = e.profile;
            let icon = Utils.getMeasurementIcon(profile);
            createNode(measurementID, profile.name, icon, profile);
        };

        let onAnnotationAdded = (e) => {
            let annotation = e.annotation;

            let annotationIcon = `${Potree.resourcePath}/icons/annotation.svg`;
            let parentID = this.annotationMapping.get(annotation.parent);
            let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
            this.annotationMapping.set(annotation, annotationID);

            annotation.addEventListener("annotation_changed", (e) => {
                let annotationsRoot = $("#jstree_scene").jstree().get_json("annotations");
                let jsonNode = annotationsRoot.children.find(child => child.data.uuid === annotation.uuid);

                $.jstree.reference(jsonNode.id).rename_node(jsonNode.id, annotation.title);
            });
        };

        let onCameraAnimationAdded = (e) => {
            const animation = e.animation;

            const animationIcon = `${Potree.resourcePath}/icons/camera_animation.svg`;
            createNode(otherID, "animation", animationIcon, animation);
        };

        let onOrientedImagesAdded = (e) => {
            const images = e.images;

            const imagesIcon = `${Potree.resourcePath}/icons/picture.svg`;
            const node = createNode(imagesID, "images", imagesIcon, images);

            images.addEventListener("visibility_changed", () => {
                if (images.visible) {
                    tree.jstree('check_node', node);
                } else {
                    tree.jstree('uncheck_node', node);
                }
            });
        };

        let onImages360Added = (e) => {
            const images = e.images;

            const imagesIcon = `${Potree.resourcePath}/icons/picture.svg`;
            const node = createNode(imagesID, "360° images", imagesIcon, images);

            images.addEventListener("visibility_changed", () => {
                if (images.visible) {
                    tree.jstree('check_node', node);
                } else {
                    tree.jstree('uncheck_node', node);
                }
            });
        };

        let onImageAdded = (e) => {
            const image = e.image;

            const imagesIcon = `${Potree.resourcePath}/icons/picture.svg`;
            const node = createNode(imagesID, image.name, imagesIcon, image);

            image.addEventListener("visibility_changed", () => {
                if (image.visible) {
                    tree.jstree('check_node', node);
                } else {
                    tree.jstree('uncheck_node', node);
                }
            });

            // start reality logic
            // store node in the three js object

            image.node = node;

            // end reality logic
        };

        const onGeopackageAdded = (e) => {
            const geopackage = e.geopackage;

            const geopackageIcon = `${Potree.resourcePath}/icons/triangle.svg`;
            const tree = $(`#jstree_scene`);
            const parentNode = "vectors";

            for (const layer of geopackage.node.children) {
                const name = layer.name;

                let shpPointsID = tree.jstree('create_node', parentNode, {
                        "text": name,
                        "icon": geopackageIcon,
                        "object": layer,
                        "data": layer,
                    },
                    "last", false, false);
                tree.jstree(layer.visible ? "check_node" : "uncheck_node", shpPointsID);
            }
        };

        this.viewer.scene.addEventListener("pointcloud_added", onPointCloudAdded);
        this.viewer.scene.addEventListener("measurement_added", onMeasurementAdded);
        this.viewer.scene.addEventListener("profile_added", onProfileAdded);
        this.viewer.scene.addEventListener("volume_added", onVolumeAdded);
        this.viewer.scene.addEventListener("camera_animation_added", onCameraAnimationAdded);
        this.viewer.scene.addEventListener("oriented_images_added", onOrientedImagesAdded);
        this.viewer.scene.addEventListener("360_images_added", onImages360Added);
        this.viewer.scene.addEventListener("image_added", onImageAdded);
        this.viewer.scene.addEventListener("geopackage_added", onGeopackageAdded);
        this.viewer.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
        this.viewer.scene.annotations.addEventListener("annotation_added", onAnnotationAdded);

        let onPointCloudRemoved = (e) => {
            let measurementsRoot = $("#jstree_scene").jstree().get_json("pointclouds");
            let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.pointcloud.uuid);

            tree.jstree("delete_node", jsonNode.id);
        };

        let onMeasurementRemoved = (e) => {
            let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
            let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.measurement.uuid);

            tree.jstree("delete_node", jsonNode.id);
        };

        let onVolumeRemoved = (e) => {
            let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
            let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);

            tree.jstree("delete_node", jsonNode.id);
        };

        let onPolygonClipVolumeRemoved = (e) => {
            let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
            let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);

            tree.jstree("delete_node", jsonNode.id);
        };

        let onProfileRemoved = (e) => {
            let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
            let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.profile.uuid);

            tree.jstree("delete_node", jsonNode.id);
        };

        let onImageRemoved = (e) => {
            let imagesRoot = $("#jstree_scene").jstree().get_json("images");
            let jsonNode = imagesRoot.children.find(child => child.data.uuid === e.image.uuid);

            tree.jstree("delete_node", jsonNode.id);
        };

        this.viewer.scene.addEventListener("pointcloud_removed", onPointCloudRemoved);
        this.viewer.scene.addEventListener("measurement_removed", onMeasurementRemoved);
        this.viewer.scene.addEventListener("volume_removed", onVolumeRemoved);
        this.viewer.scene.addEventListener("polygon_clip_volume_removed", onPolygonClipVolumeRemoved);
        this.viewer.scene.addEventListener("profile_removed", onProfileRemoved);
        this.viewer.scene.addEventListener("image_removed", onImageRemoved);

        {
            let annotationIcon = `${Potree.resourcePath}/icons/annotation.svg`;
            this.annotationMapping = new Map();
            this.annotationMapping.set(this.viewer.scene.annotations, annotationsID);
            this.viewer.scene.annotations.traverseDescendants(annotation => {
                let parentID = this.annotationMapping.get(annotation.parent);
                let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
                this.annotationMapping.set(annotation, annotationID);
            });
        }

        const scene = this.viewer.scene;
        for (let pointcloud of scene.pointclouds) {
            onPointCloudAdded({pointcloud: pointcloud});
        }

        for (let measurement of scene.measurements) {
            onMeasurementAdded({measurement: measurement});
        }

        for (let volume of [...scene.volumes, ...scene.polygonClipVolumes]) {
            onVolumeAdded({volume: volume});
        }

        for (let animation of scene.cameraAnimations) {
            onCameraAnimationAdded({animation: animation});
        }

        for (let images of scene.orientedImages) {
            onOrientedImagesAdded({images: images});
        }

        for (let images of scene.images360) {
            onImages360Added({images: images});
        }

        for (let image of scene.images) {
            onImageAdded({image: image});
        }

        for (const geopackage of scene.geopackages) {
            onGeopackageAdded({geopackage: geopackage});
        }

        for (let profile of scene.profiles) {
            onProfileAdded({profile: profile});
        }

        {
            createNode(otherID, "Camera", null, new THREE.Camera());
        }

        this.viewer.addEventListener("scene_changed", (e) => {
            propertiesPanel.setScene(e.scene);

            e.oldScene.removeEventListener("pointcloud_added", onPointCloudAdded);
            e.oldScene.removeEventListener("measurement_added", onMeasurementAdded);
            e.oldScene.removeEventListener("profile_added", onProfileAdded);
            e.oldScene.removeEventListener("volume_added", onVolumeAdded);
            e.oldScene.removeEventListener("polygon_clip_volume_added", onVolumeAdded);
            e.oldScene.removeEventListener("measurement_removed", onMeasurementRemoved);

            e.scene.addEventListener("pointcloud_added", onPointCloudAdded);
            e.scene.addEventListener("measurement_added", onMeasurementAdded);
            e.scene.addEventListener("profile_added", onProfileAdded);
            e.scene.addEventListener("volume_added", onVolumeAdded);
            e.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
            e.scene.addEventListener("measurement_removed", onMeasurementRemoved);
        });
    }
}

export {overrideSideInitScene}