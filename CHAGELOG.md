# Change Log

### [2.3.1] - 2021-05-28
#### Fixed
  - first person left mouse error. [#58](https://github.com/venuedb/viewer/issues/59)
  
#### Added
  - Add the logic check if potree was modified.
  - Add  modified potree build output to the npm package.   

### [2.3.0] - 2021-05-27
#### Updated
  - Remove assets from build output. [#58](https://github.com/venuedb/viewer/issues/58)

### [2.2.9] - 2021-05-22
#### Updated
  - Use GitHub packages for viewer plugin. [#57](https://github.com/venuedb/viewer/issues/57)

### [2.2.8] - 2021-05-07
#### Fixed
  - Camera Position Missing in Info Bar #52(needed to import ES6 three threejs). [#52](https://github.com/venuedb/viewer/issues/52)
  
### [2.2.7] - 2021-05-06
#### Fixed
  - Fixed errors in Release build(BigInt, rm, rf). [#55](https://github.com/venuedb/viewer/issues/55)

### [2.2.6] - 2021-05-05
#### Fixed
  - Consider the signed S3 url. [#54](https://github.com/venuedb/venuedb/issues/54)
  - Remove circular dependencies.
    
### [2.2.5] - 2021-05-02
#### Fixed
  - Can 't type in the html input. [#12](https://github.com/venuedb/venuedb/issues/12)

### [2.2.4] - 2021-04-21
#### Fixed
  - Fixing measurements to the original version [#53](https://github.com/venuedb/viewer/issues/53)

### [2.2.3] - 2021-04-16
#### Added
  - Rotation speed in first person should be a separate variable than in third person. [#49](https://github.com/venuedb/viewer/issues/49)
  
#### Fixed
  - pan speed does n't update the distance factor when using other movements than the mouse wheel. [#49](https://github.com/venuedb/viewer/issues/49)  

### [2.2.2] - 2021-04-16
#### Fixed
  - Navigation Rotation bug with clipping volume. [#51](https://github.com/venuedb/viewer/issues/51)

### [2.2.1] - 2021-04-15
#### Fixed
  - Symbols for scaling moving and rotation are missing in clipping volume. [#48](https://github.com/venuedb/viewer/issues/48)

### [2.2.0] - 2021-04-09
#### Fixed
  - Orthographic View Pointcloud disappears. [#50](https://github.com/venuedb/viewer/issues/50)

### [2.1.9] - 2021-04-06
#### Fixed
  - Adjust Navigation Speeds. [#49](https://github.com/venuedb/viewer/issues/49)

### [2.1.8] - 2021-04-05
#### Fixed
  - Measurements are not set correctly inside the viewer. [#47](https://github.com/venuedb/viewer/issues/47)

### [2.1.7] - 2021-03-09
#### Added
  - 2d dxf export. [#15](https://github.com/venuedb/viewer/issues/15)
  
  ##### API usage
  
          // Reality.debugShowProjectPlaneForBoxVolume(scene, volume);
  
          Reality.setDfxExportOptions({
              projectBox: volume,
              rotationAngle: 180,
              useAutomaticTextHeight: false,
              textHeight: 8,
              annotationColor: 0x0000ff,
              color: 0x00ff00
          });
  
          Reality.export2DDxf(viewer, "sample.dxf", false);

### [2.1.6] - 2021-03-08
#### Changed
  - Can we change the folder structure so that potree & the viewer plugin are on the same level. [#42](https://github.com/venuedb/viewer/issues/42)

### [2.1.5] - 2021-03-05
#### Fixed
  - No need to show the animation editor for the object that the user can't move. [#40](https://github.com/venuedb/viewer/issues/40)

### [2.1.4] - 2021-03-04
#### Fixed
  - Change 3rd Person Navigation Right Mouse Button / Ctrl + Left Mouse Button. [#36](https://github.com/venuedb/viewer/issues/36)

### [2.1.3] - 2021-03-04
#### Fixed
  - TransformationTool bug. [#38](https://github.com/venuedb/viewer/issues/38)

### [2.1.2] - 2021-03-04
#### Fixed
  - Animation widget obstructs the navigation by mouse. [#39](https://github.com/venuedb/viewer/issues/39)

### [2.1.1] - 2021-03-03
#### Added
  - loader priority. [#30](https://github.com/venuedb/viewer/issues/30)

### [2.1.0] - 2021-03-03
#### Added
  - export/import. [#31](https://github.com/venuedb/viewer/issues/31)
    - export/import animation data of the image, video, box volume
    - export/import animation data of the perspective camera
    - fix error in exporting an image transformEnabled property
    - export/import classification
    - export/import clip task, background, minNodeSize, showBoundingBox setting
    - export/import profile 
    - update sample.json
    - update export example
  

### [2.0.9] - 2021-02-26
#### Fixed  
  - 3rd person controller has no function on the right mouse button. [#35](https://github.com/venuedb/viewer/issues/35)

### [2.0.8] - 2021-02-25
#### Changed
  - We need to load our customized i18n translation file for our interface elements. [#32](https://github.com/venuedb/viewer/issues/32)
  
#### Fixed  
  - Remove image button does not work. [#33](https://github.com/venuedb/viewer/issues/33)
  
#### Added
  - browser hot reload  

### [2.0.7] - 2021-02-15
#### Changed
  - We need to set custom moving speed to moving by WASDRF keys. [#29](https://github.com/venuedb/viewer/issues/29)
  - update Reality API usage
   
          Reality.preOverridePotree();
          window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
          Reality.initialize(viewer);
    
  
#### Fixed  
  - Fixed a bug where the title of Reality First Person Control and Reality Third Person Control does not show in the sidebar.
  - Fixed a bug where the InputHandler does not give control key and mouse button for MouseDown and MouseMove event.
  
#### Added
  - add a example for navigationSpeed.html      

### [2.0.6] - 2021-02-10
#### Fixed
  - Can't select an object with a first mouse click as soon as the app starts. [#26](https://github.com/venuedb/viewer/issues/26)
  - Bug in node selection logic of the scene tree by input handler. [#28](https://github.com/venuedb/viewer/issues/28)
  - Fixed a bug where user selects root nodes such as Point Clouds, Measurements, Annotations, and Others .. in the scene tree.
  
#### Other  
  - Animation editor will not show when the app starts. 
  - When the user selects an point cloud in the scene tree in the sidebar, the animation editor will not show.
  - Converts docking_window.js from ES5 style to the ES6.    

### [2.0.5] - 2021-02-10
#### Added
  - delete object in scene tree

### [2.0.4] - 2021-02-09
#### Fixed
  - remove weird add key frame logic

### [2.0.3] - 2021-02-09
#### Fixed
  - revert object when the user remove all key frames in animation editor

### [2.0.2] - 2021-02-08
#### Added
  - update object switching logic

### [2.0.1] - 2021-02-08
#### Added
  - scale animation

### [2.0.0] - 2021-02-08
#### Changed
  - Stop tracking of potree source

### [1.7.1.15] - 2021-01-29
#### Added
  - Test reality plugin structure.

### [1.7.1.14] - 2021-01-28
#### Fixed
  - If a User uses the export function in the main menu it generates a new box and everything works fine
    but when i select a different box and use the export button in the details menu of this box it still uses the generated one before.

### [1.7.1.13] - 2021-01-05
#### Added
  - control audio volume based on the distance to the camera.

### [1.7.1.12] - 2021-01-04
#### Added
  - animation editor

### [1.7.1.11] - 2020-12-21
#### Added
  - add web camera video

### [1.7.1.10] - 2020-12-21
#### Added
  - add distance_to_camera example
     
### [1.7.1.9] - 2020-12-18
#### Fixed
  - adjust mobile navigation parameter
     increase two finger zoom speed by 5 times.
     decrease first person rotation by nearly 7 times
   
   - fix some error in mobile navigation


### [1.7.1.8] - 2020-12-18
#### Changed
 - update Measure.getArea to calculate correct area
   The latest Cesiumjs need to be included.
 
### [1.7.1.7] - 2020-12-18
#### Changed
 - split original CustomControls to FirstPersonControls and ThirdPersonControls
 - switch left and right drag logic FirstPersonControls and ThirdPersonControls

### [1.7.1.6] - 2020-12-17
#### Added
 - add transformEnabled to the Video class
 - add play/pause switching logic by mousedown event
 - add video example html 

### [1.7.1.5] - 2020-12-16
#### Added
 - video image
   for now supports only local video file. 

### [1.7.1.4] - 2020-12-15
#### Added
 - quality parameter in LAS export

### [1.7.1.3] - 2020-12-14
#### Added
 - Image

### [1.7.1.2] - 2020-12-10
#### Added
 - LAS export

### [1.7.1.1] - 2020-11-24

#### Fixed
 - Detect GL extension
 
#### Added
 - this 

#### Added
#### Fixed
#### Changed