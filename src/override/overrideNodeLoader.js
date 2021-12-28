import * as THREE from "three"
import {NodeLoader} from "Potree"

function overrideNodeLoader() {
    NodeLoader.prototype.load = async function(node){

        if(node.loaded || node.loading){
            return;
        }

        node.loading = true;
        Potree.numNodesLoading++;

        // console.log(node.name, node.numPoints);

        // if(loadedNodes.has(node.name)){
        // 	// debugger;
        // }
        // loadedNodes.add(node.name);

        try{
            if(node.nodeType === 2){
                await this.loadHierarchy(node);
            }

            let {byteOffset, byteSize} = node;


            let urlOctree = `${this.url}/../octree.bin`;

            /**
             * reality start
             *
             * S3 file loading capability
             */
            let queryStringIndex = this.url.indexOf('?');
            if (queryStringIndex > 0) {
                // has query string => is signed URL
                let viewerPathIndex = this.url.indexOf('viewer/');
                let path = this.url.substring(viewerPathIndex, queryStringIndex);
                let binaryPath = '';
                if (path.indexOf('metadata.json') > 0) {
                    binaryPath = path.substring(0, path.lastIndexOf('metadata.json')) + 'octree.bin';
                }

                // generate S3 signed url with path
                urlOctree = window.getDataFromStorage(binaryPath);
            }
            /**
             * reality end
             *
             * S3 end
             */

            let first = byteOffset;
            let last = byteOffset + byteSize - BigInt(1);

            let buffer;

            if(byteSize === BigInt(0)){
                buffer = new ArrayBuffer(0);
                console.warn(`loaded node with 0 bytes: ${node.name}`);
            }else{
                let response = await fetch(urlOctree, {
                    headers: {
                        'content-type': 'multipart/byteranges',
                        'Range': `bytes=${first}-${last}`,
                    },
                });

                buffer = await response.arrayBuffer();
            }

            let workerPath;
            if(this.metadata.encoding === "BROTLI"){
                workerPath = Potree.scriptPath + '/workers/2.0/DecoderWorker_brotli.js';
            }else{
                workerPath = Potree.scriptPath + '/workers/2.0/DecoderWorker.js';
            }

            let worker = Potree.workerPool.getWorker(workerPath);

            worker.onmessage = function (e) {

                let data = e.data;
                let buffers = data.attributeBuffers;

                Potree.workerPool.returnWorker(workerPath, worker);

                let geometry = new THREE.BufferGeometry();

                for(let property in buffers){

                    let buffer = buffers[property].buffer;

                    if(property === "position"){
                        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
                    }else if(property === "rgba"){
                        geometry.setAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
                    }else if(property === "NORMAL"){
                        //geometry.setAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
                        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
                    }else if (property === "INDICES") {
                        let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
                        bufferAttribute.normalized = true;
                        geometry.setAttribute('indices', bufferAttribute);
                    }else{
                        const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);

                        let batchAttribute = buffers[property].attribute;
                        bufferAttribute.potree = {
                            offset: buffers[property].offset,
                            scale: buffers[property].scale,
                            preciseBuffer: buffers[property].preciseBuffer,
                            range: batchAttribute.range,
                        };

                        geometry.setAttribute(property, bufferAttribute);
                    }

                }
                // indices ??

                node.density = data.density;
                node.geometry = geometry;
                node.loaded = true;
                node.loading = false;
                Potree.numNodesLoading--;
            };

            let pointAttributes = node.octreeGeometry.pointAttributes;
            let scale = node.octreeGeometry.scale;

            let box = node.boundingBox;
            let min = node.octreeGeometry.offset.clone().add(box.min);
            let size = box.max.clone().sub(box.min);
            let max = min.clone().add(size);
            let numPoints = node.numPoints;

            let offset = node.octreeGeometry.loader.offset;

            let message = {
                name: node.name,
                buffer: buffer,
                pointAttributes: pointAttributes,
                scale: scale,
                min: min,
                max: max,
                size: size,
                offset: offset,
                numPoints: numPoints
            };

            worker.postMessage(message, [message.buffer]);
        }catch(e){
            node.loaded = false;
            node.loading = false;
            Potree.numNodesLoading--;

            console.log(`failed to load ${node.name}`);
            console.log(e);
            console.log(`trying again!`);
        }
    };

    NodeLoader.prototype.loadHierarchy = async function(node){

        let {hierarchyByteOffset, hierarchyByteSize} = node;
        let hierarchyPath = `${this.url}/../hierarchy.bin`;

        /**
         * reality start
         * S3 file loading capability
         */
        let queryStringIndex = this.url.indexOf('?');
        if (queryStringIndex > 0) {
            // has query string => is signed URL
            let viewerPathIndex = this.url.indexOf('viewer/');
            let path = this.url.substring(viewerPathIndex, queryStringIndex);
            let binaryPath = '';
            if (path.indexOf('metadata.json') > 0) {
                binaryPath = path.substring(0, path.lastIndexOf('metadata.json')) + 'hierarchy.bin';
            }
            // generate S3 signed url with path
            hierarchyPath = window.getDataFromStorage(binaryPath);
        }
        /**
         * reality end
         * S3 end
         */

        let first = hierarchyByteOffset;
        let last = first + hierarchyByteSize - BigInt(1);

        let response = await fetch(hierarchyPath, {
            headers: {
                'content-type': 'multipart/byteranges',
                'Range': `bytes=${first}-${last}`,
            },
        });



        let buffer = await response.arrayBuffer();

        this.parseHierarchy(node, buffer);

        // let promise = new Promise((resolve) => {
        // 	let generator = this.parseHierarchy(node, buffer);

        // 	let repeatUntilDone = () => {
        // 		let result = generator.next();

        // 		if(result.done){
        // 			resolve();
        // 		}else{
        // 			requestAnimationFrame(repeatUntilDone);
        // 		}
        // 	};

        // 	repeatUntilDone();
        // });

        // await promise;





    }
}

export {overrideNodeLoader}