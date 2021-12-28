import * as THREE from "three"

import {
    Annotation,
    CameraAnimation,
    Measure,
    PointCloudTree,
    Profile,
    PropertiesPanel,
    Volume
} from "Potree"

function overridePropertiesPanel() {
    PropertiesPanel.prototype.set = function (object) {
        if(this.object === object){
            return;
        }

        this.object = object;

        for(let task of this.cleanupTasks){
            task();
        }
        this.cleanupTasks = [];
        this.container.empty();

        if(object instanceof PointCloudTree){
            this.setPointCloud(object);
        }else if(object instanceof Measure || object instanceof Profile || object instanceof Volume){
            this.setMeasurement(object);
        }else if(object instanceof THREE.Camera){
            this.setCamera(object);
        }else if(object instanceof Annotation){
            this.setAnnotation(object);
        }else if(object instanceof CameraAnimation){
            this.setCameraAnimation(object);
        }
    }
}

export {overridePropertiesPanel}