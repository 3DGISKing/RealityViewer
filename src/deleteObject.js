import {PointCloudOctree} from "Potree"
import {Image} from "./Image.js";

function deleteObject(viewer, object) {
    if(object instanceof PointCloudOctree)
        viewer.scene.scenePointCloud.remove(object);
    else if (object instanceof  Image) {
        const images = viewer.scene.images;

        for(let i = 0; i < images.length; i++) {
            if(images[i].uuid === object.uuid){
                images.splice(i, 1);

                viewer.imageTool.scene.remove(object);
                return;
            }
        }
    }
}

export {deleteObject}