function debugShowProjectPlaneForBoxVolume(scene, volume) {
    const planeMesh = getPlaneMeshFromBoxVolume(volume);

    scene.scene.add(planeMesh);

    const origin = getOrigin(volume);

    scene.scene.add(origin);

    const normal = getNormal(volume);

    scene.scene.add(normal);
}

/**
 * get plane whose normal will be identical to boxVolume's z axis
 */
function getPlaneMeshFromBoxVolume(boxVolume) {
    const geometry = new THREE.PlaneGeometry(1, 1, 32);
    const material = new THREE.MeshNormalMaterial({
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });

    const plane = new THREE.Mesh(geometry, material);

    plane.position.copy(boxVolume.position);
    plane.scale.copy(boxVolume.scale);
    plane.rotation.copy(boxVolume.rotation);

    return plane
}

function getOrigin(boxVolume) {
    const sphereGeometry = new THREE.SphereGeometry(4, 10, 10);

    let sphereMaterial = new THREE.MeshLambertMaterial({
            color: 0xff0000,
            depthTest: false,
            depthWrite: false
        }
    );

    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

    const position = new THREE.Vector3(-0.5, -0.5, 0);

    boxVolume.updateMatrixWorld();

    const matrixWorld = boxVolume.matrixWorld;

    position.applyMatrix4(matrixWorld);

    sphereMesh.position.copy(position);

    return sphereMesh;
}

function getNormal(boxVolume) {
    boxVolume.updateMatrixWorld();

    const matrixWorld = boxVolume.matrixWorld;

    const normalStartPos = new THREE.Vector3(0, 0, 0);
    const normalEndPos = new THREE.Vector3(0, 0, 0.5 * 10);

    normalStartPos.applyMatrix4(matrixWorld);
    normalEndPos.applyMatrix4(matrixWorld);

    let path = normalStartPos.toArray().concat(normalEndPos.toArray());

    let lineGeometry = new THREE.LineGeometry();

    lineGeometry.setPositions(path);

    let lineMaterial = new THREE.LineMaterial({
        color: 0x00ff00,
        dashSize: 5,
        gapSize: 2,
        linewidth: 2,
        resolution: new THREE.Vector2(1000, 1000),
    });

    const line = new THREE.Line2(lineGeometry, lineMaterial);

    return line;
}

export {debugShowProjectPlaneForBoxVolume}