import * as THREE from "three"
import {Points} from "Potree";
import {LASExporter} from "Potree"

/**
 * @param viewer
 * @param boxVolume
 * @param fileName
 * @returns {boolean}
 */
function exportLAS(viewer, boxVolume, fileName) {
    const points = getPointsInBoxVolume(viewer, boxVolume);

    if(points.numPoints === 0){
        return false;
    }

    const buffer = LASExporter.toLAS(points);

    const blob = new Blob([buffer], {type: "application/octet-binary"});

    downloadBlob(blob, fileName + ".las");

    return true;
}

/**
 * @param {Points} points
 * @param {string} fileName
 */
function exportPointsLAS(points, fileName) {
    console.assert(points.numPoints > 0);

    const buffer = LASExporter.toLAS(points);

    const blob = new Blob([buffer], {type: "application/octet-binary"});

    downloadBlob(blob, fileName + ".las");
}

function getPointsInBoxVolume(viewer, boxVolume, qualityLevel) {
    const boxVolumeBoundingBox = boxVolume.boundingBox.clone().applyMatrix4(boxVolume.matrixWorld);

    const pointClouds = viewer.scene.pointclouds;

    let totalPoints = new Points();

    for(const pointCloudOctree of pointClouds){
        const pointCloudOctreeBoundingBox = pointCloudOctree.boundingBox.clone().applyMatrix4(pointCloudOctree.matrixWorld);

        if (!pointCloudOctreeBoundingBox.intersectsBox(boxVolumeBoundingBox))
            continue;

        // PointCloudOctreeGeometryNode array
        const nodes = getIntersectedNodes(pointCloudOctree, boxVolumeBoundingBox);

        nodes.forEach(node =>{
            if(node.geometry === null) {
                return;
            }

            if(node.level > qualityLevel){
                return;
            }

            const points = getPoints(pointCloudOctree, node, boxVolumeBoundingBox);

            totalPoints.add(points);
        });
    }

    return totalPoints;
}

function downloadBlob(blob, fileName) {
    const url = window.URL.createObjectURL(blob);

    let a = document.createElement('a');

    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);

    a.style = 'display: none';

    a.click();

    a.remove();

    setTimeout(function() {
        return window.URL.revokeObjectURL(url);
    }, 1000);
}


/**
 * @param {PointCloudOctree} pointCloudOctree
 * @param {PointCloudOctreeGeometryNode} node child of pointCloudOctree
 * @param {Box3} boundingBox this will be defined in world space.
 */

function getPoints(pointCloudOctree, node, boundingBox) {
    const view = new Float32Array(node.geometry.attributes.position.array);
    const numPoints = node.numPoints;

    let pos = new THREE.Vector3();

    let nodeMatrix = new THREE.Matrix4().makeTranslation(...node.boundingBox.min.toArray());

    let matrix = new THREE.Matrix4().multiplyMatrices(pointCloudOctree.matrixWorld, nodeMatrix);

    let accepted = new Uint32Array(numPoints);
    let acceptedPositions = new Float32Array(numPoints * 3);
    let numAccepted = 0;

    let points = new Points();

    for (let i = 0; i < numPoints; i++) {
        pos.set(
            view[i * 3],
            view[i * 3 + 1],
            view[i * 3 + 2]);

        pos.applyMatrix4(matrix);

        if(!boundingBox.containsPoint(pos))
            continue;

        points.boundingBox.expandByPoint(pos);

        pos.sub(pointCloudOctree.position);

        accepted[numAccepted] = i;

        acceptedPositions[3 * numAccepted] = pos.x;
        acceptedPositions[3 * numAccepted + 1] = pos.y;
        acceptedPositions[3 * numAccepted + 2] = pos.z;

        numAccepted++;
    }

    accepted = accepted.subarray(0, numAccepted);
    acceptedPositions = acceptedPositions.subarray(0, numAccepted * 3);

    //store position data
    points.data.position = acceptedPositions;

    let geometry = node.geometry;

    let relevantAttributes = Object.keys(geometry.attributes).filter(a => !["position", "indices"].includes(a));

    for(let attributeName of relevantAttributes){
        let attribute = geometry.attributes[attributeName];
        let numElements = attribute.array.length / numPoints;

        if(numElements !== parseInt(numElements)){
            throw Error('should not be reached!');
        }

        let Type = attribute.array.constructor;

        let filteredBuffer = new Type(numElements * accepted.length);

        let source = attribute.array;

        for(let i = 0; i < accepted.length; i++){

            let index = accepted[i];

            let start = index * numElements;
            let end = start + numElements;
            let sub = source.subarray(start, end);

            filteredBuffer.set(sub, i * numElements);
        }

        points.data[attributeName] = filteredBuffer;
    }

    points.numPoints = accepted.length;

    return points;
}


/**
 * @param {PointCloudOctree} pointCloudOctree
 * @param {Box3} boundingBox
 */
function getIntersectedNodes(pointCloudOctree, boundingBox) {
    let stack = [];
    let ret = [];

    const root = pointCloudOctree.pcoGeometry.root;

    stack.push(root);

    for (let i = 0; i < 8; i++) {
        let child = root.children[i];

        if (child && intersects(pointCloudOctree, child, boundingBox)) {
            stack.push(child);
        }
    }

    while (stack.length > 0) {
        let node = stack.pop();

        ret.push(node);

        for (let i = 0; i < 8; i++) {
            let child = node.children[i];

            if (child && intersects(pointCloudOctree, child, boundingBox)) {
                stack.push(child);
            }
        }
    }

    return ret;
}

/**
 * @param {PointCloudOctree} pointCloudOctree
 * @param {PointCloudOctreeGeometryNode} node child of pointCloudOctree
 * @param {Box3} boundingBox this will be defined in world space.
 */
function intersects(pointCloudOctree, node, boundingBox) {
    const bbWorld = node.boundingBox.clone().applyMatrix4(pointCloudOctree.matrixWorld);

    return bbWorld.intersectsBox(boundingBox);
}

/**
 * @param pointCloudOctree
 * @return number
 */
function maxLevelOfPointCloudOctree(pointCloudOctree){
    if(pointCloudOctree.maxLevel)
        return pointCloudOctree.maxLevel;

    const nodes = pointCloudOctree.pcoGeometry.nodes;

    let maxLevel = 0;

    for(const nodeName in nodes){
        // @type { PointCloudOctreeGeometryNode }
        const node = nodes[nodeName];
        const level = node.level;

        if(level > maxLevel)
            maxLevel = level;
    }

    //
    let stack = [];

    const root = pointCloudOctree.pcoGeometry.root;

    for (let i = 0; i < 8; i++) {
        let child = root.children[i];

        if(child)
            stack.push(child);
    }

    while (stack.length > 0) {
        let node = stack.pop();

        if(node.level > maxLevel){
            maxLevel = node.level;
        }

        for (let i = 0; i < 8; i++) {
            let child = node.children[i];

            if(child)
                stack.push(child);
        }
    }

    return maxLevel;
}

export {
    exportLAS,
    exportPointsLAS,
    getPointsInBoxVolume,
    maxLevelOfPointCloudOctree
}