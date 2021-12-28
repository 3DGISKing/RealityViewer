import {LayoutParameters} from '../Settings.js'
import {Theme} from '../theme.js'
import {utils} from '../utils/utils.js'
import {handleDrag} from '../utils/util_handle_drag.js'
import {ScrollCanvas} from './ScrollCanvas.js'
import {Canvas} from '../ui/Canvas.js'
import { Tweens }  from '../utils/util_tween.js'

const proxy_ctx = utils.proxy_ctx;

const
    LINE_HEIGHT = LayoutParameters.LINE_HEIGHT,
    DIAMOND_SIZE = LayoutParameters.DIAMOND_SIZE,
    TIME_SCROLLER_HEIGHT = 35,
    MARKER_TRACK_HEIGHT = 25;
let timeScale = LayoutParameters.time_scale;

let frameStart = 0; // this is the current scroll position.

/*
 * This class contains the view for the right main section of timeliner
 */


// TODO
// dirty rendering
// drag block
// DON'T use time.update for everything

let tickMark1;
let tickMark2;
let tickMark3;

function timeScaled() {
    /*
     * Subdivison LOD
     * time_scale refers to number of pixels per unit
     * Eg. 1 inch - 60s, 1 inch - 60fps, 1 inch - 6 mins
     */
    let div = 60;

    tickMark1 = timeScale / div;
    tickMark2 = 2 * tickMark1;
    tickMark3 = 10 * tickMark1;
}

timeScaled();

/**************************/
// Timeline Panel
/**************************/

function TimelinePanel(dataStore, dispatcher) {
    let dpr = window.devicePixelRatio;
    let trackCanvas = document.createElement('canvas');

    let scrollTop = 0, scrollLeft = 0, SCROLL_HEIGHT;
    let layers = dataStore.get('layers').value;

    this.scrollTo = function (s, y) {
        scrollTop = s * Math.max(layers.length * LINE_HEIGHT - SCROLL_HEIGHT, 0);
        repaint();
    };

    this.resize = function () {
        const trackCanvasHeight = (LayoutParameters.height - TIME_SCROLLER_HEIGHT - LayoutParameters.STATUS_BAR_HEIGHT - 5);

        dpr = window.devicePixelRatio;
        trackCanvas.width = LayoutParameters.width * dpr;
        trackCanvas.height = trackCanvasHeight * dpr;
        trackCanvas.style.width = LayoutParameters.width + 'px';
        trackCanvas.style.height = trackCanvasHeight + 'px';
        SCROLL_HEIGHT = LayoutParameters.height - TIME_SCROLLER_HEIGHT;
        scrollCanvas.setSize(LayoutParameters.width, TIME_SCROLLER_HEIGHT);
        scrollCanvas.dom.style.top = (trackCanvas.height + 2) + 'px';
    };

    let div = document.createElement('div');

    let scrollCanvas = new Canvas(LayoutParameters.width, TIME_SCROLLER_HEIGHT);
    // data.addListener('ui', repaint );

    utils.style(trackCanvas, {
        position: 'absolute',
        top: '0px',
        left: '0px'
    });

    const LEFT_GUTTER = 20;

    utils.style(scrollCanvas.dom, {
        position: 'absolute',
        left: LEFT_GUTTER + 'px'
    });

    scrollCanvas.uses(new ScrollCanvas(dispatcher, dataStore));

    div.appendChild(trackCanvas);
    div.appendChild(scrollCanvas.dom);
    scrollCanvas.dom.id = 'scroll-canvas';
    trackCanvas.id = 'track-canvas';

    this.dom = div;
    this.dom.id = 'timeline-panel';
    this.resize();

    let ctx = trackCanvas.getContext('2d');
    let ctx_wrap = proxy_ctx(ctx);

    let currentTime; // measured in seconds
    // technically it could be in frames or  have it in string format (0:00:00:1-60)

    let i, x, y, countOfLayers;

    let needsRepaint = false;
    let renderItems = [];

    function EasingRect(upperLeftX, upperLeftY, bottomRightX, bottomRightY, frame, nextFrame, values, layer, j) {
        this.path = function () {
            ctx_wrap.beginPath()
                .rect(upperLeftX, upperLeftY, bottomRightX - upperLeftX, bottomRightY - upperLeftY)
                .closePath();
        };

        this.paint = function () {
            this.path();
            ctx.fillStyle = frame._color;
            ctx.fill();
        };

        this.mouseover = function () {
            trackCanvas.style.cursor = 'pointer'; // pointer move ew-resize
        };

        this.mouseout = function () {
            trackCanvas.style.cursor = 'default';
        };

        this.mouseDrag = function (e) {
            let t1 = xToTime(upperLeftX + e.dx);

            t1 = Math.max(0, t1);

            // TODO limit moving to neighbours
            frame.time = t1;

            let t2 = xToTime(bottomRightX + e.dx);
            t2 = Math.max(0, t2);
            nextFrame.time = t2;

            // dispatcher.fire('time.update', t1);
        };
    }

    /**
     * @param {number} indexOfFrame
     * @param {object} frame
     * @param {number} frame.time
     * @param {string} frame.tween
     * @param {number} frame.value
     * @param {string} frame._color
     * @param {number} y
     * @constructor
     */
    function Diamond(indexOfFrame, frame, y) {
        let x, y2;

        x = timeToX(frame.time);
        y2 = y + LINE_HEIGHT * 0.5 - DIAMOND_SIZE / 2;

        let self = this;

        let isOver = false;

        this.path = function (ctx_wrap) {
            ctx_wrap
                .beginPath()
                .moveTo(x, y2)
                .lineTo(x + DIAMOND_SIZE / 2, y2 + DIAMOND_SIZE / 2)
                .lineTo(x, y2 + DIAMOND_SIZE)
                .lineTo(x - DIAMOND_SIZE / 2, y2 + DIAMOND_SIZE / 2)
                .closePath();
        };

        this.paint = function (ctx_wrap) {
            self.path(ctx_wrap);

            if (!isOver)
                ctx_wrap.fillStyle(Theme.c);
            else
                ctx_wrap.fillStyle('yellow'); // Theme.d

            ctx_wrap.fill()
                .stroke();
        };

        this.mouseover = function () {
            isOver = true;
            trackCanvas.style.cursor = 'move'; // pointer move ew-resize
            self.paint(ctx_wrap);
        };

        this.mouseout = function () {
            isOver = false;
            trackCanvas.style.cursor = 'default';
            self.paint(ctx_wrap);
        };

        /**
         * @param {object} e
         * @param {number} e.dx
         * @param {number} e.dy
         * @param {boolean} e.moved
         * @param {number} e.offsetx
         * @param {number} e.offsety
         * @param {number} e.startx
         * @param {number} e.starty
         * @param {number} e.x
         * @param {number} e.y
         */
        this.mouseDrag = function (e) {
            let updatedTime = xToTime(x + e.dx);

            updatedTime = Math.max(0, updatedTime);

            // TODO limit moving to neighbours
            frame.time = updatedTime;

            dispatcher.fire('frameChanged', {
                indexOfFrame: indexOfFrame,
                updatedTime: updatedTime
            });
        };
    }

    function repaint() {
        needsRepaint = true;
    }

    function drawTickMarkAreaBackground() {
        const width = LayoutParameters.width;

        ctx.fillStyle = "rgba(42, 42, 42, 1)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, 40);
        ctx.lineTo(0, 40);

        ctx.closePath();
        ctx.fill();
    }

    function drawAnimationArea() {
        const height = LayoutParameters.height;

        const startX = timeToX(0);
        const endX = timeToX(dataStore.get('ui:totalTime').value);

        ctx.fillStyle = "rgba(66, 66, 66, 1)";
        ctx.beginPath();
        ctx.moveTo(startX, 40);
        ctx.lineTo(endX, 40);
        ctx.lineTo(endX, height);
        ctx.lineTo(startX, height);

        ctx.closePath();
        ctx.fill();
    }

    function drawLayerContents() {
        renderItems = [];

        // horizontal Layer lines
        for (i = 0, countOfLayers = layers.length; i <= countOfLayers; i++) {
            ctx.strokeStyle = Theme.b;
            ctx.beginPath();
            y = i * LINE_HEIGHT;
            y = ~~y - 0.5;

            ctx_wrap
                .moveTo(0, y)
                .lineTo(LayoutParameters.width, y)
                .stroke();
        }

        let frame, nextFrame, j;

        // Draw Easing Rects
        for (i = 0; i < countOfLayers; i++) {
            // check for keyframes
            let layer = layers[i];
            let values = layer.values;

            y = i * LINE_HEIGHT;

            for (j = 0; j < values.length - 1; j++) {
                frame = values[j];
                nextFrame = values[j + 1];

                // Draw Tween Rect
                const leftX = timeToX(frame.time);
                const nextFrameX = timeToX(nextFrame.time);

                if (!frame.tween || frame.tween === 'none')
                    continue;

                let upperY = y + 2;
                let bottomY = y + LINE_HEIGHT - 2;

                renderItems.push(new EasingRect(leftX, upperY, nextFrameX, bottomY, frame, nextFrame));

                // draw easing graph

                // below code does not work. graph will not overlay on the easing rect

                /*
                let color = parseInt(frame._color.substring(1, 7), 16);

                color = 0xffffff ^ color;
                color = color.toString(16);           // convert to hex
                color = '#' + ('000000' + color).slice(-6);

                ctx.strokeStyle = color;

                let x3;

                ctx.beginPath();
                ctx.moveTo(leftX, bottomY);

                let dy = upperY - bottomY;
                let dx = nextFrameX - leftX;

                for (x3 = leftX; x3 < nextFrameX; x3++) {
                	ctx.lineTo(x3, bottomY + Tweens[frame.tween]((x3 - leftX)/dx) * dy);
                	console.log(x3, bottomY + Tweens[frame.tween]((x3 - leftX)/dx) * dy)
                }

                ctx.stroke();
                */
            }

            // Diamonds
            for (j = 0; j < values.length; j++) {
                frame = values[j];
                renderItems.push(new Diamond(j, frame, y));
            }
        }

        // render items
        let item;

        for (i = 0, countOfLayers = renderItems.length; i < countOfLayers; i++) {
            item = renderItems[i];
            item.paint(ctx_wrap);
        }
    }

    function setTimeScale() {
        let v = dataStore.get('ui:timeScale').value;

        if (timeScale !== v) {
            timeScale = v;
            timeScaled();
        }
    }

    let over = null;
    let mousedownItem = null;

    function check() {
        let item;
        let last_over = over;
        // over = [];
        over = null;
        for (i = renderItems.length; i-- > 0;) {
            item = renderItems[i];
            item.path(ctx_wrap);

            if (ctx.isPointInPath(pointer.x * dpr, pointer.y * dpr)) {
                // over.push(item);
                over = item;
                break;
            }
        }

        // clear old mousein
        if (last_over && last_over != over) {
            item = last_over;
            if (item.mouseout) item.mouseout();
        }

        if (over) {
            item = over;
            if (item.mouseover) item.mouseover();

            if (mousedown2) {
                mousedownItem = item;
            }
        }
    }

    function pointerEvents() {
        if (!pointer) return;

        ctx_wrap
            .save()
            .scale(dpr, dpr)
            .translate(0, MARKER_TRACK_HEIGHT)
            .beginPath()
            .rect(0, 0, LayoutParameters.width, SCROLL_HEIGHT)
            .translate(-scrollLeft, -scrollTop)
            .clip()
            .run(check)
            .restore();
    }

    function _paint() {
        if (!needsRepaint) {
            pointerEvents();
            return;
        }

        scrollCanvas.repaint();

        setTimeScale();

        currentTime = dataStore.get('ui:currentTime').value;
        frameStart = dataStore.get('ui:scrollTime').value;

        /**************************/
        // background

        ctx.fillStyle = 'rgba(51, 51, 51, 1)';
        ctx.clearRect(0, 0, trackCanvas.width, trackCanvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);

        ctx.lineWidth = 1;

        const width = LayoutParameters.width;
        const height = LayoutParameters.height;

        let units = timeScale / tickMark1;
        let offsetUnits = (frameStart * timeScale) % units;

        let count = (width - LEFT_GUTTER + offsetUnits) / units;

        // console.log('time_scale', time_scale, 'tickMark1', tickMark1, 'units', units, 'offsetUnits', offsetUnits, frame_start);

        // time_scale = pixels to 1 second (40)
        // tickMark1 = marks per second (marks / s)
        // units = pixels to every mark (40)

        drawAnimationArea();
        drawTickMarkAreaBackground();

        // labels only
        for (i = 0; i < count; i++) {
            x = i * units + LEFT_GUTTER - offsetUnits;

            // vertical lines
            ctx.strokeStyle = Theme.b;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.fillStyle = Theme.d;
            ctx.textAlign = 'center';

            let t = (i * units - offsetUnits) / timeScale + frameStart;
            t = utils.format_friendly_seconds(t);
            ctx.fillText(t, x, 38);
        }

        units = timeScale / tickMark2;
        count = (width - LEFT_GUTTER + offsetUnits) / units;

        // marker lines - main
        for (i = 0; i < count; i++) {
            ctx.strokeStyle = Theme.c;
            ctx.beginPath();
            x = i * units + LEFT_GUTTER - offsetUnits;
            ctx.moveTo(x, MARKER_TRACK_HEIGHT - 0);
            ctx.lineTo(x, MARKER_TRACK_HEIGHT - 16);
            ctx.stroke();
        }

        let mul = tickMark3 / tickMark2;
        units = timeScale / tickMark3;
        count = (width - LEFT_GUTTER + offsetUnits) / units;

        // small ticks
        for (i = 0; i < count; i++) {
            if (i % mul === 0) continue;
            ctx.strokeStyle = Theme.c;
            ctx.beginPath();
            x = i * units + LEFT_GUTTER - offsetUnits;
            ctx.moveTo(x, MARKER_TRACK_HEIGHT - 0);
            ctx.lineTo(x, MARKER_TRACK_HEIGHT - 10);
            ctx.stroke();
        }

        // Encapsulate a scroll rect for the layers
        ctx_wrap
            .save()
            .translate(0, MARKER_TRACK_HEIGHT)
            .beginPath()
            .rect(0, 0, LayoutParameters.width, SCROLL_HEIGHT)
            .translate(-scrollLeft, -scrollTop)
            .clip()
            .run(drawLayerContents)
            .restore();

        // Current Marker / Cursor
        ctx.strokeStyle = 'red'; // Theme.c
        x = (currentTime - frameStart) * timeScale + LEFT_GUTTER;

        let txt = utils.format_friendly_seconds(currentTime);
        let textWidth = ctx.measureText(txt).width;

        let base_line = MARKER_TRACK_HEIGHT - 5, half_rect = textWidth / 2 + 4;

        ctx.beginPath();
        ctx.moveTo(x, base_line);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.fillStyle = 'red'; // black
        ctx.textAlign = 'center';
        ctx.beginPath();
        ctx.moveTo(x, base_line + 5);
        ctx.lineTo(x + 5, base_line);
        ctx.lineTo(x + half_rect, base_line);
        ctx.lineTo(x + half_rect, base_line - 14);
        ctx.lineTo(x - half_rect, base_line - 14);
        ctx.lineTo(x - half_rect, base_line);
        ctx.lineTo(x - 5, base_line);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.fillText(txt, x, base_line - 4);

        ctx.restore();

        needsRepaint = false;
        // pointerEvents();
    }

    function yToTrack(y) {
        if (y - MARKER_TRACK_HEIGHT < 0) return -1;
        return (y - MARKER_TRACK_HEIGHT + scrollTop) / LINE_HEIGHT | 0;
    }

    function xToTime(x) {
        let units = timeScale / tickMark3;

        // return frame_start + (x - LEFT_GUTTER) / time_scale;

        return frameStart + ((x - LEFT_GUTTER) / units | 0) / tickMark3;
    }

    function timeToX(s) {
        let ds = s - frameStart;
        ds *= timeScale;
        ds += LEFT_GUTTER;

        return ds;
    }

    this.repaint = repaint;
    this._paint = _paint;

    repaint();

    let canvasBounds;

    document.addEventListener('mousemove', onMouseMove);

    function onMouseMove(e) {
        canvasBounds = trackCanvas.getBoundingClientRect();
        let mx = e.clientX - canvasBounds.left, my = e.clientY - canvasBounds.top;
        onPointerMove(mx, my);
    }

    let pointerDidMoved = false;
    let pointer = null;

    function onPointerMove(x, y) {
        if (mousedownItem)
            return;

        pointerDidMoved = true;
        pointer = {x: x, y: y};
    }

    trackCanvas.addEventListener('mouseout', function () {
        pointer = null;
    });

    let mousedown2 = false, mouseDownThenMove = false;

    handleDrag(trackCanvas, function down(e) {
            mousedown2 = true;

            pointer = {
                x: e.offsetx,
                y: e.offsety
            };

            pointerEvents();

            if (!mousedownItem)
                dispatcher.fire('time.update', xToTime(e.offsetx));
            // Hit criteria
        }, function move(e) {
            mousedown2 = false;
            if (mousedownItem) {
                mouseDownThenMove = true;
                if (mousedownItem.mouseDrag) {
                    mousedownItem.mouseDrag(e);
                }
            } else {
                dispatcher.fire('time.update', xToTime(e.offsetx));
            }
        }, function up(e) {
            if (mouseDownThenMove) {
                dispatcher.fire('keyframe.move');
            } else {
                dispatcher.fire('time.update', xToTime(e.offsetx));
            }
            mousedown2 = false;
            mousedownItem = null;
            mouseDownThenMove = false;
        }
    );

    this.setState = function (state) {
        layers = state.value;
        repaint();
    };
}

export {TimelinePanel, MARKER_TRACK_HEIGHT}
