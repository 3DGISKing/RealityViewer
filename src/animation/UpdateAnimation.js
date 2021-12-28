import {ThreeJsObjectKeyingSet} from "./ThreeJsObjectKeyingSet";

function updatePositionKeyframe(object, keyframeIndex, position) {
    const animationData = object.animationData;
    const layers = animationData.layers;

    if(layers.length === 0) {
        return;
    }

    const positionXLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionX)[0];
    const positionYLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionY)[0];
    const positionZLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionZ)[0];

    positionXLayer.values[keyframeIndex].value = position.x;
    positionYLayer.values[keyframeIndex].value = position.y;
    positionZLayer.values[keyframeIndex].value = position.z;

    object.dispatchEvent({
        type: 'position_keyframe_changed',
        keyframeIndex: keyframeIndex,
        position: position,
    });
}

function updateRotationKeyframe(object, keyframeIndex, rotation) {
    const animationData = object.animationData;
    const layers = animationData.layers;

    if(layers.length === 0) {
        return;
    }

    const rotationXLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.RotationX)[0];
    const rotationYLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.RotationY)[0];
    const rotationZLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.RotationZ)[0];

    rotationXLayer.values[keyframeIndex].value = rotation.x;
    rotationYLayer.values[keyframeIndex].value = rotation.y;
    rotationZLayer.values[keyframeIndex].value = rotation.z;

    object.dispatchEvent({
        type: 'rotation_keyframe_changed',
        keyframeIndex: keyframeIndex,
        rotation: rotation,
    });
}

export {updatePositionKeyframe, updateRotationKeyframe};