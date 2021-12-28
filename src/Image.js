import * as THREE from "three"

const Vector3 = THREE.Vector3;

/**
 * @example
 let image = new Potree.Image(
 new THREE.TextureLoader().load(`${Potree.resourcePath}/icons/eye_2.png`)
 );

 image.scale.set(87.70990081104037, 65.01472874807978, 95.53770288101325);
 image.position.set(589688.5173246722, 231341.79786558595, 792.7726157084892);
 image.rotation.set(0, 0, 0.6338484063020134);

 image.name = "My Image";
 viewer.scene.addImage(image);
 */

export class Image extends THREE.Object3D {
    constructor(texture) {
        super();

        this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
        this.name = 'image_' + this.constructor.counter;

        this.scaleYEnabled = false;
        this.isVideo = false;

        // event listeners
        this.addEventListener('select', e => {
        });
        this.addEventListener('deselect', e => {
        });

        let geometry = new THREE.Geometry();

        const xHalfLength = 0.5;
        const yHalfLength = 0.01;
        const zHalfLength = 0.5;

        geometry.vertices.push(
            new Vector3(-xHalfLength, 0, zHalfLength),
            new Vector3(xHalfLength, 0, zHalfLength),
            new Vector3(xHalfLength, 0, -zHalfLength),
            new Vector3(-xHalfLength, 0, -zHalfLength)
        );

        geometry.faces.push(new THREE.Face3(0, 1, 2));
        geometry.faces.push(new THREE.Face3(0, 2, 3));

        geometry.faceVertexUvs[0].push([
            new THREE.Vector2(0, 1),
            new THREE.Vector2(1, 1),
            new THREE.Vector2(1, 0)
        ]);

        geometry.faceVertexUvs[0].push([
            new THREE.Vector2(0, 1),
            new THREE.Vector2(1, 0),
            new THREE.Vector2(0, 0)
        ]);

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: texture,
            side: THREE.DoubleSide,
        });

        this.material = material;

        const mesh = new THREE.Mesh(geometry, material);

        mesh.geometry.computeBoundingBox();

        this.add(mesh);

        this.mesh = mesh;

        let boxFrameGeometry = new THREE.Geometry();

        boxFrameGeometry.vertices.push(
            // bottom
            new Vector3(-xHalfLength, -yHalfLength, zHalfLength),
            new Vector3(xHalfLength, -yHalfLength, zHalfLength),
            new Vector3(xHalfLength, -yHalfLength, zHalfLength),
            new Vector3(xHalfLength, -yHalfLength, -zHalfLength),
            new Vector3(xHalfLength, -yHalfLength, -zHalfLength),
            new Vector3(-xHalfLength, -yHalfLength, -zHalfLength),
            new Vector3(-xHalfLength, -yHalfLength, -zHalfLength),
            new Vector3(-xHalfLength, -yHalfLength, zHalfLength),
            // top
            new Vector3(-xHalfLength, yHalfLength, zHalfLength),
            new Vector3(xHalfLength, yHalfLength, zHalfLength),
            new Vector3(xHalfLength, yHalfLength, zHalfLength),
            new Vector3(xHalfLength, yHalfLength, -zHalfLength),
            new Vector3(xHalfLength, yHalfLength, -zHalfLength),
            new Vector3(-xHalfLength, yHalfLength, -zHalfLength),
            new Vector3(-xHalfLength, yHalfLength, -zHalfLength),
            new Vector3(-xHalfLength, yHalfLength, zHalfLength),
            // sides
            new Vector3(-xHalfLength, -yHalfLength, zHalfLength),
            new Vector3(-xHalfLength, yHalfLength, zHalfLength),
            new Vector3(xHalfLength, -yHalfLength, zHalfLength),
            new Vector3(xHalfLength, yHalfLength, zHalfLength),
            new Vector3(xHalfLength, -yHalfLength, -zHalfLength),
            new Vector3(xHalfLength, yHalfLength, -zHalfLength),
            new Vector3(-xHalfLength, -yHalfLength, -zHalfLength),
            new Vector3(-xHalfLength, yHalfLength, -zHalfLength),
        );

        this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
        this.frame.visible = false;

        this.add(this.frame);

        this._visible = true;

        boxFrameGeometry.computeBoundingBox();
        this.boundingBox = boxFrameGeometry.boundingBox;

        this.boxFrameGeometry = boxFrameGeometry;

        this.update();
    }

    get visible() {
        return this._visible;
    }

    set visible(value) {
        if (this._visible !== value) {
            this._visible = value;

            this.dispatchEvent({type: "visibility_changed", object: this});
        }
    }

    update() {
        this.boundingBox = this.boxFrameGeometry.boundingBox;
        this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());
    }

    raycast(raycaster, intersects) {
        let is = [];
        this.mesh.raycast(raycaster, is);

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