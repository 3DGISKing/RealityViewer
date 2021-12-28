import {postOverridePotree} from "./override/postOverridePotree.js";

function initialize(viewer) {
    postOverridePotree(viewer);
    enableObjectSelectionInSceneTreeByInputHandler(viewer);
}

function enableObjectSelectionInSceneTreeByInputHandler(viewer) {
    // when the user selects an object in the scene,
    // make the object is selected also in the scene tree of the sidebar.

    viewer.inputHandler.addEventListener('selection_changed', (e) => {
        if (e.selection.length === 1) {
            const object = e.selection[0];

            if(!object.node)
                return;

            const tree = jQuery("#jstree_scene");

            object.selectedByInputHandler = true;


            tree.jstree(true).deselect_all(true);
            tree.jstree(true).select_node(object.node);
        }
        else {
            // do nothing
        }
    });
}

export {initialize}