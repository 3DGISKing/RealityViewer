import * as THREE from "three"
import {Utils} from "Potree";
import {EventDispatcher} from "Potree";
import {Image} from "./Image.js"

export class ImageTool extends EventDispatcher {
    constructor(viewer) {
        super();

        this.viewer = viewer;
        this.renderer = viewer.renderer;

        this.addEventListener('start_inserting_image', e => {
            this.viewer.dispatchEvent({
                type: 'cancel_insertions'
            });
        });

        this.scene = new THREE.Scene();
        this.scene.name = 'scene_image';

        this.viewer.inputHandler.registerInteractiveScene(this.scene);

        this.onRemove = e => {
            this.scene.remove(e.image);
        };

        this.onAdd = e => {
            this.scene.add(e.image);
        };

        for (let image of viewer.scene.images) {
            this.onAdd({image: image});
        }

        this.viewer.inputHandler.addEventListener('delete', e => {
            let images = e.selection.filter(e => (e instanceof Image));
            images.forEach(e => this.viewer.scene.removeImage(e));
        });

        viewer.addEventListener("update", this.update.bind(this));
        viewer.addEventListener("render.pass.scene", e => this.render(e));
        viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

        viewer.scene.addEventListener('image_added', this.onAdd);
        viewer.scene.addEventListener('image_removed', this.onRemove);
    }

    onSceneChange(e) {
        if (e.oldScene) {
            e.oldScene.removeEventListeners('image_added', this.onAdd);
            e.oldScene.removeEventListeners('image_removed', this.onRemove);
        }

        e.scene.addEventListener('image_added', this.onAdd);
        e.scene.addEventListener('image_removed', this.onRemove);
    }

    startInsertion(args = {}) {
        let image = new Image(args.texture);

        image.name = args.name || 'Image';

        this.dispatchEvent({
            type: 'start_inserting_image',
            image: image
        });

        this.viewer.scene.addImage(image);
        this.scene.add(image);

        let cancel = {
            callback: null
        };

        let drag = e => {
            let camera = this.viewer.scene.getActiveCamera();

            let I = Utils.getMousePointCloudIntersection(
                e.drag.end,
                this.viewer.scene.getActiveCamera(),
                this.viewer,
                this.viewer.scene.pointclouds,
                {pickClipped: false});

            if (I) {
                let wp = image.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
                let w = Math.abs((wp.z / 5));

                const boundingBox = image.boundingBox;
                const zLength = boundingBox.max.z - boundingBox.min.z;

                I.location.z += zLength * w / 2;

                image.position.copy(I.location);

                image.scale.set(w, w, w);
            }
        };

        let drop = e => {
            image.removeEventListener('drag', drag);
            image.removeEventListener('drop', drop);

            cancel.callback();
        };

        cancel.callback = e => {
            image.removeEventListener('drag', drag);
            image.removeEventListener('drop', drop);
            this.viewer.removeEventListener('cancel_insertions', cancel.callback);
        };

        image.addEventListener('drag', drag);
        image.addEventListener('drop', drop);
        this.viewer.addEventListener('cancel_insertions', cancel.callback);

        this.viewer.inputHandler.startDragging(image);

        return image;
    }

    update() {
        if (!this.viewer.scene) {
            return;
        }

        let camera = this.viewer.scene.getActiveCamera();
        let renderAreaSize = this.viewer.renderer.getSize(new THREE.Vector2());
        let clientWidth = renderAreaSize.width;
        let clientHeight = renderAreaSize.height;

        let images = this.viewer.scene.images;

        for (let image of images) {
            if (image.isVideo) {
                const video = image;

                if (video.isPlaying())
                    video.update(this.viewer);
            }
        }
    }

    render(params) {
        const renderer = this.viewer.renderer;

        const oldTarget = renderer.getRenderTarget();

        if (params.renderTarget) {
            renderer.setRenderTarget(params.renderTarget);
        }

        renderer.render(this.scene, this.viewer.scene.getActiveCamera());
        renderer.setRenderTarget(oldTarget);
    }
}