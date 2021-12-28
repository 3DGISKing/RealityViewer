import * as THREE from "three"
import {Annotation} from "Potree"
import {PointCloudOctreeNode} from "Potree"

function overridePointCloudOctreeNode() {
    let scratchCenter = new THREE.Vector3();

    PointCloudOctreeNode.prototype.update = function () {
        // update nameAnnotation

        const pointCloud = this.pointcloud;

        if(pointCloud.debugShowNodeName && !this.nameAnnotation){
            const geometryNode = this.geometryNode;

            const boundingBox = geometryNode.boundingBox;

            const centroid = boundingBox.getCenter(scratchCenter);

            centroid.applyMatrix4( pointCloud.matrixWorld );

            this.nameAnnotation = new Annotation({
                position:[centroid.x, centroid.y, centroid.z],
                title: this.name,
            });

            this.nameAnnotation.forDebug = true;
        }

        if(this.nameAnnotation)
            this.nameAnnotation.visible = pointCloud.debugShowNodeName;
    }
}

export {overridePointCloudOctreeNode}