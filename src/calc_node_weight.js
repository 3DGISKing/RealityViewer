import * as THREE from "three"

function calculateNodeWeightBasedOnScreenRadius(renderer, camera, camObjPos, pointcloud, child) {
    let sphere = child.getBoundingSphere();
    let center = sphere.center;

    let dx = camObjPos.x - center.x;
    let dy = camObjPos.y - center.y;
    let dz = camObjPos.z - center.z;

    let dd = dx * dx + dy * dy + dz * dz;
    let distance = Math.sqrt(dd);

    let radius = sphere.radius;

    const domHeight = renderer.domElement.clientHeight;

    let fov = (camera.fov * Math.PI) / 180;
    let slope = Math.tan(fov / 2);
    let projFactor = (0.5 * domHeight) / (slope * distance);

    let screenPixelRadius = radius * projFactor;

    if(screenPixelRadius < pointcloud.minimumNodePixelSize){
        return 0;
    }

    let weight = screenPixelRadius;

    if(distance - radius < 0){
        weight = Number.MAX_VALUE;
    }

    if(child.name === 'r654') {
        //console.log("r654 weight ", weight);
    }

    if(child.name === 'r652') {
        //console.log("r652 weight ", weight);
    }

    return weight;
}

function calculateNodeWeightBasedOnDistanceFromScreenCenter(renderer, camera, camObjPos, pointcloud, child) {
    let sphere = child.getBoundingSphere();
    let center = sphere.center.clone();

    center.applyMatrix4( pointcloud.matrixWorld );

    const screenPos = center.project(camera);

    let renderAreaSize = renderer.getSize(new THREE.Vector2());

    screenPos.x = renderAreaSize.x * (screenPos.x + 1) / 2;
    screenPos.y = renderAreaSize.y * (1 - (screenPos.y + 1) / 2);

    const distance = getDistanceFromScreenCenter(screenPos.x , screenPos.y, renderAreaSize.x, renderAreaSize.y);

    let weight =  1  / distance;

    if(child.name === 'r654') {
        //console.log("r654 weight ", weight);
        //console.log(screenPos);
    }

    if(child.name === 'r652') {
        //console.log("r652 weight ", weight);
    }

    return weight;
}

function getDistanceFromScreenCenter(x, y, screenWidth, screenHeight) {
    const screenCenterX = screenWidth / 2.0;
    const screenCenterY = screenHeight / 2.0;

    const dx = screenCenterX - x;
    const dy = screenCenterY - y;

    let distance = dx * dx + dy * dy;

    distance = Math.sqrt(distance);

    return distance;
}

// 0 ~ 1
function getNormalizedRadiusBasedWeight(screenWidth, screenHeight, weight) {
    let diagonal = screenWidth * screenWidth + screenHeight * screenHeight;

    diagonal = Math.sqrt(diagonal);

    const maxWeight = diagonal;

    if(weight > maxWeight)
        weight = maxWeight;

    return weight / maxWeight;
}

// 0 ~ 1
function getNormalizedDistanceFromScreenCenterBasedWeight(screenWidth, screenHeight, weight) {
    const minimumNodePixelSize = 30;

    const maxWeight = 1 / minimumNodePixelSize;

    if(weight > maxWeight)
        weight = maxWeight;

    return weight / maxWeight;
}

function calcCombinedWeight(areaBasedWeight, distanceBasedWeight, renderer) {
    const factor = 0.9;

    let renderAreaSize = renderer.getSize(new THREE.Vector2());

    const normalizedRadiusBasedWeight = getNormalizedRadiusBasedWeight(renderAreaSize.x, renderAreaSize.y, areaBasedWeight);
    const normalizedDistanceBasedWeight = getNormalizedDistanceFromScreenCenterBasedWeight(renderAreaSize.x, renderAreaSize.y, distanceBasedWeight);

    return  normalizedRadiusBasedWeight * factor + normalizedDistanceBasedWeight * (1 - factor);
}

export {
    calculateNodeWeightBasedOnScreenRadius,
    calculateNodeWeightBasedOnDistanceFromScreenCenter,
    calcCombinedWeight
}