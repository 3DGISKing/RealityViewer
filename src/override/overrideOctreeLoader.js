import * as THREE from "three"
import {
    NodeLoader,
    OctreeGeometry,
    OctreeGeometryNode,
    OctreeLoader, } from "Potree"

function overrideOctreeLoader() {
    OctreeLoader.load = async function(url){

        let rawUrl;

        /**
         * reality start
         * S3 file loading capability
         */
        let queryStringIndex = url.indexOf('?');

        if (queryStringIndex > 0) {
            // has query string => is signed URL

            /**
             * @example
             https://realitycloudstaging.s3.eu-central-1.amazonaws.com/viewer/austria_wien_brotfabrik/Labor/metadata.json
             ?X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQMPQKHJDEXAFNLI6%2F20210505%2Feu-central-1%2Fs3%2Faws4_request
             &X-Amz-Date=20210505T014318Z&X-Amz-SignedHeaders=host&X-Amz-Expires=60&X-Amz-Signature=1447902b06da5883d1ec8228fd302214121e92b8cc371e53d8e5244e48aa225a
             */

            rawUrl = url.substring(0, queryStringIndex);
       }
        /**
         * reality end
         * S3 end
         */

        let response;

        if(rawUrl)
            response = await fetch(rawUrl);
        else
            response = await fetch(url);

        let metadata = await response.json();

        let attributes = OctreeLoader.parseAttributes(metadata.attributes);

        let loader = new NodeLoader(url);
        loader.metadata = metadata;
        loader.attributes = attributes;
        loader.scale = metadata.scale;
        loader.offset = metadata.offset;

        let octree = new OctreeGeometry();
        octree.url = url;
        octree.spacing = metadata.spacing;
        octree.scale = metadata.scale;

        // let aPosition = metadata.attributes.find(a => a.name === "position");
        // octree

        let min = new THREE.Vector3(...metadata.boundingBox.min);
        let max = new THREE.Vector3(...metadata.boundingBox.max);
        let boundingBox = new THREE.Box3(min, max);

        let offset = min.clone();
        boundingBox.min.sub(offset);
        boundingBox.max.sub(offset);

        octree.projection = metadata.projection;
        octree.boundingBox = boundingBox;
        octree.tightBoundingBox = boundingBox.clone();
        octree.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
        octree.tightBoundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
        octree.offset = offset;
        octree.pointAttributes = OctreeLoader.parseAttributes(metadata.attributes);
        octree.loader = loader;

        let root = new OctreeGeometryNode("r", octree, boundingBox);
        root.level = 0;
        root.nodeType = 2;
        root.hierarchyByteOffset = BigInt(0);
        root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);
        root.hasChildren = false;
        root.spacing = octree.spacing;
        root.byteOffset = 0;

        octree.root = root;

        loader.load(root);

        let result = {
            geometry: octree,
        };

        return result;

    }
}

export {overrideOctreeLoader}