import * as THREE from "three"
import {CameraMode} from "Potree";
import {Sidebar} from "Potree";

import {RealityFirstPersonControls} from "../navigation/RealityFirstPersonControls.js";
import {RealityThirdPersonControls} from "../navigation/RealityThirdPersonControls.js";

function overridePotreeForRealityNavigation(viewer) {
    viewer.realityFirstPersonControls = new RealityFirstPersonControls(viewer);
    viewer.realityFirstPersonControls.enabled = false;
    viewer.realityFirstPersonControls.addEventListener('start', viewer.disableAnnotations.bind(viewer));
    viewer.realityFirstPersonControls.addEventListener('end', viewer.enableAnnotations.bind(viewer));

    viewer.realityThirdPersonControls = new RealityThirdPersonControls(viewer);
    viewer.realityThirdPersonControls.enabled = false;
    viewer.realityThirdPersonControls.addEventListener('start', viewer.disableAnnotations.bind(viewer));
    viewer.realityThirdPersonControls.addEventListener('end', viewer.enableAnnotations.bind(viewer));

    Sidebar.prototype.initNavigation = function () {
        let elNavigation = $('#navigation');
        let sldMoveSpeed = $('#sldMoveSpeed');
        let lblMoveSpeed = $('#lblMoveSpeed');

        elNavigation.append(this.createToolIcon(
            Reality.resourcePath + '/icons/first_person.png',
            '[title]tt.first_person_control',
            () => {
                this.viewer.setControls(this.viewer.realityFirstPersonControls);
            }
        ));

        elNavigation.append(this.createToolIcon(
            Reality.resourcePath + '/icons/third_person.png',
            '[title]tt.third_person_control',
            () => {
                this.viewer.setControls(this.viewer.realityThirdPersonControls);
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + '/icons/earth_controls_1.png',
            '[title]tt.earth_control',
            () => {
                this.viewer.setControls(this.viewer.earthControls);
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + '/icons/fps_controls.svg',
            '[title]tt.flight_control',
            () => {
                this.viewer.setControls(this.viewer.fpControls);
                this.viewer.fpControls.lockElevation = false;
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + '/icons/helicopter_controls.svg',
            '[title]tt.heli_control',
            () => {
                this.viewer.setControls(this.viewer.fpControls);
                this.viewer.fpControls.lockElevation = true;
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + '/icons/orbit_controls.svg',
            '[title]tt.orbit_control',
            () => {
                this.viewer.setControls(this.viewer.orbitControls);
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + '/icons/focus.svg',
            '[title]tt.focus_control',
            () => {
                this.viewer.fitToScreen();
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + "/icons/navigation_cube.svg",
            "[title]tt.navigation_cube_control",
            () => {
                this.viewer.toggleNavigationCube()
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + "/images/compas.svg",
            "[title]tt.compass",
            () => {
                const visible = !this.viewer.compass.isVisible();
                this.viewer.compass.setVisible(visible);
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + "/icons/camera_animation.svg",
            "[title]tt.camera_animation",
            () => {
                const animation = CameraAnimation.defaultFromView(this.viewer);

                viewer.scene.addCameraAnimation(animation);
            }
        ));


        elNavigation.append("<br>");


        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + "/icons/left.svg",
            "[title]tt.left_view_control",
            () => {
                this.viewer.setLeftView()
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + "/icons/right.svg",
            "[title]tt.right_view_control",
            () => {
                this.viewer.setRightView()
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + "/icons/front.svg",
            "[title]tt.front_view_control",
            () => {
                this.viewer.setFrontView()
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + "/icons/back.svg",
            "[title]tt.back_view_control",
            () => {
                this.viewer.setBackView()
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + "/icons/top.svg",
            "[title]tt.top_view_control",
            () => {
                this.viewer.setTopView()
            }
        ));

        elNavigation.append(this.createToolIcon(
            Potree.resourcePath + "/icons/bottom.svg",
            "[title]tt.bottom_view_control",
            () => {
                this.viewer.setBottomView()
            }
        ));


        let elCameraProjection = $(`
			<selectgroup id="camera_projection_options">
				<option id="camera_projection_options_perspective" value="PERSPECTIVE">Perspective</option>
				<option id="camera_projection_options_orthigraphic" value="ORTHOGRAPHIC">Orthographic</option>
			</selectgroup>
		`);
        elNavigation.append(elCameraProjection);
        elCameraProjection.selectgroup({title: "Camera Projection"});
        elCameraProjection.find("input").click((e) => {
            this.viewer.setCameraMode(CameraMode[e.target.value]);
        });
        let cameraMode = Object.keys(CameraMode)
            .filter(key => CameraMode[key] === this.viewer.scene.cameraMode);
        elCameraProjection.find(`input[value=${cameraMode}]`).trigger("click");

        let speedRange = new THREE.Vector2(1, 10 * 1000);

        let toLinearSpeed = (value) => {
            return Math.pow(value, 4) * speedRange.y + speedRange.x;
        };

        let toExpSpeed = (value) => {
            return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
        };

        sldMoveSpeed.slider({
            value: toExpSpeed(this.viewer.getMoveSpeed()),
            min: 0,
            max: 1,
            step: 0.01,
            slide: (event, ui) => {
                this.viewer.setMoveSpeed(toLinearSpeed(ui.value));
            }
        });

        this.viewer.addEventListener('move_speed_changed', (event) => {
            lblMoveSpeed.html(this.viewer.getMoveSpeed().toFixed(1));
            sldMoveSpeed.slider({value: toExpSpeed(this.viewer.getMoveSpeed())});
        });

        lblMoveSpeed.html(this.viewer.getMoveSpeed().toFixed(1));
    }
}

export {overridePotreeForRealityNavigation}