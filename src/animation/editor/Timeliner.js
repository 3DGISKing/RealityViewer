import {Easing} from './utils/util_tween.js'
import {UndoManager, UndoState} from './utils/util_undo.js'
import {Dispatcher} from './utils/util_dispatcher.js'
import {Theme} from './theme.js'
import {LayoutParameters} from './Settings.js';
import {utils} from './utils/utils.js'
import {LayerCabinet} from './views/LayerCabinet.js'
import {TimelinePanel, MARKER_TRACK_HEIGHT} from './views/TimelinePanel.js'
import {IconButton} from './ui/IconButton.js'
import {VerticalScrollbar} from './ui/VerticalScrollbar.js'
import {DataStore} from './utils/util_datastore.js'
import {DockingWindow} from './utils/docking_window.js'
import {UINumber} from "./ui/UiNumber.js";

import {ThreeJsObjectKeyingSet} from "../ThreeJsObjectKeyingSet.js"
import {AnimationPath} from "../AnimationPath.js";
import {removeAnimationDataFromThreejsObject} from "../removeAnimationDataFromThreejsObject.js";

const style = utils.style;
const Z_INDEX = 999;

function LayerProp(name, label) {
    this.name = name;
    this.label = label;
    this.values = [];

    this._value = 0;

    this._color = randomCssColorString();
    /*
    this.max
    this.min
    this.step
    */
}

const headerStyles = {
    position: 'absolute',
    top: '0px',
    width: '100%',
    height: '22px',
    lineHeight: '22px',
    overflow: 'hidden'
};

const buttonStyles = {
    width: '20px',
    height: '20px',
    padding: '2px',
    marginRight: '2px'
};

let target;
let rootPanel;
let ghostPanel;
let centralPanel;
let verticalScrollbar;

/**
 * @param {Potree.Viewer} potreeViewer
 * @constructor
 */
function Timeliner(potreeViewer) {
    this._mute = false;

    // Dispatcher for coordination
    const dispatcher = new Dispatcher();

    // Data
    const dataStore = new DataStore();
    const layerStore = dataStore.get('layers');
    let layers = layerStore.value;

    window._data = dataStore; // expose it for debugging

    // Undo manager
    const undoManager = new UndoManager(dispatcher);

    // Views
    const timelinePanel = new TimelinePanel(dataStore, dispatcher);
    const layerPanel = new LayerCabinet(dataStore, dispatcher);

    setTimeout(function () {
        // hack!
        undoManager.save(new UndoState(dataStore, 'Loaded'), true);
    });

    dispatcher.on('keyframe.move', function (layer, value) {
        undoManager.save(new UndoState(dataStore, 'Move Keyframe'));
    });

    // dispatcher.fire('value.change', layer, me.value);
    dispatcher.on('value.change', function (layer, value, dont_save) {
        if (layer._mute) return;

        var t = dataStore.get('ui:currentTime').value;
        var v = utils.findTimeinLayer(layer, t);

        // console.log(v, 'value.change', layer, value, utils.format_friendly_seconds(t), typeof(v));
        if (typeof (v) === 'number') {
            layer.values.splice(v, 0, {
                time: t,
                value: value,
                _color: '#' + (Math.random() * 0xffffff | 0).toString(16)
            });
            if (!dont_save) undoManager.save(new UndoState(dataStore, 'Add value'));
        } else {
            v.object.value = value;
            if (!dont_save) undoManager.save(new UndoState(dataStore, 'Update value'));
        }

        repaintAll();
    });

    dispatcher.on('action:solo', function (layer, solo) {
        layer._solo = solo;

        console.log(layer, solo);

        // When a track is solo-ed, playback only changes values
        // of that layer.
    });

    dispatcher.on('action:mute', function (layer, mute) {
        layer._mute = mute;

        // When a track is mute, playback does not play
        // frames of those muted layers.

        // also feels like hidden feature in photoshop

        // when values are updated, eg. from slider,
        // no tweens will be created.
        // we can decide also to "lock in" layers
        // no changes to tween will be made etc.
    });

    dispatcher.on('ease', function (layer, ease_type) {
        var t = dataStore.get('ui:currentTime').value;
        var v = utils.timeAtLayer(layer, t);
        // console.log('Ease Change > ', layer, value, v);
        if (v && v.entry) {
            v.entry.tween = ease_type;
        }

        undoManager.save(new UndoState(dataStore, 'Add Ease'));

        repaintAll();
    });

    var startPlay = null, played_from = 0; // requires some more tweaking

    dispatcher.on('controls.toggle_play', function () {
        if (startPlay) {
            pausePlaying();
        } else {
            startPlaying();
        }
    });

    dispatcher.on('controls.restart_play', function () {
        if (!startPlay) {
            startPlaying();
        }

        setCurrentTime(played_from);
    });

    dispatcher.on('controls.play', startPlaying);
    dispatcher.on('controls.pause', pausePlaying);

    const self = this;

    function startPlaying() {
        // played_from = timeline.current_frame;
        startPlay = performance.now() - dataStore.get('ui:currentTime').value * 1000;
        layerPanel.setControlStatus(true);
        self._playButton.setIcon('pause');
        self._playButton.setTip('Pause');
        // dispatcher.fire('controls.status', true);
    }

    function pausePlaying() {
        startPlay = null;
        layerPanel.setControlStatus(false);
        self._playButton.setIcon('play');
        self._playButton.setTip('Play');
        // dispatcher.fire('controls.status', false);
    }

    dispatcher.on('controls.stop', () => {
        this._stopPlay();
    });

    dispatcher.on('controls.addKeyframe', () => {
        this._onAddKeyframe();
    });

    dispatcher.on('removeAllFrames', () => {
        this._onRemoveAllFrames();
    });

    const currentTimeStore = dataStore.get('ui:currentTime');

    dispatcher.on('time.update', setCurrentTime);

    dispatcher.on('totalTime.update', function (value) {
        // context.totalTime = value;
        // controller.setDuration(value);
        // timeline.repaint();
    });

    /* update scroll viewport */
    dispatcher.on('update.scrollTime', function (v) {
        v = Math.max(0, v);
        dataStore.get('ui:scrollTime').value = v;
        repaintAll();
    });

    function setCurrentTime(value) {
        value = Math.max(0, value);
        currentTimeStore.value = value;

        if (startPlay)
            startPlay = performance.now() - value * 1000;

        repaintAll();
        // layer_panel.repaint(s);
    }

    dispatcher.on('target.notify', (name, value) => {
        if (this._mute)
            return;

        if (target)
            target[name] = value;

        if (!this._threeJsObject)
            return;

        if (this._threeJsObject.type === "PerspectiveCamera") {
            if (target[ThreeJsObjectKeyingSet.PositionX])
                potreeViewer.scene.view.position.x = target[ThreeJsObjectKeyingSet.PositionX];

            if (target[ThreeJsObjectKeyingSet.PositionY])
                potreeViewer.scene.view.position.y = target[ThreeJsObjectKeyingSet.PositionY];

            if (target[ThreeJsObjectKeyingSet.PositionZ])
                potreeViewer.scene.view.position.z = target[ThreeJsObjectKeyingSet.PositionZ];

            if (target[ThreeJsObjectKeyingSet.RotationX])
                potreeViewer.scene.view.pitch = target[ThreeJsObjectKeyingSet.RotationX] - Math.PI / 2;

            if (target[ThreeJsObjectKeyingSet.RotationZ])
                potreeViewer.scene.view.yaw = target[ThreeJsObjectKeyingSet.RotationZ];

        } else {
            if (target[ThreeJsObjectKeyingSet.PositionX])
                this._threeJsObject.position.x = target[ThreeJsObjectKeyingSet.PositionX];

            if (target[ThreeJsObjectKeyingSet.PositionY])
                this._threeJsObject.position.y = target[ThreeJsObjectKeyingSet.PositionY];

            if (target[ThreeJsObjectKeyingSet.PositionZ])
                this._threeJsObject.position.z = target[ThreeJsObjectKeyingSet.PositionZ];

            if (target[ThreeJsObjectKeyingSet.RotationX])
                this._threeJsObject.rotation.x = target[ThreeJsObjectKeyingSet.RotationX];

            if (target[ThreeJsObjectKeyingSet.RotationY])
                this._threeJsObject.rotation.y = target[ThreeJsObjectKeyingSet.RotationY];

            if (target[ThreeJsObjectKeyingSet.RotationZ])
                this._threeJsObject.rotation.z = target[ThreeJsObjectKeyingSet.RotationZ];

            if (target[ThreeJsObjectKeyingSet.ScaleX])
                this._threeJsObject.scale.x = target[ThreeJsObjectKeyingSet.ScaleX];

            if (target[ThreeJsObjectKeyingSet.ScaleY])
                this._threeJsObject.scale.y = target[ThreeJsObjectKeyingSet.ScaleY];

            if (target[ThreeJsObjectKeyingSet.ScaleZ])
                this._threeJsObject.scale.z = target[ThreeJsObjectKeyingSet.ScaleZ];
        }
    });

    dispatcher.on('update.scale', function (v) {
        console.log('range', v);
        dataStore.get('ui:timeScale').value = v;

        timelinePanel.repaint();
    });

    // handle undo / redo
    dispatcher.on('controls.undo', function () {
        const history = undoManager.undo();

        dataStore.setJSONString(history.state);

        updateState();
    });

    dispatcher.on('controls.redo', function () {
        const history = undoManager.redo();

        dataStore.setJSONString(history.state);

        updateState();
    });

    /*
        Paint Routines
    */

    function paint() {
        requestAnimationFrame(paint);

        if (startPlay) {
            var t = (performance.now() - startPlay) / 1000;
            setCurrentTime(t);

            if (t > dataStore.get('ui:totalTime').value) {
                // simple loop
                startPlay = performance.now();
            }
        }

        if (needsResize) {
            centralPanel.style.width = LayoutParameters.width + 'px';
            centralPanel.style.height = LayoutParameters.height + 'px';

            restyle(layerPanel.dom, timelinePanel.dom);

            timelinePanel.resize();
            repaintAll();
            needsResize = false;

            dispatcher.fire('resize');
        }

        timelinePanel._paint();
    }

    paint();

    /*
        End Paint Routines
    */

    function updateState() {
        layers = layerStore.value; // FIXME: support Arrays
        layerPanel.setState(layerStore);
        timelinePanel.setState(layerStore);

        repaintAll();
    }

    function repaintAll() {
        const content_height = layers.length * LayoutParameters.LINE_HEIGHT;

        verticalScrollbar.setLength(LayoutParameters.TIMELINE_SCROLL_HEIGHT / content_height);

        self._repaintTimes();
        layerPanel.repaint();
        timelinePanel.repaint();
    }

    this._createDom = () => {
        rootPanel = document.createElement('div');

        rootPanel.id = "animation-editor-root-panel";

        style(rootPanel, {
            position: 'fixed',
            top: '20px',
            left: '20px',
            margin: 0,
            border: '1px solid ' + Theme.a,
            padding: 0,
            overflow: 'hidden',
            backgroundColor: Theme.a,
            color: Theme.d,
            zIndex: Z_INDEX,
            fontFamily: 'monospace',
            fontSize: '12px'
        });

        centralPanel = document.createElement('div');

        centralPanel.id = "animation-editor-central-panel";

        style(centralPanel, {
            textAlign: 'left',
            lineHeight: '1em',
            position: 'absolute',
            top: '44px'
        });

        let titlePanel = this._createTitlePanel();
        let statusPanel = this._createStatusPanel();
        let toolbarPanel = this._createToolbar();

        rootPanel.appendChild(centralPanel);
        rootPanel.appendChild(statusPanel);
        rootPanel.appendChild(titlePanel);
        rootPanel.appendChild(toolbarPanel);

        ghostPanel = document.createElement('div');

        ghostPanel.id = 'ghost-panel';

        style(ghostPanel, {
            background: '#999',
            opacity: 0.2,
            position: 'fixed',
            margin: 0,
            padding: 0,
            zIndex: (Z_INDEX - 1),
            // transition: 'all 0.25s ease-in-out',
            transitionProperty: 'top, left, width, height, opacity',
            transitionDuration: '0.25s',
            transitionTimingFunction: 'ease-in-out'
        });

        // Handle DOM Views

        // Shadow Root
        let root = document.createElement('timeliner');

        document.body.appendChild(root);

        window.r = root;

        root.appendChild(rootPanel);
        root.appendChild(ghostPanel);

        centralPanel.appendChild(layerPanel.dom);
        centralPanel.appendChild(timelinePanel.dom);

        verticalScrollbar = new VerticalScrollbar(200, 10);

        centralPanel.appendChild(verticalScrollbar.dom);

        // percentages
        verticalScrollbar.onScroll.do(function (type, scrollTo) {
            switch (type) {
                case 'scrollto':
                    layerPanel.scrollTo(scrollTo);
                    timelinePanel.scrollTo(scrollTo);
                    break;
                //		case 'pageup':
                // 			scrollTop -= pageOffset;
                // 			me.draw();
                // 			me.updateScrollbar();
                // 			break;
                // 		case 'pagedown':
                // 			scrollTop += pageOffset;
                // 			me.draw();
                // 			me.updateScrollbar();
                // 			break;
            }
        });

        /* Integrate pane into docking window */
        const widget = new DockingWindow(rootPanel, ghostPanel);

        widget.allowMove(false);
        widget.resizes.do(resize);

        titlePanel.addEventListener('mouseover', function () {
            widget.allowMove(true);
        });

        titlePanel.addEventListener('mouseout', function () {
            widget.allowMove(false);
        });
    };

    this._createTitlePanel = () => {
        let titlePanel = document.createElement('div');

        titlePanel.id = "title-panel";

        style(titlePanel, headerStyles, {
            borderBottom: '1px solid ' + Theme.b,
            textAlign: 'center'
        });

        let titlebar = document.createElement('span');

        titlePanel.appendChild(titlebar);

        titlebar.innerHTML = 'Animation Editor';
        titlePanel.appendChild(titlebar);

        let topRightBar = document.createElement('div');

        topRightBar.id = "animation-editor-top-right-bar";

        style(topRightBar, headerStyles, {
            textAlign: 'right'
        });

        titlePanel.appendChild(topRightBar);

        const closeButton = new IconButton(10, 'remove', 'Close', dispatcher);

        closeButton.onClick(function (e) {
            e.preventDefault();
            rootPanel.style.display = 'none';
        });

        // resize minimize

        const resizeSmall = new IconButton(10, 'resize_small', 'minimize', dispatcher);

        //topRightBar.appendChild(resizeSmall.dom);

        // resize full
        const resizeFull = new IconButton(10, 'resize_full', 'maximize', dispatcher);

        style(resizeFull.dom, buttonStyles, {marginRight: '2px'});

        topRightBar.appendChild(closeButton.dom);
        //topRightBar.appendChild(resizeFull.dom);


        return titlePanel;
    };

    this._createStatusPanel = () => {
        let statusPanel = document.createElement('div');

        statusPanel.id = "status-panel";

        const footerStyles = {
            position: 'absolute',
            width: '100%',
            height: LayoutParameters.STATUS_BAR_HEIGHT + '22',
            lineHeight: '22px',
            bottom: '0',
            background: Theme.a,
            fontSize: '11px'
        };

        style(statusPanel, footerStyles, {
            borderTop: '1px solid ' + Theme.b,
            float: 'left'
        });

        const labelStatus = document.createElement('span');

        labelStatus.textContent = 'ready!';
        labelStatus.style.marginLeft = '10px';

        this.setStatus = function (text) {
            labelStatus.textContent = text;
        };

        style(labelStatus, {
            zIndex: 1000
        });

        dispatcher.on('status', this.setStatus);

        const bottomRight = document.createElement('div');

        bottomRight.id = "animation-editor-bottom-right";

        style(bottomRight, footerStyles, {});

        statusPanel.appendChild(bottomRight);

        bottomRight.appendChild(labelStatus);

        let addKeyframeButton = new IconButton(12, 'plus', 'Add Keyframe', dispatcher);

        style(addKeyframeButton.dom, {
            float: 'right'
        });

        addKeyframeButton.onClick(function (e) {
            dispatcher.fire('controls.addKeyframe');
        });

        const zoomIn = new IconButton(12, 'zoom_in', 'zoom in', dispatcher);
        const zoomOut = new IconButton(12, 'zoom_out', 'zoom out', dispatcher);
        const settings = new IconButton(12, 'cog', 'settings', dispatcher);
        const removeAllFrames = new IconButton(12, 'trash', 'Remove All Frames', dispatcher);

        style(removeAllFrames.dom, {
            float: 'right'
        });

        removeAllFrames.onClick(function (e) {
            dispatcher.fire('removeAllFrames');
        });

        let range = document.createElement('input');

        range.type = "range";
        range.value = 0;
        range.min = -1;
        range.max = +1;
        range.step = 0.125;

        style(range, {
            width: '90px',
            margin: '0px',
            marginLeft: '2px',
            marginRight: '2px',
            float: 'right'
        });

        let draggingRange = 0;

        range.addEventListener('mousedown', function () {
            draggingRange = 1;
        });

        function changeRange() {
            dispatcher.fire('update.scale', 6 * Math.pow(100, -range.value));
        }

        range.addEventListener('mouseup', function () {
            draggingRange = 0;
            changeRange();
        });

        range.addEventListener('mousemove', function () {
            if (!draggingRange) return;
            changeRange();
        });

        bottomRight.appendChild(range);
        bottomRight.appendChild(removeAllFrames.dom);
        bottomRight.appendChild(addKeyframeButton.dom);
        // bottomRight.appendChild(zoomIn.dom);
        // bottomRight.appendChild(zoomOut.dom);
        // bottomRight.appendChild(settings.dom);

        return statusPanel;
    };

    this._createToolbar = () => {
        let toolbarPanel = document.createElement('div');

        toolbarPanel.id = "animation-editor-toolbar";

        style(toolbarPanel, headerStyles, {
            top: '22px',
            borderBottom: '1px solid ' + Theme.b,
            textAlign: 'center'
        });

        let timeOptions = {
            min: 0,
            step: 0.125
        };

        this._repaintTimes = () => {
            const time = currentTimeStore.value;
            currentTime.setValue(time);
            totalTime.setValue(totalTimeStore.value);
            currentTime.paint();
            totalTime.paint();
        };

        let currentTime = new UINumber(timeOptions);
        let totalTime = new UINumber(timeOptions);

        style(currentTime.dom, {
            marginTop: '3px',
            float: 'right'
        });

        style(totalTime.dom, {
            marginTop: '3px',
            marginLeft: '3px',
            marginRight: '3px',
            float: 'right'
        });

        let currentTimeStore = dataStore.get('ui:currentTime');
        let totalTimeStore = dataStore.get('ui:totalTime');

        currentTime.onChange.do((value, done) => {
            dispatcher.fire('time.update', value);
            this._repaintTimes();
        });

        totalTime.onChange.do((value, done) => {
            totalTimeStore.value = value;
            this._repaintTimes();
        });

        let jumpToFirstButton = new IconButton(12, 'jumpToFirst', 'Jump to first frame in frame range.', dispatcher);

        jumpToFirstButton.onClick(function (e) {
            e.preventDefault();
            setCurrentTime(0);
        });

        let jumpToPrevious = new IconButton(12, 'jumpToPrevious', 'Jump to previous keyframe.', dispatcher);

        jumpToPrevious.onClick((e) => {
            e.preventDefault();
            setCurrentTime(this._previousKeyframeTime());
        });

        let playButton = new IconButton(12, 'play', 'Play Animation.', dispatcher);

        playButton.onClick(function (e) {
            e.preventDefault();
            dispatcher.fire('controls.toggle_play');
        });

        this._playButton = playButton;

        let stopButton = new IconButton(12, 'stop', 'Stop', dispatcher);

        stopButton.onClick(function (e) {
            dispatcher.fire('controls.stop');
        });

        let jumpToFrame = new IconButton(12, 'jumpToNext', 'Jump to next keyframe.', dispatcher);
        let jumpToEndButton = new IconButton(12, 'jumpToEnd', 'Jump to last frame in frame range.', dispatcher);

        jumpToFrame.onClick((e) => {
            e.preventDefault();
            setCurrentTime(this._nextKeyframeTime());
        });

        jumpToEndButton.onClick(function (e) {
            e.preventDefault();
            setCurrentTime(dataStore.get('ui:totalTime').value);
        });

        let op_button_styles = {
            width: '32px',
            padding: '3px 4px 3px 4px'
        };

        let undo_button = new IconButton(16, 'undo', 'undo', dispatcher);

        style(undo_button.dom, op_button_styles);

        undo_button.onClick(function () {
            dispatcher.fire('controls.undo');
        });

        let redo_button = new IconButton(16, 'repeat', 'redo', dispatcher);
        style(redo_button.dom, op_button_styles);
        redo_button.onClick(function () {
            dispatcher.fire('controls.redo');
        });

        toolbarPanel.appendChild(jumpToFirstButton.dom);
        toolbarPanel.appendChild(jumpToPrevious.dom);
        toolbarPanel.appendChild(playButton.dom);
        toolbarPanel.appendChild(stopButton.dom);
        toolbarPanel.appendChild(jumpToFrame.dom);
        toolbarPanel.appendChild(jumpToEndButton.dom);

        toolbarPanel.appendChild(totalTime.dom);
        toolbarPanel.appendChild(currentTime.dom);

        this._repaintTimes();

        return toolbarPanel;
    };

    this._createDom();

    // document.addEventListener('keypress', function(e) {
    // 	console.log('kp', e);
    // });
    // document.addEventListener('keyup', function(e) {
    // 	if (undo) console.log('UNDO');

    // 	console.log('kd', e);
    // });

    // TODO: Keyboard Shortcuts
    // Esc - Stop and review to last played from / to the start?
    // Space - play / pause from current position
    // Enter - play all
    // k - keyframe

    document.addEventListener('keydown', function (e) {
        const activeElement = document.activeElement;

        const play = e.keyCode == 32; // space
        const enter = e.keyCode == 13; //
        const undo = e.metaKey && e.keyCode == 91 && !e.shiftKey;

        if (activeElement.nodeName.match(/(INPUT|BUTTON|SELECT|TIMELINER)/)) {
            return;
        }

        if (play) {
            dispatcher.fire('controls.toggle_play');
        } else if (enter) {
            // FIXME: Return should play from the start or last played from?
            dispatcher.fire('controls.restart_play');
            // dispatcher.fire('controls.undo');
        } else if (e.keyCode == 27) {
            // Esc = stop. FIXME: should rewind head to last played from or Last pointed from?
            dispatcher.fire('controls.pause');
        } else{
            // do nothing
        }
    });

    var needsResize = true;

    function resize(width, height) {
        // data.get('ui:bounds').value = {
        // 	width: width,
        // 	height: height
        // };
        // TODO: remove ugly hardcodes
        width -= 4;
        height -= 44;

        LayoutParameters.width = width - LayoutParameters.LEFT_PANE_WIDTH;
        LayoutParameters.height = height;

        LayoutParameters.TIMELINE_SCROLL_HEIGHT = height - LayoutParameters.MARKER_TRACK_HEIGHT;
        const scrollable_height = LayoutParameters.TIMELINE_SCROLL_HEIGHT;

        verticalScrollbar.setHeight(scrollable_height - 2);

        style(verticalScrollbar.dom, {
            top: MARKER_TRACK_HEIGHT + 'px',
            left: (width - 16) + 'px',
        });

        needsResize = true;
    }

    function restyle(left, right) {
        left.style.cssText = 'position: absolute; left: 0px; top: 0px; height: ' + LayoutParameters.height + 'px;';

        style(left, {
            // background: Theme.a,
            overflow: 'hidden'
        });

        left.style.width = LayoutParameters.LEFT_PANE_WIDTH + 'px';

        // right.style.cssText = 'position: absolute; top: 0px;';
        right.style.position = 'absolute';
        right.style.top = '0px';
        right.style.left = LayoutParameters.LEFT_PANE_WIDTH + 'px';
    }

    function addLayer(name, label) {
        const layer = new LayerProp(name, label);

        layers = layerStore.value;
        layers.push(layer);

        layerPanel.setState(layerStore);
    }

    this.addLayer = addLayer;

    this._addThreeJsObjectKeyingLayer = (keyName) => {
        if (!this._threeJsObject) {
            console.warn('no three js target object was specified!');
            return;
        }

        if (!ThreeJsObjectKeyingSet[keyName]) {
            console.warn(`unrecognized key name ${keyName}`);
            return
        }

        this.addLayer(ThreeJsObjectKeyingSet[keyName], ThreeJsObjectKeyingSet[keyName]);
    };

    this.dispose = function dispose() {
        const domParent = rootPanel.parentElement;

        domParent.removeChild(rootPanel);
        domParent.removeChild(ghostPanel);
    };

    this.setTarget = function (t) {
        target = t;
    };

    /**
     * @param {object } object
     */
    this.setTargetThreeJsObject = function (object) {
        if (this._threeJsObject) {
            // clear previous threejs object animation data

            if (this._threeJsObject.uuid === object.uuid) {
                console.warn('already targeted');
                return;
            }

            layerStore.value = [];
        }

        if (object) {
            if (!object.animationData) {
                console.warn('this threejs object has not any animation data! empty animation data will be created');

                object.animationData = {
                    layers: []
                };
            } else {
                this._loadDataFromThreeJsObject(object);
            }
        }

        this._threeJsObject = object;
        target = {};

        if (this._animationPath)
            this._animationPath.dispose();

        this._animationPath = new AnimationPath({
            viewer: potreeViewer,
            object: object
        });

        object.addEventListener('position_keyframe_changed', (e) => {
            this._mute = true;

            const keyframeIndex = e.keyframeIndex;
            const position = e.position;

            const positionXLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionX)[0];
            const positionYLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionY)[0];
            const positionZLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.PositionZ)[0];

            positionXLayer.values[keyframeIndex].value = position.x;
            positionYLayer.values[keyframeIndex].value = position.y;
            positionZLayer.values[keyframeIndex].value = position.z;

            updateState();
            this._animationPath.updatePath();

            this._mute = false;
        });

        object.addEventListener('rotation_keyframe_changed', (e) => {
            this._mute = true;

            const keyframeIndex = e.keyframeIndex;
            const rotation = e.rotation;

            const rotationXLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.RotationX)[0];
            const rotationYLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.RotationY)[0];
            const rotationZLayer = layers.filter(layer => layer.name === ThreeJsObjectKeyingSet.RotationZ)[0];

            rotationXLayer.values[keyframeIndex].value = rotation.x;
            rotationYLayer.values[keyframeIndex].value = rotation.y;
            rotationZLayer.values[keyframeIndex].value = rotation.z;

            updateState();
            this._animationPath.updatePath();

            this._mute = false;
        });

        updateState();
        this._updateThreejsObjectAnimationData();
        this._animationPath.update();
    };

    /**
     * @param {string} layerName
     * @param {object} value
     * @param {number} value.time
     * @param {number} value.value
     * @param {string} value._color
     * @param {string} value.tween
     * @param {boolean} update
     */
    this._addOneThreeJsObjectKeyframe = (layerName, value, update = false) => {
        if (!this._threeJsObject) {
            console.warn('no threejs object added');
            return;
        }

        if (!ThreeJsObjectKeyingSet[layerName]) {
            console.warn(`unrecognized threejs object keying name: ${layerName}`);
            return;
        }

        const filteredLayers = layers.filter(layer => layer.name === layerName);

        if (filteredLayers.length === 0) {
            console.warn(`failed to find layer : ${layerName}`);
            return;
        }

        if (filteredLayers.length !== 1) {
            console.warn(`non unique layer name : ${layerName}`);
            return;
        }

        if (value.time < 0) {
            console.warn(`invalid time: ${value.time} it will fall back to 0!`);
            value.time = 0;
        }

        const layer = filteredLayers[0];

        layer.values.push(value);

        if (update) {
            updateState();
            this._updateThreejsObjectAnimationData();
        }
    };

    this._loadDataFromThreeJsObject = (threejsObject) => {
        const layers = threejsObject.animationData.layers;

        const dataStoreLayers = dataStore.data.layers;

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];

            let clonedLayer = {
                label: layer.label,
                name: layer.name,
                _color: layer._color,
                _value: layer._value,
                values: []
            };

            for (let j = 0; j < layer.values.length; j++) {
                const value = layer.values[j];

                clonedLayer.values.push({
                    time: value.time,
                    tween: value.tween,
                    value: value.value,
                    _color: value._color
                })
            }

            dataStoreLayers.push(clonedLayer);
        }
    };

    this._updateThreejsObjectAnimationData = () => {
        const dataStoreLayers = dataStore.data.layers;

        const threejsObject = this._threeJsObject;

        threejsObject.animationData.layers = [];

        for (let i = 0; i < dataStoreLayers.length; i++) {
            const layer = dataStoreLayers[i];

            let clonedLayer = {
                label: layer.label,
                name: layer.name,
                _color: layer._color,
                _value: layer._value,
                values: []
            };

            for (let j = 0; j < layer.values.length; j++) {
                const value = layer.values[j];

                clonedLayer.values.push({
                    time: value.time,
                    tween: value.tween,
                    value: value.value,
                    _color: value._color
                })
            }

            threejsObject.animationData.layers.push(clonedLayer);
        }
    };

    this._onAddKeyframe = () => {
        if (!this._threeJsObject) {
            alert("no object selected!");
            return;
        }

        // in case all layer is not yet added
        if (this._threeJsObject.animationData.layers.length === 0) {
            this._addAllThreeJsObjectKeyingLayers();
        }

        this._addThreeJsObjectKeyframes(this._threeJsObject);
    };

    this._addThreeJsObjectKeyframes = (object) => {
        const time = currentTimeStore.value;

        const commonKeyFrame = {
            "time": time,
            "value": 0,
            "_color": randomCssColorString(),
            "tween": Easing.linear
        };

        let keyframeValue = cloneObject(commonKeyFrame);
        keyframeValue.value = object.position.x;
        this._addOneThreeJsObjectKeyframe(ThreeJsObjectKeyingSet.PositionX, keyframeValue);

        keyframeValue = cloneObject(commonKeyFrame);
        keyframeValue.value = object.position.y;
        this._addOneThreeJsObjectKeyframe(ThreeJsObjectKeyingSet.PositionY, keyframeValue);

        keyframeValue = cloneObject(commonKeyFrame);
        keyframeValue.value = object.position.z;
        this._addOneThreeJsObjectKeyframe(ThreeJsObjectKeyingSet.PositionZ, keyframeValue);

        keyframeValue = cloneObject(commonKeyFrame);
        keyframeValue.value = object.rotation.x;
        this._addOneThreeJsObjectKeyframe(ThreeJsObjectKeyingSet.RotationX, keyframeValue);

        keyframeValue = cloneObject(commonKeyFrame);
        keyframeValue.value = object.rotation.y;
        this._addOneThreeJsObjectKeyframe(ThreeJsObjectKeyingSet.RotationY, keyframeValue);

        keyframeValue = cloneObject(commonKeyFrame);
        keyframeValue.value = object.rotation.z;
        this._addOneThreeJsObjectKeyframe(ThreeJsObjectKeyingSet.RotationZ, keyframeValue);

        keyframeValue = cloneObject(commonKeyFrame);
        keyframeValue.value = object.scale.x;
        this._addOneThreeJsObjectKeyframe(ThreeJsObjectKeyingSet.ScaleX, keyframeValue);

        keyframeValue = cloneObject(commonKeyFrame);
        keyframeValue.value = object.scale.y;
        this._addOneThreeJsObjectKeyframe(ThreeJsObjectKeyingSet.ScaleY, keyframeValue);

        keyframeValue = cloneObject(commonKeyFrame);
        keyframeValue.value = object.scale.z;
        this._addOneThreeJsObjectKeyframe(ThreeJsObjectKeyingSet.ScaleZ, keyframeValue);

        updateState();
        this._updateThreejsObjectAnimationData();
        this._animationPath.update();
    };

    this._addAllThreeJsObjectKeyingLayers = () => {
        this._addThreeJsObjectKeyingLayer(ThreeJsObjectKeyingSet.PositionX);
        this._addThreeJsObjectKeyingLayer(ThreeJsObjectKeyingSet.PositionY);
        this._addThreeJsObjectKeyingLayer(ThreeJsObjectKeyingSet.PositionZ);

        this._addThreeJsObjectKeyingLayer(ThreeJsObjectKeyingSet.RotationX);
        this._addThreeJsObjectKeyingLayer(ThreeJsObjectKeyingSet.RotationY);
        this._addThreeJsObjectKeyingLayer(ThreeJsObjectKeyingSet.RotationZ);

        this._addThreeJsObjectKeyingLayer(ThreeJsObjectKeyingSet.ScaleX);
        this._addThreeJsObjectKeyingLayer(ThreeJsObjectKeyingSet.ScaleY);
        this._addThreeJsObjectKeyingLayer(ThreeJsObjectKeyingSet.ScaleZ);
    };

    this._onRemoveAllFrames = () => {
        if (dataStore.data.layers.length === 0)
            return;

        const ret = confirm("Are you sure?");

        if (!ret)
            return;

        this._stopPlay();

        dataStore.data.layers = [];
        removeAnimationDataFromThreejsObject(this._threeJsObject);
        updateState();
        this._animationPath.update();
    };

    this._stopPlay = () => {
        if (startPlay !== null)
            pausePlaying();

        setCurrentTime(0);
    };

    this._previousKeyframeTime = () => {
        const currentTime = dataStore.get('ui:currentTime').value;

        const layers = layerStore.value;

        if (layers.length === 0)
            return currentTime;

        const firstLayer = layers[0];

        const firstLayerValues = firstLayer.values;

        let valueIndex = -1;
        for (let i = firstLayerValues.length - 1; i >= 0; i--) {
            const value = firstLayerValues[i];

            if (currentTime > value.time) {
                valueIndex = i;
                break;
            }
        }

        if (valueIndex !== -1) {
            return firstLayerValues[valueIndex].time;
        } else {
            return currentTime;
        }
    };

    this._nextKeyframeTime = () => {
        const currentTime = dataStore.get('ui:currentTime').value;

        const layers = layerStore.value;

        if (layers.length === 0)
            return currentTime;

        const firstLayer = layers[0];

        const firstLayerValues = firstLayer.values;

        if (currentTime < firstLayerValues[0].time)
            return firstLayerValues[0].time;

        let valueIndex = -1;
        for (let i = 0; i < firstLayerValues.length; i++) {
            const value = firstLayerValues[i];
            let nextValue = null;

            if (i < firstLayerValues.length - 1)
                nextValue = firstLayerValues[i + 1];

            if (currentTime === value.time) {
                valueIndex = i;
                break;
            } else if (nextValue && currentTime > value.time && currentTime < nextValue.time) {
                valueIndex = i;
                break;
            }
        }

        if (valueIndex !== -1) {
            if (valueIndex < firstLayerValues.length - 1)
                return firstLayerValues[valueIndex + 1].time;
            else
                return currentTime;
        } else {
            return currentTime;
        }
    };

    this.show = () => {
        rootPanel.style.display = "block";
        ghostPanel.style.display = "block";
    };

    this.hide = () => {
        rootPanel.style.display = "none";
        ghostPanel.style.display = "none";
    };

    dispatcher.on('frameChanged', (e) => {
        const {indexOfFrame, updatedTime} = e;

        for (let i = 0; i < layers.length; i++) {
            layers[i].values[indexOfFrame].time = updatedTime;
        }

        updateState();
    });

    function getValueRanges(ranges, interval) {
        interval = interval ? interval : 0.15;
        ranges = ranges ? ranges : 2;

        // not optimized!
        var t = dataStore.get('ui:currentTime').value;

        var values = [];

        for (var u = -ranges; u <= ranges; u++) {
            // if (u == 0) continue;
            var o = {};

            for (var l = 0; l < layers.length; l++) {
                var layer = layers[l];
                var m = utils.timeAtLayer(layer, t + u * interval);
                o[layer.name] = m.value;
            }

            values.push(o);
        }

        return values;
    }

    this.getValues = getValueRanges;

    potreeViewer.inputHandler.addEventListener('selection_changed', (e) => {
        if (e.selection.length === 1) {
            if(e.selection[0].transformationEnabled === false) {
                this.hide();
                return;
            }

            this.setTargetThreeJsObject(e.selection[0]);
            this.show();
        } else if (e.selection.length === 0) {
            this.hide();
        } else {
            this.hide();
        }
    });
}

function cloneObject(o) {
    return JSON.parse(JSON.stringify(o));
}

function randomCssColorString() {
    return '#' + (Math.random() * 0xffffff | 0).toString(16)
}

window.Timeliner = Timeliner;

export {Timeliner}