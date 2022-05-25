import * as THREE from "three"
import {BoxVolume, CameraMode, MapView, ProfileWindow, ProfileWindowController, Sidebar, Viewer} from "Potree";
import {VRButton} from "../../potree/libs/three.js/extra/VRButton.js"

function overrideViewer() {
    // override Viewer
    Viewer.prototype.isSupportedWebGLExtension = function (extensionName) {
        const gl = this.renderer.getContext();

        return gl.getExtension(extensionName) !== null;
    };

    Viewer.prototype.possibleEXT_frag_depth = function () {
        return this.isSupportedWebGLExtension('EXT_frag_depth');
    };

    Viewer.prototype.loadGUI = function(callback){

        if(callback){
            this.onGUILoaded(callback);
        }

        let viewer = this;
        let sidebarContainer = $('#potree_sidebar_container');
        sidebarContainer.load(new URL(Potree.scriptPath + '/sidebar.html').href, () => {
            sidebarContainer.css('width', '300px');
            sidebarContainer.css('height', '100%');

            let imgMenuToggle = document.createElement('img');
            imgMenuToggle.src = new URL(Potree.resourcePath + '/icons/menu_button.svg').href;
            imgMenuToggle.onclick = this.toggleSidebar;
            imgMenuToggle.classList.add('potree_menu_toggle');

            let imgMapToggle = document.createElement('img');
            imgMapToggle.src = new URL(Potree.resourcePath + '/icons/map_icon.png').href;
            imgMapToggle.style.display = 'none';
            imgMapToggle.onclick = e => { this.toggleMap(); };
            imgMapToggle.id = 'potree_map_toggle';



            let elButtons = $("#potree_quick_buttons").get(0);

            elButtons.append(imgMenuToggle);
            elButtons.append(imgMapToggle);


            VRButton.createButton(this.renderer).then(vrButton => {

                if(vrButton == null){
                    console.log("VR not supported or active.");

                    return;
                }

                this.renderer.xr.enabled = true;

                let element = vrButton.element;

                element.style.position = "";
                element.style.bottom = "";
                element.style.left = "";
                element.style.margin = "4px";
                element.style.fontSize = "100%";
                element.style.width = "2.5em";
                element.style.height = "2.5em";
                element.style.padding = "0";
                element.style.textShadow = "black 2px 2px 2px";
                element.style.display = "block";

                elButtons.append(element);

                vrButton.onStart(() => {
                    this.dispatchEvent({type: "vr_start"});
                });

                vrButton.onEnd(() => {
                    this.dispatchEvent({type: "vr_end"});
                });
            });

            this.mapView = new MapView(this);
            this.mapView.init();

            /*
            i18n.init({
                lng: 'en',
                resGetPath: Potree.resourcePath + '/lang/__lng__/__ns__.json',
                preload: ['en', 'fr', 'de', 'jp', 'se', 'es'],
                getAsync: true,
                debug: false
            }, function (t) {
                // Start translation once everything is loaded
                $('body').i18n();
            });
            */

            // start reality logic
            i18n.init({
                lng: 'en',
                resGetPath: Reality.resourcePath + '/lang/__lng__/__ns__.json',
                preload: ['en', 'fr', 'de', 'jp', 'se', 'es'],
                getAsync: true,
                debug: false
            }, function (t) {
                // Start translation once everything is loaded
                $('body').i18n();
            });
            // end reality logic

            $(() => {
                //initSidebar(this);
                let sidebar = new Sidebar(this);
                sidebar.init();

                this.sidebar = sidebar;

                //if (callback) {
                //	$(callback);
                //}

                let elProfile = $('<div>').load(new URL(Potree.scriptPath + '/profile.html').href, () => {
                    $(document.body).append(elProfile.children());
                    this.profileWindow = new ProfileWindow(this);
                    this.profileWindowController = new ProfileWindowController(this);

                    $('#profile_window').draggable({
                        handle: $('#profile_titlebar'),
                        containment: $(document.body)
                    });
                    $('#profile_window').resizable({
                        containment: $(document.body),
                        handles: 'n, e, s, w'
                    });

                    $(() => {
                        this.guiLoaded = true;
                        for(let task of this.guiLoadTasks){
                            task();
                        }

                    });
                });



            });


        });

        return this.promiseGuiLoaded();
    };

    Viewer.prototype.update = function (delta, timestamp) {
        if(Potree.measureTimings) performance.mark("update-start");

        this.dispatchEvent({
            type: 'update_start',
            delta: delta,
            timestamp: timestamp});


        const scene = this.scene;
        const camera = scene.getActiveCamera();
        const visiblePointClouds = this.scene.pointclouds.filter(pc => pc.visible)

        Potree.pointLoadLimit = Potree.pointBudget * 2;

        const lTarget = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1000));
        this.scene.directionalLight.position.copy(camera.position);
        this.scene.directionalLight.lookAt(lTarget);


        for (let pointcloud of visiblePointClouds) {
            pointcloud.showBoundingBox = this.showBoundingBox;
            pointcloud.generateDEM = this.generateDEM;
            pointcloud.minimumNodePixelSize = this.minNodeSize;

            // start reality logic
            pointcloud.debugShowNodeName = this.debugShowNodeName;
            // end reality logic

            let material = pointcloud.material;

            material.uniforms.uFilterReturnNumberRange.value = this.filterReturnNumberRange;
            material.uniforms.uFilterNumberOfReturnsRange.value = this.filterNumberOfReturnsRange;
            material.uniforms.uFilterGPSTimeClipRange.value = this.filterGPSTimeRange;
            material.uniforms.uFilterPointSourceIDClipRange.value = this.filterPointSourceIDRange;

            material.classification = this.classifications;
            material.recomputeClassification();

            this.updateMaterialDefaults(pointcloud);
        }

        {
            if(this.showBoundingBox){
                let bbRoot = this.scene.scene.getObjectByName("potree_bounding_box_root");
                if(!bbRoot){
                    let node = new THREE.Object3D();
                    node.name = "potree_bounding_box_root";
                    this.scene.scene.add(node);
                    bbRoot = node;
                }

                let visibleBoxes = [];
                for(let pointcloud of this.scene.pointclouds){
                    for(let node of pointcloud.visibleNodes.filter(vn => vn.boundingBoxNode !== undefined)){
                        let box = node.boundingBoxNode;
                        visibleBoxes.push(box);
                    }
                }

                bbRoot.children = visibleBoxes;
            }
        }

        // start reality logic
        if(this.debugShowNodeName) {
            for(let pointcloud of this.scene.pointclouds){
                if(!pointcloud.debugShowNodeName)
                    continue;

                for(let node of pointcloud.visibleNodes.filter(vn => vn.nameAnnotation !== undefined)){
                    if(!this.scene.annotations.hasChild(node.nameAnnotation))
                        this.scene.annotations.add(node.nameAnnotation);
                }
            }
        }
        //end reality logic

        if (!this.freeze) {
            let result = Potree.updatePointClouds(scene.pointclouds, camera, this.renderer);


            // DEBUG - ONLY DISPLAY NODES THAT INTERSECT MOUSE
            //if(false){

            //	let renderer = viewer.renderer;
            //	let mouse = viewer.inputHandler.mouse;

            //	let nmouse = {
            //		x: (mouse.x / renderer.domElement.clientWidth) * 2 - 1,
            //		y: -(mouse.y / renderer.domElement.clientHeight) * 2 + 1
            //	};

            //	let pickParams = {};

            //	//if(params.pickClipped){
            //	//	pickParams.pickClipped = params.pickClipped;
            //	//}

            //	pickParams.x = mouse.x;
            //	pickParams.y = renderer.domElement.clientHeight - mouse.y;

            //	let raycaster = new THREE.Raycaster();
            //	raycaster.setFromCamera(nmouse, camera);
            //	let ray = raycaster.ray;

            //	for(let pointcloud of scene.pointclouds){
            //		let nodes = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);
            //		pointcloud.visibleNodes = nodes;

            //	}
            //}

            // const tStart = performance.now();
            // const worldPos = new THREE.Vector3();
            // const camPos = viewer.scene.getActiveCamera().getWorldPosition(new THREE.Vector3());
            // let lowestDistance = Infinity;
            // let numNodes = 0;

            // viewer.scene.scene.traverse(node => {
            // 	node.getWorldPosition(worldPos);

            // 	const distance = worldPos.distanceTo(camPos);

            // 	lowestDistance = Math.min(lowestDistance, distance);

            // 	numNodes++;

            // 	if(Number.isNaN(distance)){
            // 		console.error(":(");
            // 	}
            // });
            // const duration = (performance.now() - tStart).toFixed(2);

            // Potree.debug.computeNearDuration = duration;
            // Potree.debug.numNodes = numNodes;

            //console.log(lowestDistance.toString(2), duration);

            const tStart = performance.now();
            const campos = camera.position;
            let closestImage = Infinity;
            for(const images of this.scene.orientedImages){
                for(const image of images.images){
                    const distance = image.mesh.position.distanceTo(campos);

                    closestImage = Math.min(closestImage, distance);
                }
            }
            const tEnd = performance.now();

            if(result.lowestSpacing !== Infinity){
                let near = result.lowestSpacing * 10.0;
                let far = -this.getBoundingBox().applyMatrix4(camera.matrixWorldInverse).min.z;

                far = Math.max(far * 1.5, 10000);
                near = Math.min(100.0, Math.max(0.01, near));
                near = Math.min(near, closestImage);
                far = Math.max(far, near + 10000);

                if(near === Infinity){
                    near = 0.1;
                }

                camera.near = near;
                camera.far = far;
            }else{
                // don't change near and far in this case
            }

            if(this.scene.cameraMode == CameraMode.ORTHOGRAPHIC) {
                camera.near = -camera.far;
            }
        }

        this.scene.cameraP.fov = this.fov;

        let controls = this.getControls();
        if (controls === this.deviceControls) {
            this.controls.setScene(scene);
            this.controls.update(delta);

            this.scene.cameraP.position.copy(scene.view.position);
            this.scene.cameraO.position.copy(scene.view.position);
        } else if (controls !== null) {
            controls.setScene(scene);
            controls.update(delta);

            if(typeof debugDisabled === "undefined" ){
                this.scene.cameraP.position.copy(scene.view.position);
                this.scene.cameraP.rotation.order = "ZXY";
                this.scene.cameraP.rotation.x = Math.PI / 2 + this.scene.view.pitch;
                this.scene.cameraP.rotation.z = this.scene.view.yaw;
            }

            this.scene.cameraO.position.copy(scene.view.position);
            this.scene.cameraO.rotation.order = "ZXY";
            this.scene.cameraO.rotation.x = Math.PI / 2 + this.scene.view.pitch;
            this.scene.cameraO.rotation.z = this.scene.view.yaw;
        }

        camera.updateMatrix();
        camera.updateMatrixWorld();
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        {
            if(this._previousCamera === undefined){
                this._previousCamera = this.scene.getActiveCamera().clone();
                this._previousCamera.rotation.copy(this.scene.getActiveCamera().rotation);
            }

            if(!this._previousCamera.matrixWorld.equals(camera.matrixWorld)){
                this.dispatchEvent({
                    type: "camera_changed",
                    previous: this._previousCamera,
                    camera: camera
                });
            }else if(!this._previousCamera.projectionMatrix.equals(camera.projectionMatrix)){
                this.dispatchEvent({
                    type: "camera_changed",
                    previous: this._previousCamera,
                    camera: camera
                });
            }

            this._previousCamera = this.scene.getActiveCamera().clone();
            this._previousCamera.rotation.copy(this.scene.getActiveCamera().rotation);

        }

        { // update clip boxes
            let boxes = [];

            // volumes with clipping enabled
            //boxes.push(...this.scene.volumes.filter(v => (v.clip)));
            boxes.push(...this.scene.volumes.filter(v => (v.clip && v instanceof BoxVolume)));

            // profile segments
            for(let profile of this.scene.profiles){
                boxes.push(...profile.boxes);
            }

            // Needed for .getInverse(), pre-empt a determinant of 0, see #815 / #816
            let degenerate = (box) => box.matrixWorld.determinant() !== 0;

            let clipBoxes = boxes.filter(degenerate).map( box => {
                box.updateMatrixWorld();

                let boxInverse = box.matrixWorld.clone().invert();
                let boxPosition = box.getWorldPosition(new THREE.Vector3());

                return {box: box, inverse: boxInverse, position: boxPosition};
            });

            let clipPolygons = this.scene.polygonClipVolumes.filter(vol => vol.initialized);

            // set clip volumes in material
            for(let pointcloud of visiblePointClouds){
                pointcloud.material.setClipBoxes(clipBoxes);
                pointcloud.material.setClipPolygons(clipPolygons, this.clippingTool.maxPolygonVertices);
                pointcloud.material.clipTask = this.clipTask;
                pointcloud.material.clipMethod = this.clipMethod;
            }
        }

        {
            for(let pointcloud of visiblePointClouds){
                pointcloud.material.elevationGradientRepeat = this.elevationGradientRepeat;
            }
        }

        { // update navigation cube
            this.navigationCube.update(camera.rotation);
        }

        this.updateAnnotations();

        if(this.mapView){
            this.mapView.update(delta);
            if(this.mapView.sceneProjection){
                $( "#potree_map_toggle" ).css("display", "block");

            }
        }

        TWEEN.update(timestamp);

        this.dispatchEvent({
            type: 'update',
            delta: delta,
            timestamp: timestamp});

        if(Potree.measureTimings) {
            performance.mark("update-end");
            performance.measure("update", "update-start", "update-end");
        }
    }

    Viewer.prototype.renderVR = function(){

        let renderer = this.renderer;

        renderer.setClearColor(0x550000, 0);
        renderer.clear();

        let xr = renderer.xr;
        let dbg = new THREE.PerspectiveCamera();
        let xrCameras = xr.getCamera(dbg);

        if(xrCameras.cameras.length !== 2){
            return;
        }

        let makeCam = this.vrControls.getCamera.bind(this.vrControls);

        { // clear framebuffer
            if(viewer.background === "skybox" || viewer.background === "mars"){
                renderer.setClearColor(0xff0000, 1);
            }else if(viewer.background === "gradient"){
                renderer.setClearColor(0x112233, 1);
            }else if(viewer.background === "black"){
                renderer.setClearColor(0x000000, 1);
            }else if(viewer.background === "white"){
                renderer.setClearColor(0xFFFFFF, 1);
            }else{
                renderer.setClearColor(0x000000, 0);
            }

            renderer.clear();
        }

        // render background
        if(this.background === "skybox" || this.background === "mars"){
            let {skybox} = this;

            let cam = makeCam();
            skybox.camera.rotation.copy(cam.rotation);
            skybox.camera.fov = cam.fov;
            skybox.camera.aspect = cam.aspect;

            // let dbg = new THREE.Object3D();
            let dbg = skybox.parent;
            // dbg.up.set(0, 0, 1);
            dbg.rotation.x = Math.PI / 2;

            // skybox.camera.parent = dbg;
            // dbg.children.push(skybox.camera);

            dbg.updateMatrix();
            dbg.updateMatrixWorld();

            skybox.camera.updateMatrix();
            skybox.camera.updateMatrixWorld();
            skybox.camera.updateProjectionMatrix();

            renderer.render(skybox.scene, skybox.camera);
            // renderer.render(skybox.scene, cam);
        }else if(this.background === "gradient"){
            // renderer.render(this.scene.sceneBG, this.scene.cameraBG);
        }

        this.renderer.xr.getSession().updateRenderState({
            depthNear: 0.1,
            depthFar: 10000
        });

        let cam = null;
        let view = null;

        { // render world scene
            cam = makeCam();
            cam.position.z -= 0.8 * cam.scale.x;
            cam.parent = null;
            // cam.near = 0.05;
            cam.near = viewer.scene.getActiveCamera().near;
            cam.far = viewer.scene.getActiveCamera().far;
            cam.updateMatrix();
            cam.updateMatrixWorld();

            this.scene.scene.updateMatrix();
            this.scene.scene.updateMatrixWorld();
            this.scene.scene.matrixAutoUpdate = false;

            let camWorld = cam.matrixWorld.clone();
            view = camWorld.clone().invert();
            this.scene.scene.matrix.copy(view);
            this.scene.scene.matrixWorld.copy(view);

            cam.matrix.identity();
            cam.matrixWorld.identity();
            cam.matrixWorldInverse.identity();

            renderer.render(this.scene.scene, cam);

            this.scene.scene.matrixWorld.identity();

        }

        for(let pointcloud of this.scene.pointclouds){

            let viewport = xrCameras.cameras[0].viewport;

            pointcloud.material.useEDL = false;
            pointcloud.screenHeight = viewport.height;
            pointcloud.screenWidth = viewport.width;

            // automatically switch to paraboloids because they cause far less flickering in VR,
            // when point sizes are larger than around 2 pixels
            // if(Features.SHADER_INTERPOLATION.isSupported()){
            // 	pointcloud.material.shape = Potree.PointShape.PARABOLOID;
            // }
        }

        // render point clouds
        for(let xrCamera of xrCameras.cameras){

            let v = xrCamera.viewport;
            renderer.setViewport(v.x, v.y, v.width, v.height);

            // xrCamera.fov = 90;

            { // estimate VR fov
                let proj = xrCamera.projectionMatrix;
                let inv = proj.clone().invert();

                let p1 = new THREE.Vector4(0, 1, -1, 1).applyMatrix4(inv);
                let rad = p1.y
                let fov = 180 * (rad / Math.PI);

                xrCamera.fov = fov;
            }

            for(let pointcloud of this.scene.pointclouds){
                const {material} = pointcloud;
                material.useEDL = false;
            }

            let vrWorld = view.clone().invert();
            vrWorld.multiply(xrCamera.matrixWorld);
            let vrView = vrWorld.clone().invert();

            this.pRenderer.render(this.scene.scenePointCloud, xrCamera, null, {
                viewOverride: vrView,
            });

        }

        { // render VR scene
            let cam = makeCam();
            cam.parent = null;

            renderer.render(this.sceneVR, cam);
        }

        renderer.resetState();

    }

    Viewer.prototype.onCrash = function(error){
        window.dispatchEvent(new Event('viewer-crashed'));

        $(this.renderArea).empty();

        if ($(this.renderArea).find('#potree_failpage').length === 0) {
            let elFailPage = $(`
			<div id="#potree_failpage" class="potree_failpage"> 
				
				<h1>Potree Encountered An Error </h1>

				<p>
				This may happen if your browser or graphics card is not supported.
				<br>
				We recommend to use 
				<a href="https://www.google.com/chrome/browser" target="_blank" style="color:initial">Chrome</a>
				or 
				<a href="https://www.mozilla.org/" target="_blank">Firefox</a>.
				</p>

				<p>
				Please also visit <a href="http://webglreport.com/" target="_blank">webglreport.com</a> and 
				check whether your system supports WebGL.
				</p>
				<p>
				If you are already using one of the recommended browsers and WebGL is enabled, 
				consider filing an issue report at <a href="https://github.com/potree/potree/issues" target="_blank">github</a>,<br>
				including your operating system, graphics card, browser and browser version, as well as the 
				error message below.<br>
				Please do not report errors on unsupported browsers.
				</p>

				<pre id="potree_error_console" style="width: 100%; height: 100%"></pre>
				
			</div>`);

            let elErrorMessage = elFailPage.find('#potree_error_console');
            elErrorMessage.html(error.stack);

            $(this.renderArea).append(elFailPage);
        }

        throw error;
    }
}

export {overrideViewer}
