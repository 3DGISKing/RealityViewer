import {Gradients} from "Potree"
import {saveStringAsTextFile} from "./saveStringAsTextFile.js";

class Exporter{
    static export(viewer, fileName) {
        const version = Reality.version;

        const metaData = {
            version: version.major + '.' + version.minor + version.suffix
        };

        const settingsData = {
            pointBudget: viewer.getPointBudget(),
            fov: viewer.getFOV(),
            EDLEnabled: viewer.getEDLEnabled(),
            EDLRadius: viewer.getEDLRadius(),
            EDLStrength: viewer.getEDLStrength(),
            EDLOpacity: viewer.getEDLOpacity(),
            clipTask: viewer.getClipTask(),
            background: viewer.getBackground(),
            minNodeSize: viewer.getMinNodeSize(),
            showBoundingBoxes: viewer.getShowBoundingBox(),
        };

        const scene = viewer.scene;
        const view = scene.view;

        const viewData = {
            position: {
                x: view.position.x,
                y: view.position.y,
                z: view.position.z
            },
            yaw: view.yaw,
            pitch: view.pitch,
            radius: view.radius
        };

        const pointClouds = scene.pointclouds;

        let pointCloudsData = [];

        pointClouds.forEach(pointCloud => {
            const pointCloudData = {
                name: pointCloud.name,
                url: pointCloud.pcoGeometry.url,
                position: vector3ToObject(pointCloud.position),
                scale: vector3ToObject(pointCloud.scale),
                rotation: vector3ToObject(pointCloud.rotation),
                material: pointCloudMaterialToObject(pointCloud.material)
            };

            pointCloudsData.push(pointCloudData);
        });

        let measurements = scene.measurements;

        const measurementsData = measurementsToObject(measurements);

        const images = scene.images.filter( image => !image.isVideo);

        const imagesData = imagesToObject(images);

        const videos = scene.images.filter( image => image.isVideo);

        const videoData = videosToObject(videos);

        const annotations = scene.annotations.children;

        const annotationsData = annotationsToObject(annotations);

        const boxVolumes = scene.volumes;

        const boxVolumesData = boxVolumesToObject(boxVolumes);

        const data = {
            meta: metaData,
            settings: settingsData,
            view: viewData,
            classification: viewer.classifications,
            pointClouds: pointCloudsData,
            annotations: annotationsData,
            measurements: measurementsData,
            images: imagesData,
            videos: videoData,
            volumes: boxVolumesData,
            cameraAnimations: scene.cameraAnimations.map(cameraAnimationToObject),
            // reality camera animation data
            animationData: scene.cameraP.animationData,
            profiles: scene.profiles.map(profileToObject),
        };

        const output = JSON.stringify(data, null, "\t");

        saveStringAsTextFile(output, fileName);
    }
}

function cameraAnimationToObject(animation){
    const controlPoints = animation.controlPoints.map( cp => {
        const cpdata = {
            position: cp.position.toArray(),
            target: cp.target.toArray(),
        };

        return cpdata;
    });

    const data = {
        uuid: animation.uuid,
        name: animation.name,
        duration: animation.duration,
        t: animation.t,
        curveType: animation.curveType,
        visible: animation.visible,
        controlPoints: controlPoints,
    };

    return data;
}

function boxVolumesToObject(boxVolumes) {
    let boxVolumesData = [];

    for(const boxVolume of boxVolumes) {
        let boxVolumeData = {
            uuid: boxVolume.uuid,
            type: boxVolume.constructor.name,
            name: boxVolume.name,
            position: boxVolume.position.toArray(),
            rotation: boxVolume.rotation.toArray(),
            scale: boxVolume.scale.toArray(),
            clip: boxVolume.clip,
            visible: boxVolume.visible
        };

        if(boxVolume.animationData){
            boxVolumeData.animationData = boxVolume.animationData;
        }

        boxVolumesData.push(boxVolumeData);
    }

    return boxVolumesData;
}

function annotationsToObject(annotations) {
    let annotationsData = [];

    for(const annotation of annotations) {
        let annotationData = {
            position: annotation.position.toArray(),
            description: annotation.description,
        };

        if (typeof annotation.title === 'string') {
            annotationData.titleString = annotation.title;
        }
        else {
            // we assume it is jQuery object

            annotationData.titleOuterHtml = annotation.title[0].outerHTML;

            if(annotation.title.toString)
                annotationData.titleString = annotation.title.toString();
        }

        if(annotation.cameraPosition){
            annotationData.cameraPosition = annotation.cameraPosition.toArray();
        }

        if(annotation.cameraTarget){
            annotationData.cameraTarget = annotation.cameraTarget.toArray();
        }

        annotationsData.push(annotationData);
    }

    return annotationsData;
}

function imagesToObject(images) {
    let imagesData = [];

    for(const image of images){
         const url = image.material.map.image.currentSrc;

         let imageData = {
             url: url,
             transformationEnabled: image.transformationEnabled,
             position: image.position.toArray(),
             scale: image.scale.toArray(),
             rotation: image.rotation.toArray()
         };

         if(image.animationData){
             imageData.animationData = image.animationData;
         }

         imagesData.push(imageData);
    }

    return imagesData;
}

function videosToObject(videos) {
    let videosData = [];

    for(const video of videos){
        let videoData = {
            url: video.url,
            isWebCamera: video.isWebCamera,
            minDistance: video.minDistance,
            maxDistance: video.maxDistance,
            rollOffMode: video.rollOffMode,
            transformationEnabled: video.transformationEnabled,
            position: video.position.toArray(),
            scale: video.scale.toArray(),
            rotation: video.rotation.toArray()
        };

        if(video.animationData){
            videoData.animationData = video.animationData;
        }

        videosData.push(videoData);
    }

    return videosData;
}

function getGradientNameFromGrandient(gradient) {
    for(const potreeGradient in Gradients) {
        console.log(potreeGradient)
    }
}

function measurementsToObject(measurements) {
    let data = [];

    for(const measurement of measurements) {
        // for example, BoxVolume
        if(!measurement.points)
            continue;

        data.push(oneMeasurementToObject(measurement))
    }

    return data;
}

function oneMeasurementToObject(measurement) {
    let coords = measurement.points.map(e => e.position.toArray());

    return {
        uuid: measurement.uuid,
        name: measurement.name,
        showDistances: measurement.showDistances,
        showCoordinates: measurement.showCoordinates,
        showAngles: measurement.showAngles,
        showHeight: measurement.showHeight,
        showArea: measurement.showArea,
        closed: measurement.closed,
        coordinates: coords,
        showCircle: measurement.showCircle,
        showAzimuth: measurement.showAzimuth,
        showEdges: measurement.showEdges,
        color: measurement.color.toArray(),
    }
}

function vector3ToObject(vector3) {
    return {
        x: vector3.x,
        y: vector3.y,
        z: vector3.z
    }
}

function pointCloudMaterialToObject(pointCloudMaterial) {
    return {
        size : pointCloudMaterial.size,
        minSize: pointCloudMaterial.minSize,
        maxSize: pointCloudMaterial.maxSize,
        pointSizeType: pointCloudMaterial.pointSizeType,
        shape: pointCloudMaterial.shape,
        activeAttributeName: pointCloudMaterial.activeAttributeName,
        gradient: pointCloudMaterial.gradient,
        elevationRange: pointCloudMaterial.elevationRange,
        weightRGB: pointCloudMaterial.weightRGB,
        weightElevation: pointCloudMaterial.weightElevation,
        //map
        //color
        //uniforms
        matcap: pointCloudMaterial.matcap,
        heightMin: pointCloudMaterial.heightMin,
        heightMax: pointCloudMaterial.heightMax,
        rgbGamma: pointCloudMaterial.rgbGamma
    }
}

function profileToObject(profile) {
    const data = {
        uuid: profile.uuid,
        name: profile.name,
        points: profile.points.map(p => p.toArray()),
        height: profile.height,
        width: profile.width,
    };

    return data;
}

export {Exporter}