import {exportPointsLAS, getPointsInBoxVolume, maxLevelOfPointCloudOctree } from "./Export.js"

export class ExportDialog{
    constructor(viewer){
        const renderArea = viewer.renderArea;

        const container = document.createElement('div');

        container.id = "export_dialog";

        renderArea.appendChild(container);

        const jQContainer = jQuery(container);


        jQContainer.load(new URL(window.Reality.scriptPath + '/ExportDialog.tpl.html').href, (responseText, textStatus, req) => {
            if(textStatus === 'error') {
                console.error('failed to find template html: ', 'ExportDialog.tpl.html');
                return;
            }

            jQuery("#close_button").click(() => {
                jQContainer.hide();
            });

            jQuery("#export_button").click(() => {
                this.export();
            })
        });

        this._volumeForExport = null;
        this._viewer = viewer;
        this._jQContainer = jQContainer;
    }

    show() {
        const pointClouds = this._viewer.scene.pointclouds;
        const firstPointOctree = pointClouds[0];

        this.setQuality(firstPointOctree);
        this.setName(firstPointOctree.name);

        this._jQContainer.show();
    }

    hide(){
        this._jQContainer.hide();
    }

    setVolume(volume){
        this._volumeForExport = volume;
    }

    export() {
        if(this._volumeForExport === null){
            alert("any volume is not selected!");
            return;
        }

        const name = jQuery("#export_name").val();

        if(name === ""){
            alert("please input name!");
            return;
        }

        const format = jQuery("#export_formats").find(":selected").text();

        if(format === "LAZ"){
            alert("laz export will be done on the server!");
            return;
        }

        const level = parseInt(jQuery("#export_quality").find(":selected").text());

        this.doExport(this._volumeForExport, name, format, level);
    }

    doExport(volume, name, format, level){
        console.assert(format === "LAS");

        const points = getPointsInBoxVolume(this._viewer, this._volumeForExport, level);

        if(points.numPoints === 0){
            alert("any point does not exist in the given volume!");
            return;
        }

        //exportPointsLAS(points, name);
        Reality.exportPointsLAS(points, name);
    }

    /**
     * @param {PointCloudOctree } pointCloudOctree
     */
    setQuality(pointCloudOctree){
        const maxLevel = maxLevelOfPointCloudOctree(pointCloudOctree);

        const jqExportQuality = jQuery("#export_quality");

        jqExportQuality.empty();

        for( let i = 0 ; i <= maxLevel; i ++){
            jqExportQuality.append(`<option value="${i}"> 
                                       ${i} 
                                  </option>`);
        }
    }

    setName(name) {
        jQuery("#export_name").val(name);
    }
}