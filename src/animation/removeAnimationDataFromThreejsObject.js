// revert object 's position, rotation, scale to the first key frame and remove animation data.

import {ThreeJsObjectKeyingSet} from "./ThreeJsObjectKeyingSet.js";

function removeAnimationDataFromThreejsObject(threejsObject) {
    const animationData = threejsObject.animationData;
    const layers = animationData.layers;

    const getLayer = (layers, layerName)=>{
        return layers.filter( layer => layer.name === layerName)[0];
    };

    const positionXLayer = getLayer(layers, ThreeJsObjectKeyingSet.PositionX);
    const positionYLayer = getLayer(layers, ThreeJsObjectKeyingSet.PositionY);
    const positionZLayer = getLayer(layers, ThreeJsObjectKeyingSet.PositionZ);

    const rotationXLayer = getLayer(layers, ThreeJsObjectKeyingSet.RotationX);
    const rotationYLayer = getLayer(layers, ThreeJsObjectKeyingSet.RotationY);
    const rotationZLayer = getLayer(layers, ThreeJsObjectKeyingSet.RotationZ);

    const scaleXLayer = getLayer(layers, ThreeJsObjectKeyingSet.ScaleX);
    const scaleYLayer = getLayer(layers, ThreeJsObjectKeyingSet.ScaleY);
    const scaleZLayer = getLayer(layers, ThreeJsObjectKeyingSet.ScaleZ);


    threejsObject.position.x = positionXLayer.values[0].value;
    threejsObject.position.y = positionYLayer.values[0].value;
    threejsObject.position.z = positionZLayer.values[0].value;

    threejsObject.rotation.x = rotationXLayer.values[0].value;
    threejsObject.rotation.y = rotationYLayer.values[0].value;
    threejsObject.rotation.z = rotationZLayer.values[0].value;

    threejsObject.scale.x = scaleXLayer.values[0].value;
    threejsObject.scale.y = scaleYLayer.values[0].value;
    threejsObject.scale.z = scaleZLayer.values[0].value;

    threejsObject.animationData = {
        layers: []
    };
}

export {removeAnimationDataFromThreejsObject}