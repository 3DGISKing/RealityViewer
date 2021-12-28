import * as THREE from "three"
import {
    HQSplatRenderer,
    PointCloudMaterial,
    PointShape,
    SphereVolume,
    Utils
} from "Potree"

function overrideHQSplatRenderer() {
    HQSplatRenderer.prototype.render = function (params) {
        this.init();

        const viewer = this.viewer;
        const camera = params.camera ? params.camera : viewer.scene.getActiveCamera();
        const {width, height} = this.viewer.renderer.getSize(new THREE.Vector2());

        viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

        this.resize(width, height);

        const visiblePointClouds = viewer.scene.pointclouds.filter(pc => pc.visible);
        const originalMaterials = new Map();

        for(let pointcloud of visiblePointClouds){
            originalMaterials.set(pointcloud, pointcloud.material);

            if(!this.attributeMaterials.has(pointcloud)){
                let attributeMaterial = new PointCloudMaterial();
                this.attributeMaterials.set(pointcloud, attributeMaterial);
            }

            if(!this.depthMaterials.has(pointcloud)){
                let depthMaterial = new PointCloudMaterial();

                // start reality
                if(this.viewer.scene.getActiveCamera().type !== "OrthographicCamera") {
                    //depthMaterial.setDefine("depth_pass", "#define hq_depth_pass");
                }
                //end reality

                depthMaterial.setDefine("use_edl", "#define use_edl");

                this.depthMaterials.set(pointcloud, depthMaterial);
            }
            // start reality
            // w of orthographic projection      
            else {
                let depthMaterial = this.depthMaterials.get(pointcloud);

                if(this.viewer.scene.getActiveCamera().type === "OrthographicCamera") {
                    if (depthMaterial.defines.get("depth_pass") !== undefined) {
                        depthMaterial.removeDefine("depth_pass");
                        depthMaterial.needsUpdate = true;
                    }
                }
            }
            //end reality
        }

        { // DEPTH PASS
            for (let pointcloud of visiblePointClouds) {
                let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

                let material = originalMaterials.get(pointcloud);
                let depthMaterial = this.depthMaterials.get(pointcloud);

                depthMaterial.size = material.size;
                depthMaterial.minSize = material.minSize;
                depthMaterial.maxSize = material.maxSize;

                depthMaterial.pointSizeType = material.pointSizeType;
                depthMaterial.visibleNodesTexture = material.visibleNodesTexture;
                depthMaterial.weighted = false;
                depthMaterial.screenWidth = width;
                depthMaterial.shape = PointShape.CIRCLE;
                depthMaterial.screenHeight = height;
                depthMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
                depthMaterial.uniforms.octreeSize.value = octreeSize;
                depthMaterial.spacing = pointcloud.pcoGeometry.spacing; // * Math.max(...pointcloud.scale.toArray());
                depthMaterial.classification = material.classification;
                depthMaterial.uniforms.classificationLUT.value.image.data = material.uniforms.classificationLUT.value.image.data;
                depthMaterial.classificationTexture.needsUpdate = true;

                depthMaterial.uniforms.uFilterReturnNumberRange.value = material.uniforms.uFilterReturnNumberRange.value;
                depthMaterial.uniforms.uFilterNumberOfReturnsRange.value = material.uniforms.uFilterNumberOfReturnsRange.value;
                depthMaterial.uniforms.uFilterGPSTimeClipRange.value = material.uniforms.uFilterGPSTimeClipRange.value;
                depthMaterial.uniforms.uFilterPointSourceIDClipRange.value = material.uniforms.uFilterPointSourceIDClipRange.value;

                depthMaterial.clipTask = material.clipTask;
                depthMaterial.clipMethod = material.clipMethod;
                depthMaterial.setClipBoxes(material.clipBoxes);
                depthMaterial.setClipPolygons(material.clipPolygons);

                pointcloud.material = depthMaterial;
            }

            viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtDepth, {
                clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
            });
        }

        { // ATTRIBUTE PASS
            for (let pointcloud of visiblePointClouds) {
                let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

                let material = originalMaterials.get(pointcloud);
                let attributeMaterial = this.attributeMaterials.get(pointcloud);

                attributeMaterial.size = material.size;
                attributeMaterial.minSize = material.minSize;
                attributeMaterial.maxSize = material.maxSize;

                attributeMaterial.pointSizeType = material.pointSizeType;
                attributeMaterial.activeAttributeName = material.activeAttributeName;
                attributeMaterial.visibleNodesTexture = material.visibleNodesTexture;
                attributeMaterial.weighted = true;
                attributeMaterial.screenWidth = width;
                attributeMaterial.screenHeight = height;
                attributeMaterial.shape = PointShape.CIRCLE;
                attributeMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
                attributeMaterial.uniforms.octreeSize.value = octreeSize;
                attributeMaterial.spacing = pointcloud.pcoGeometry.spacing; // * Math.max(...pointcloud.scale.toArray());
                attributeMaterial.classification = material.classification;
                attributeMaterial.uniforms.classificationLUT.value.image.data = material.uniforms.classificationLUT.value.image.data;
                attributeMaterial.classificationTexture.needsUpdate = true;

                attributeMaterial.uniforms.uFilterReturnNumberRange.value = material.uniforms.uFilterReturnNumberRange.value;
                attributeMaterial.uniforms.uFilterNumberOfReturnsRange.value = material.uniforms.uFilterNumberOfReturnsRange.value;
                attributeMaterial.uniforms.uFilterGPSTimeClipRange.value = material.uniforms.uFilterGPSTimeClipRange.value;
                attributeMaterial.uniforms.uFilterPointSourceIDClipRange.value = material.uniforms.uFilterPointSourceIDClipRange.value;

                attributeMaterial.elevationGradientRepeat = material.elevationGradientRepeat;
                attributeMaterial.elevationRange = material.elevationRange;
                attributeMaterial.gradient = material.gradient;
                attributeMaterial.matcap = material.matcap;

                attributeMaterial.intensityRange = material.intensityRange;
                attributeMaterial.intensityGamma = material.intensityGamma;
                attributeMaterial.intensityContrast = material.intensityContrast;
                attributeMaterial.intensityBrightness = material.intensityBrightness;

                attributeMaterial.rgbGamma = material.rgbGamma;
                attributeMaterial.rgbContrast = material.rgbContrast;
                attributeMaterial.rgbBrightness = material.rgbBrightness;

                attributeMaterial.weightRGB = material.weightRGB;
                attributeMaterial.weightIntensity = material.weightIntensity;
                attributeMaterial.weightElevation = material.weightElevation;
                attributeMaterial.weightRGB = material.weightRGB;
                attributeMaterial.weightClassification = material.weightClassification;
                attributeMaterial.weightReturnNumber = material.weightReturnNumber;
                attributeMaterial.weightSourceID = material.weightSourceID;

                attributeMaterial.color = material.color;

                attributeMaterial.clipTask = material.clipTask;
                attributeMaterial.clipMethod = material.clipMethod;
                attributeMaterial.setClipBoxes(material.clipBoxes);
                attributeMaterial.setClipPolygons(material.clipPolygons);

                pointcloud.material = attributeMaterial;
            }

            let gl = this.gl;

            viewer.renderer.setRenderTarget(null);
            viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtAttribute, {
                clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
                //material: this.attributeMaterial,
                blendFunc: [gl.SRC_ALPHA, gl.ONE],
                //depthTest: false,
                depthWrite: false
            });
        }

        for(let [pointcloud, material] of originalMaterials){
            pointcloud.material = material;
        }

        viewer.renderer.setRenderTarget(null);
        if(viewer.background === "skybox"){
            viewer.renderer.setClearColor(0x000000, 0);
            viewer.renderer.clear();
            viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
            viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
            viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;

            viewer.skybox.parent.rotation.x = 0;
            viewer.skybox.parent.updateMatrixWorld();

            viewer.skybox.camera.updateProjectionMatrix();
            viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
        } else if (viewer.background === 'gradient') {
            viewer.renderer.setClearColor(0x000000, 0);
            viewer.renderer.clear();
            viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
        } else if (viewer.background === 'black') {
            viewer.renderer.setClearColor(0x000000, 1);
            viewer.renderer.clear();
        } else if (viewer.background === 'white') {
            viewer.renderer.setClearColor(0xFFFFFF, 1);
            viewer.renderer.clear();
        } else {
            viewer.renderer.setClearColor(0x000000, 0);
            viewer.renderer.clear();
        }

        { // NORMALIZATION PASS
            let normalizationMaterial = this.useEDL ? this.normalizationEDLMaterial : this.normalizationMaterial;

            if(this.useEDL){
                normalizationMaterial.uniforms.edlStrength.value = viewer.edlStrength;
                normalizationMaterial.uniforms.radius.value = viewer.edlRadius;
                normalizationMaterial.uniforms.screenWidth.value = width;
                normalizationMaterial.uniforms.screenHeight.value = height;
                normalizationMaterial.uniforms.uEDLMap.value = this.rtDepth.texture;
            }

            normalizationMaterial.uniforms.uWeightMap.value = this.rtAttribute.texture;
            normalizationMaterial.uniforms.uDepthMap.value = this.rtAttribute.depthTexture;

            Utils.screenPass.render(viewer.renderer, normalizationMaterial);
        }

        viewer.renderer.render(viewer.scene.scene, camera);

        viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer});

        viewer.renderer.clearDepth();

        viewer.transformationTool.update();

        viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

        viewer.renderer.render(viewer.controls.sceneControls, camera);
        viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
        viewer.renderer.render(viewer.transformationTool.scene, camera);

        viewer.renderer.setViewport(width - viewer.navigationCube.width,
            height - viewer.navigationCube.width,
            viewer.navigationCube.width, viewer.navigationCube.width);
        viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);
        viewer.renderer.setViewport(0, 0, width, height);

        viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});

    }
}

export {overrideHQSplatRenderer}