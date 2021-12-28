import {Do} from './do.js';
import {LayoutParameters} from '../Settings.js'

const SNAP_FULL_SCREEN = 'full-screen';
const SNAP_TOP_EDGE = 'snap-top-edge'; // or actually top half
const SNAP_LEFT_EDGE = 'snap-left-edge';
const SNAP_RIGHT_EDGE = 'snap-right-edge';
const SNAP_BOTTOM_EDGE = 'snap-bottom-edge';
const SNAP_DOCK_BOTTOM = 'dock-bottom';

function setBounds(element, x, y, w, h) {
    element.style.left = x + 'px';
    element.style.top = y + 'px';
    element.style.width = w + 'px';
    element.style.height = h + 'px';
}

/*

The Docking Widget

1. when .allowMove(true) is set, the pane becomes draggable
2. when dragging, if the pointer to near to the edges,
   it resizes the ghost pannel as a suggestion to snap into the
   suggested position
3. user can either move pointer away or let go of the cursor,
   allow the pane to be resized and snapped into position


My origin implementation from https://codepen.io/zz85/pen/gbOoVP

args eg.
	let pane = document.getElementById('pane');
	let ghostpane = document.getElementById('ghostpane');
	widget = new DockingWindow(pane, ghostpane)


	title_dom.addEventListener('mouseover', function() {
		widget.allowMove(true);
	});

	title_dom.addEventListener('mouseout', function() {
		widget.allowMove(false);
	});

	resize_full.onClick(() => {
		widget.maximize() // fill to screen
	})

	// TODO callback when pane is resized
	widget.resizes.do(() => {
		something
	})
*/

function DockingWindow(panel, ghostPanel) {
    "use strict";

    // Minimum resizable area
    const minWidth = 100;
    const minHeight = 80;

    // Thresholds
    const FULLSCREEN_MARGINS = 2;
    const SNAP_MARGINS = 8;
    const MARGINS = 2;

    // End of what's configurable.
    let pointerStart = null;
    let onRightEdge, onBottomEdge, onLeftEdge, onTopEdge;

    let preSnapped;

    let bounds, x, y;

    let redraw = false;

    let allowDragging = true;
    let snapType;

    this.allowMove = function (allow) {
        allowDragging = allow;
    };

    function canMove() {
        return allowDragging;
    }

    this.maximize = function () {
        if (!preSnapped) {
            preSnapped = {
                width: bounds.width,
                height: bounds.height,
                top: bounds.top,
                left: bounds.left,
            };

            snapType = SNAP_FULL_SCREEN;
            resizeEdges();
        } else {
            setBounds(panel, bounds.left, bounds.top, bounds.width, bounds.height);
            calculateBounds();
            snapType = null;
            preSnapped = null;
        }
    };

    this.resizes = new Do();

    /* DOM Utils */
    function hideGhostPane() {
        // hide the hinter, animatating to the pane's bounds
        setBounds(ghostPanel, bounds.left, bounds.top, bounds.width, bounds.height);
        ghostPanel.style.opacity = 0;
    }

    function onTouchDown(e) {
        onDoMouseDown(e.touches[0]);
        e.preventDefault();
    }

    function onTouchMove(e) {
        onMouseMove(e.touches[0]);
    }

    function onTouchEnd(e) {
        if (e.touches.length == 0)
            onUp(e.changedTouches[0]);
    }

    function onMouseDown(e) {
        onDoMouseDown(e);
    }

    function onMouseUp(e) {
        onUp(e);
    }

    function onDoMouseDown(e) {
        calculateBounds(e);

        let isResizing = onRightEdge || onBottomEdge || onTopEdge || onLeftEdge;
        let isMoving = !isResizing && canMove();

        pointerStart = {
            x: x,
            y: y,
            cx: e.clientX,
            cy: e.clientY,
            w: bounds.width,
            h: bounds.height,
            isResizing: isResizing,
            isMoving: isMoving,
            onTopEdge: onTopEdge,
            onLeftEdge: onLeftEdge,
            onRightEdge: onRightEdge,
            onBottomEdge: onBottomEdge
        };

        if (isResizing || isMoving) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    function calculateBounds(e) {
        bounds = panel.getBoundingClientRect();
        x = e.clientX - bounds.left;
        y = e.clientY - bounds.top;

        onTopEdge = y < MARGINS;
        onLeftEdge = x < MARGINS;
        onRightEdge = x >= bounds.width - MARGINS;
        onBottomEdge = y >= bounds.height - MARGINS;
    }

    let e; // current mousemove event

    function onMouseMove(ee) {
        e = ee;
        calculateBounds(e);

        redraw = true;
    }

    function animate() {
        requestAnimationFrame(animate);

        if (!redraw) return;

        redraw = false;

        // style cursor
        if (onRightEdge && onBottomEdge || onLeftEdge && onTopEdge) {
            panel.style.cursor = 'nwse-resize';
        } else if (onRightEdge && onTopEdge || onBottomEdge && onLeftEdge) {
            panel.style.cursor = 'nesw-resize';
        } else if (onRightEdge || onLeftEdge) {
            panel.style.cursor = 'ew-resize';
        } else if (onBottomEdge || onTopEdge) {
            panel.style.cursor = 'ns-resize';
        } else if (canMove()) {
            panel.style.cursor = 'move';
        } else {
            panel.style.cursor = 'default';
        }

        if (!pointerStart) return;

        /* User is resizing */
        if (pointerStart.isResizing) {

            if (pointerStart.onRightEdge) panel.style.width = Math.max(x, minWidth) + 'px';
            if (pointerStart.onBottomEdge) panel.style.height = Math.max(y, minHeight) + 'px';

            if (pointerStart.onLeftEdge) {
                let currentWidth = Math.max(pointerStart.cx - e.clientX + pointerStart.w, minWidth);
                if (currentWidth > minWidth) {
                    panel.style.width = currentWidth + 'px';
                    panel.style.left = e.clientX + 'px';
                }
            }

            if (pointerStart.onTopEdge) {
                let currentHeight = Math.max(pointerStart.cy - e.clientY + pointerStart.h, minHeight);
                if (currentHeight > minHeight) {
                    panel.style.height = currentHeight + 'px';
                    panel.style.top = e.clientY + 'px';
                }
            }

            hideGhostPane();

            self.resizes.fire(bounds.width, bounds.height);

            return;
        }

        /* User is dragging */
        if (pointerStart.isMoving) {
            let snapType = checkSnapType();

            if (snapType) {
                calcSnapBounds(snapType);
                // console.log('snapping...', JSON.stringify(snapBounds))
                let {left, top, width, height} = snapBounds;
                setBounds(ghostPanel, left, top, width, height);
                ghostPanel.style.opacity = 0.2;
            } else {
                hideGhostPane();
            }

            if (preSnapped) {
                setBounds(panel,
                    e.clientX - preSnapped.width / 2,
                    e.clientY - Math.min(pointerStart.y, preSnapped.height),
                    preSnapped.width,
                    preSnapped.height
                );
                return;
            }

            // moving
            panel.style.top = (e.clientY - pointerStart.y) + 'px';
            panel.style.left = (e.clientX - pointerStart.x) + 'px';
        }
    }

    function checkSnapType() {
        // drag to full screen
        if (e.clientY < FULLSCREEN_MARGINS) return SNAP_FULL_SCREEN;

        // drag for top half screen
        if (e.clientY < SNAP_MARGINS) return SNAP_TOP_EDGE;

        // drag for left half screen
        if (e.clientX < SNAP_MARGINS) return SNAP_LEFT_EDGE;

        // drag for right half screen
        if (window.innerWidth - e.clientX < SNAP_MARGINS) return SNAP_RIGHT_EDGE;

        // drag for bottom half screen
        if (window.innerHeight - e.clientY < SNAP_MARGINS) return SNAP_BOTTOM_EDGE;

    }

    let self = this;

    let snapBounds = {};

    function calcSnapBounds(snapType) {
        if (!snapType) return;

        let width, height, left, top;

        switch (snapType) {
            case SNAP_FULL_SCREEN:
                width = window.innerWidth;
                height = window.innerHeight;
                left = 0;
                top = 0;
                break;
            case SNAP_TOP_EDGE:
                width = window.innerWidth;
                height = window.innerHeight / 2;
                left = 0;
                top = 0;
                break;
            case SNAP_LEFT_EDGE:
                width = window.innerWidth / 2;
                height = window.innerHeight;
                left = 0;
                top = 0;
                break;
            case SNAP_RIGHT_EDGE:
                width = window.innerWidth / 2;
                height = window.innerHeight;
                left = window.innerWidth - width;
                top = 0;
                break;
            case SNAP_BOTTOM_EDGE:
                width = window.innerWidth;
                height = window.innerHeight / 3;
                left = 0;
                top = window.innerHeight - height;
                break;
            case SNAP_DOCK_BOTTOM:
                width = bounds.width;
                height = bounds.height;
                left = (window.innerWidth - width) * 0.5;
                top = window.innerHeight - height;
        }

        Object.assign(snapBounds, {left, top, width, height});
    }

    /* When one of the edges is move, resize panel */
    function resizeEdges() {
        if (!snapType)
            return;

        calcSnapBounds(snapType);
        const {left, top, width, height} = snapBounds;
        setBounds(panel, left, top, width, height);
        setBounds(ghostPanel, left, top, width, height);

        self.resizes.fire(width, height);
    }

    function onUp(e) {
        calculateBounds(e);

        if (pointerStart && pointerStart.isMoving) {
            // Snap
            snapType = checkSnapType();
            if (snapType) {
                preSnapped = {
                    width: bounds.width,
                    height: bounds.height,
                    top: bounds.top,
                    left: bounds.left,
                };

                resizeEdges();
            } else {
                preSnapped = null;
            }

            hideGhostPane();
        }

        pointerStart = null;
    }

    function init() {
        window.addEventListener('resize', function () {
            resizeEdges();
        });

        setBounds(panel, 0, 0, LayoutParameters.width, LayoutParameters.height);
        setBounds(ghostPanel, 0, 0, LayoutParameters.width, LayoutParameters.height);

        // Mouse events
        panel.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Touch events
        panel.addEventListener('touchstart', onTouchDown);
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);

        bounds = panel.getBoundingClientRect();
        snapType = SNAP_DOCK_BOTTOM;

        // use setTimeout as a hack to get dimensions correctly! :(
        setTimeout(() => {
            resizeEdges();
            panel.style.display = 'none';
            ghostPanel.style.display = 'none';
        });

        hideGhostPane();
        animate();
    }

    init();
}

export {DockingWindow}