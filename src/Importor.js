import * as THREE from "three"
import {loadPointCloud} from "Potree"
import {Annotation} from "Potree";
import {BoxVolume} from "Potree"
import {Image} from "./Image";
import {Video} from "./Video";
import {CameraAnimation} from "Potree"

class Importor {
    static async import(viewer, url) {
        let response = await fetch(url);
        let data = await response.json();

        console.log(data);

        const settings = data.settings;

        viewer.setPointBudget(settings.pointBudget);
        viewer.setFOV(settings.fov);
        viewer.setEDLEnabled(settings.EDLEnabled);
        viewer.setEDLRadius(settings.EDLRadius);
        viewer.setEDLStrength(settings.EDLStrength);
        viewer.setEDLOpacity(settings.EDLOpacity);
        viewer.setClipTask(settings.clipTask);
        viewer.setBackground(settings.background);
        viewer.setMinNodeSize(settings.minNodeSize);
        viewer.setShowBoundingBox(settings.showBoundingBoxes);

        if(data.classification){
            viewer.setClassifications(data.classification);
        }

        const viewData = data.view;

        const view = viewer.scene.view;

        view.position.set(viewData.position.x, viewData.position.y, viewData.position.z);
        view.radius = viewData.radius;
        view.yaw = viewData.yaw;
        view.pitch = viewData.pitch;

        const pointCloudsData = data.pointClouds;

        let scene = viewer.scene;

        pointCloudsData.forEach(pointCloudData => {
            loadPointCloud(pointCloudData.url, pointCloudData.name, e=>{
                let pointCloud = e.pointcloud;

                pointCloud.position.set(pointCloudData.position.x, pointCloudData.position.y, pointCloudData.position.z);
                pointCloud.scale.set(pointCloudData.scale.x, pointCloudData.scale.y, pointCloudData.scale.z);
                pointCloud.rotation.set(pointCloudData.rotation.x, pointCloudData.rotation.y, pointCloudData.rotation.z);

                let material = pointCloud.material;

                material.size = pointCloudData.material.size;
                material.minSize = pointCloudData.material.minSize;
                material.pointSizeType = pointCloudData.material.pointSizeType;
                material.shape = pointCloudData.material.shape;
                material.activeAttributeName = pointCloudData.material.activeAttributeName;
               // material.gradient = pointCloudData.material.gradient;
                material.elevationRange = pointCloudData.material.elevationRange;
                material.weightRGB = pointCloudData.material.weightRGB;
                material.weightElevation = pointCloudData.material.weightElevation;
                material.matcap = pointCloudData.material.matcap;
                material.heightMin = pointCloudData.material.heightMin;
                material.heightMax = pointCloudData.material.heightMax;
                material.rgbGamma = pointCloudData.material.rgbGamma;

                scene.addPointCloud(pointCloud);
            });
        } );

        const annotationsData = data.annotations;

        for(const annotationData of annotationsData) {
            let options = {
                position: annotationData.position,
                description: annotationData.description
            };

            if(annotationData.titleOuterHtml) {
                let jQTitle = $(annotationData.titleOuterHtml);

                if(annotationData.titleString) {
                    jQTitle.toString = () => annotationData.titleString;
                 }

                options.title = jQTitle;
            }
            else {
                options.title = annotationData.titleString;
            }

            if(annotationData.cameraPosition){
                options.cameraPosition = annotationData.cameraPosition;
            }

            if(annotationData.cameraTarget){
                options.cameraTarget = annotationData.cameraTarget;
            }

            scene.annotations.add(new Annotation(options));
        }

        const measurementsData = data.measurements;

        measurementsData.forEach(measurementData =>{
            let measure = new Potree.Measure();

            measure.uuid = measurementData.uuid;
            measure.name = measurementData.name;
            measure.showDistances = measurementData.showDistances;
            measure.showCoordinates = measurementData.showCoordinates;
            measure.showAngles = measurementData.showAngles;
            measure.showHeight = measurementData.showHeight;
            measure.showArea = measurementData.showArea;
            measure.closed = measurementData.closed;
            measure.showCircle = measurementData.showCircle;
            measure.showAzimuth = measurementData.showAzimuth;
            measure.showEdges = measurementData.showEdges;

            measurementData.coordinates.forEach(coordinate => {
                measure.addMarker(new THREE.Vector3(coordinate[0], coordinate[1], coordinate[2]));
            });

            scene.addMeasurement(measure);
        });

        const imagesData = data.images;

        for(const imageData of imagesData) {
            const texture = new THREE.TextureLoader().load(imageData.url);

            let image = new Image(texture);

            image.transformationEnabled = imageData.transformationEnabled;

            image.scale.fromArray(imageData.scale);
            image.position.fromArray(imageData.position);
            image.rotation.fromArray(imageData.rotation);

            if(imageData.animationData){
                image.animationData = imageData.animationData;
            }

            scene.addImage(image);
        }

        const videosData = data.videos;

        for(const videoData of videosData) {
            let video = new Video({
                webCamera: true,
                videoUrl: videoData.url,
                rolloffMode: videoData.rolloffMode,
                minDistance: videoData.minDistance,
                maxDistance: videoData.maxDistance
            });

            video.transformationEnabled = videoData.transformationEnabled;

            video.scale.fromArray(videoData.scale);
            video.position.fromArray(videoData.position);
            video.rotation.fromArray(videoData.rotation);

            if(videoData.animationData){
                video.animationData = videoData.animationData;
            }

            scene.addImage(video);
        }

        const volumesData = data.volumes;

        for(const volumeData of volumesData){
            let volume  = new BoxVolume();

            volume.uuid = volumeData.uuid;
            volume.name = volumeData.name;
            volume.scale.fromArray(volumeData.scale);
            volume.position.fromArray(volumeData.position);
            volume.position.set(...volumeData.rotation);
            volume.clip = volumeData.clip;
            volume.visible = volumeData.visible;

            if(volumeData.animationData){
                volume.animationData = volumeData.animationData;
            }

            scene.addVolume(volume);
        }

        for(const animationData of data.cameraAnimations){
            const duplicate = viewer.scene.cameraAnimations.find(a => a.uuid === animationData.uuid);
            if(duplicate){
                return;
            }

            const animation = new CameraAnimation(viewer);

            animation.uuid = animationData.uuid;
            animation.name = animationData.name;
            animation.duration = animationData.duration;
            animation.t = animationData.t;
            animation.curveType = animationData.curveType;
            animation.visible = animationData.visible;
            animation.controlPoints = [];

            for(const cpdata of animationData.controlPoints){
                const cp = animation.createControlPoint();

                cp.position.set(...cpdata.position);
                cp.target.set(...cpdata.target);
            }

            viewer.scene.addCameraAnimation(animation);
        }

        for(const profileData of data.profiles){
            const {name, points} = profileData;

            const duplicate = viewer.scene.profiles.find(profile => profile.uuid === data.uuid);

            if(duplicate){
                return;
            }

            let profile = new Potree.Profile();
            profile.name = name;
            profile.uuid = data.uuid;

            profile.setWidth(data.width);

            for(const point of points){
                profile.addMarker(new THREE.Vector3(...point));
            }

            viewer.scene.addProfile(profile);
        }

        viewer.scene.cameraP.animationData = data.animationData;
    }
}

export {Importor}

