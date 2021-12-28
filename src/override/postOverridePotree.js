import * as THREE from "three"
import {Sidebar} from "Potree";
import {PointCloudOctree} from "Potree";
import {overrideScene} from "./overrideScene.js";
import {overrideMeasure} from "./overrideMeasure.js";
import {overridePotreeForRealityNavigation} from "./overridePotreeForRealityNavigation.js";
import {overrideSideInitScene} from "./overrideSidebarInitScene.js";
import {overrideCirclePanel} from "./overrideCirclePanel.js";
import {ExportDialog} from '../ExportDialog.js';
import {ImageTool} from "../ImageTool.js";
import {ExportTool} from "../ExportTool.js";
import {Timeliner} from "../animation/editor/Timeliner.js";
import {Exporter} from "../Exporter.js";
import {Importor} from "../Importor.js";
import {overrideHQSplatRenderer} from './overrideHQSplatRenderer.js'
import {overridePotreeRenderer} from './overridePotreeRenderer.js'
import {overrideNodeLoader} from "./overrideNodeLoader.js";
import {overrideOctreeLoader} from "./overrideOctreeLoader.js";
import {overridePropertiesPanel} from "./overridePropertiesPanel.js";

let potreeViewer;
function overrideViewerInstance(viewer) {
    potreeViewer = viewer;

    viewer.scene.images = [];
    viewer.imageTool = new ImageTool(viewer);
    viewer.exportTool = new ExportTool(viewer);
    viewer.animationEditor = new Timeliner(viewer);
}

function postOverridePotree(viewer) {
    if (Sidebar === undefined) {
        console.error('potree should export Sidebar');
        return;
    }

    overrideViewerInstance(viewer);

    // sidebar
    Sidebar.prototype.initExportToolbar = function () {
        this.exportTool = viewer.exportTool;
        this.exportDialog = new ExportDialog(this.viewer);

        const jqToolPvMenuList = $('.pv-menu-list:eq(1)');

        const elements = jQuery(
            `<div class="divider"><span>Export</span></div>
             <li id="export_tools"></li> 
             <div class="divider"><span>Image</span></div>
             <li id="image_tools"></li>  
            `);

        jqToolPvMenuList.append(elements);

        let elToolbar = $('#export_tools');

        elToolbar.append(this.createToolIcon(
            window.Reality.resourcePath + '/icons/download.png',
            '[title]export.export_las',
            () => {
                const volumeForExport = this.exportTool.startInsertion();

                let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
                let jsonNode = measurementsRoot.children.find(child => child.data.uuid === volumeForExport.uuid);

                $.jstree.reference(jsonNode.id).deselect_all();
                $.jstree.reference(jsonNode.id).select_node(jsonNode.id);

                this.exportDialog.setVolume(volumeForExport);
                this.exportDialog.show();
            }
        ));
    };

    Sidebar.prototype.initImageToolbar = function () {
        this.imageTool = viewer.imageTool;

        let elToolbar = $('#image_tools');

        const icon = Potree.resourcePath + '/icons/picture.svg';

        const element = $(`
			<label>
                <img src="${icon}"
                    style="width: 32px; height: 32px"
                    class="button-icon"
                    data-i18n="[title]image.add_image" />
                 <input id="image-file-input" type="file" style="display:none">
			</label>
		`);

        elToolbar.append(element);

        const jqImageFileInput = $("#image-file-input");

        jqImageFileInput.change(() => {
            const image = document.createElement('img');

            let texture = new THREE.Texture(image);

            image.onload = () => {
                texture.needsUpdate = true;

                const image = this.imageTool.startInsertion({
                    texture: texture
                });

                let imagesRoot = $("#jstree_scene").jstree().get_json("images");
                let jsonNode = imagesRoot.children.find(child => child.data.uuid === image.uuid);

                $.jstree.reference(jsonNode.id).deselect_all();
                $.jstree.reference(jsonNode.id).select_node(jsonNode.id);

                jqImageFileInput.val("");
            };

            const userImage = $("#image-file-input")[0];

            if (userImage.files && userImage.files[0]) {
                const reader = new FileReader();

                reader.onload = function (e) {
                    image.src = e.target.result;
                };

                reader.readAsDataURL(userImage.files[0]);
            }
        });

        // REMOVE ALL
        elToolbar.append(this.createToolIcon(
            Potree.resourcePath + '/icons/reset_tools.svg',
            "[title]image.remove_all_image",
            () => {
                this.viewer.scene.removeAllImages();
            }
        ));
    };

    Sidebar.prototype.init = function () {
        this.initAccordion();
        this.initAppearance();
        this.initToolbar();
        this.initExportToolbar();
        this.initImageToolbar();
        this.initScene();
        this.initNavigation();
        this.initFilters();
        this.initClippingTool();
        this.initSettings();

        $('#potree_version_number').html(Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);
    };

    PointCloudOctree.prototype.pick = function (viewer, camera, ray, params = {}) {
        let renderer = viewer.renderer;
        let pRenderer = viewer.pRenderer;

        performance.mark("pick-start");

        let getVal = (a, b) => a !== undefined ? a : b;

        let pickWindowSize = getVal(params.pickWindowSize, 17);
        let pickOutsideClipRegion = getVal(params.pickOutsideClipRegion, false);

        pickWindowSize = 65;

        let size = renderer.getSize(new THREE.Vector2());

        let width = Math.ceil(getVal(params.width, size.width));
        let height = Math.ceil(getVal(params.height, size.height));

        let pointSizeType = getVal(params.pointSizeType, this.material.pointSizeType);
        let pointSize = getVal(params.pointSize, this.material.size);

        let nodes = this.nodesOnRay(this.visibleNodes, ray);

        if (nodes.length === 0) {
            return null;
        }

        if (!this.pickState) {
            let scene = new THREE.Scene();

            let material = new Potree.PointCloudMaterial();
            material.activeAttributeName = "indices";

            let renderTarget = new THREE.WebGLRenderTarget(
                1, 1,
                {
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.NearestFilter,
                    format: THREE.RGBAFormat
                }
            );

            this.pickState = {
                renderTarget: renderTarget,
                material: material,
                scene: scene
            };
        }

        let pickState = this.pickState;
        let pickMaterial = pickState.material;

        { // update pick material
            pickMaterial.pointSizeType = pointSizeType;

            // reality logic start
            if (viewer.possibleEXT_frag_depth())
                pickMaterial.shape = Potree.PointShape.PARABOLOID;
            else
                pickMaterial.shape = this.material.shape;

            // reality logic end

            pickMaterial.uniforms.uFilterReturnNumberRange.value = this.material.uniforms.uFilterReturnNumberRange.value;
            pickMaterial.uniforms.uFilterNumberOfReturnsRange.value = this.material.uniforms.uFilterNumberOfReturnsRange.value;
            pickMaterial.uniforms.uFilterGPSTimeClipRange.value = this.material.uniforms.uFilterGPSTimeClipRange.value;
            pickMaterial.uniforms.uFilterPointSourceIDClipRange.value = this.material.uniforms.uFilterPointSourceIDClipRange.value;

            pickMaterial.activeAttributeName = "indices";

            pickMaterial.size = pointSize;
            pickMaterial.uniforms.minSize.value = this.material.uniforms.minSize.value;
            pickMaterial.uniforms.maxSize.value = this.material.uniforms.maxSize.value;
            pickMaterial.classification = this.material.classification;
            pickMaterial.recomputeClassification();

            if (params.pickClipped) {
                pickMaterial.clipBoxes = this.material.clipBoxes;
                pickMaterial.uniforms.clipBoxes = this.material.uniforms.clipBoxes;
                if (this.material.clipTask === Potree.ClipTask.HIGHLIGHT) {
                    pickMaterial.clipTask = Potree.ClipTask.NONE;
                } else {
                    pickMaterial.clipTask = this.material.clipTask;
                }
                pickMaterial.clipMethod = this.material.clipMethod;
            } else {
                pickMaterial.clipBoxes = [];
            }

            this.updateMaterial(pickMaterial, nodes, camera, renderer);
        }

        pickState.renderTarget.setSize(width, height);

        let pixelPos = new THREE.Vector2(params.x, params.y);

        let gl = renderer.getContext();
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(
            parseInt(pixelPos.x - (pickWindowSize - 1) / 2),
            parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
            parseInt(pickWindowSize), parseInt(pickWindowSize));


        renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
        renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
        renderer.state.setBlending(THREE.NoBlending);

        { // RENDER
            renderer.setRenderTarget(pickState.renderTarget);
            gl.clearColor(0, 0, 0, 0);
            renderer.clear(true, true, true);

            let tmp = this.material;
            this.material = pickMaterial;

            pRenderer.renderOctree(this, nodes, camera, pickState.renderTarget);

            this.material = tmp;
        }

        let clamp = (number, min, max) => Math.min(Math.max(min, number), max);

        let x = parseInt(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width));
        let y = parseInt(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height));
        let w = parseInt(Math.min(x + pickWindowSize, width) - x);
        let h = parseInt(Math.min(y + pickWindowSize, height) - y);

        let pixelCount = w * h;
        let buffer = new Uint8Array(4 * pixelCount);

        gl.readPixels(x, y, pickWindowSize, pickWindowSize, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

        renderer.setRenderTarget(null);
        renderer.state.reset();
        renderer.setScissorTest(false);
        gl.disable(gl.SCISSOR_TEST);

        let pixels = buffer;
        let ibuffer = new Uint32Array(buffer.buffer);

        // find closest hit inside pixelWindow boundaries
        let min = Number.MAX_VALUE;
        let hits = [];
        for (let u = 0; u < pickWindowSize; u++) {
            for (let v = 0; v < pickWindowSize; v++) {
                let offset = (u + v * pickWindowSize);
                let distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

                let pcIndex = pixels[4 * offset + 3];
                pixels[4 * offset + 3] = 0;
                let pIndex = ibuffer[offset];

                if (!(pcIndex === 0 && pIndex === 0) && (pcIndex !== undefined) && (pIndex !== undefined)) {
                    let hit = {
                        pIndex: pIndex,
                        pcIndex: pcIndex,
                        distanceToCenter: distance
                    };

                    if (params.all) {
                        hits.push(hit);
                    } else {
                        if (hits.length > 0) {
                            if (distance < hits[0].distanceToCenter) {
                                hits[0] = hit;
                            }
                        } else {
                            hits.push(hit);
                        }
                    }


                }
            }
        }

        for (let hit of hits) {
            let point = {};

            if (!nodes[hit.pcIndex]) {
                return null;
            }

            let node = nodes[hit.pcIndex];
            let pc = node.sceneNode;
            let geometry = node.geometryNode.geometry;

            for (let attributeName in geometry.attributes) {
                let attribute = geometry.attributes[attributeName];

                if (attributeName === 'position') {
                    let x = attribute.array[3 * hit.pIndex + 0];
                    let y = attribute.array[3 * hit.pIndex + 1];
                    let z = attribute.array[3 * hit.pIndex + 2];

                    let position = new THREE.Vector3(x, y, z);
                    position.applyMatrix4(pc.matrixWorld);

                    point[attributeName] = position;
                } else if (attributeName === 'indices') {

                } else {

                    let values = attribute.array.slice(attribute.itemSize * hit.pIndex, attribute.itemSize * (hit.pIndex + 1));

                    if (attribute.potree) {
                        const {scale, offset} = attribute.potree;
                        values = values.map(v => v / scale + offset);
                    }

                    point[attributeName] = values;
                }
            }
            hit.point = point;
        }

        performance.mark("pick-end");
        performance.measure("pick", "pick-start", "pick-end");

        if (params.all) {
            return hits.map(hit => hit.point);
        } else {
            if (hits.length === 0) {
                return null;
            } else {
                return hits[0].point;
                //let sorted = hits.sort( (a, b) => a.distanceToCenter - b.distanceToCenter);

                //return sorted[0].point;
            }
        }
    };

    overrideScene(viewer);
    overrideSideInitScene(viewer);
    overridePotreeForRealityNavigation(viewer);
    overrideMeasure();
    overrideCirclePanel();
    overrideHQSplatRenderer();
    overridePotreeRenderer();
    overrideNodeLoader();
    overrideOctreeLoader();
    overridePropertiesPanel();
}

function exportAll(fileName) {
    Exporter.export(potreeViewer, fileName);
}

function importAll(url) {
    Importor.import(potreeViewer, url);
}

export {
    exportAll,
    importAll,
    postOverridePotree
}