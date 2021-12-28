RealityViewer is a JavaScript plugin library for extending [official potree](https://github.com/potree/potree).
  
#### How to use use?   
   include Reality.js.
   ```
   <script src="../build/reality.js"></script>
   ```


   start your app with this code.
        
    Reality.preOverridePotree();
        
    window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
        
    Reality.initialize(viewer);

#### Start debugging
    yarn install
    yarn start
    
  then connect to localhost:3000
 
### How to release output
    yarn build
    
   then output will be generated under build_release 

#### Image
[![](http://img.youtube.com/vi/k9oqRnEPoiQ/0.jpg)](http://www.youtube.com/watch?v=k9oqRnEPoiQ "")
   
#### Video
 
[![](http://img.youtube.com/vi/OWpacthmOfI/0.jpg)](http://www.youtube.com/watch?v=OWpacthmOfI "")


#### las export

[![](http://img.youtube.com/vi/MayBCCr87zg/0.jpg)](http://www.youtube.com/watch?v=MayBCCr87zg "")


#### Animation editor1

[![](http://img.youtube.com/vi/TStCZtLJVQs/0.jpg)](http://www.youtube.com/watch?v=TStCZtLJVQs "")

#### Animation editor2

[![](http://img.youtube.com/vi/4TvGHsnn4Rc/0.jpg)](http://www.youtube.com/watch?v=4TvGHsnn4Rc "")

#### dxf export1 

[![](http://img.youtube.com/vi/HCuclkiYMEU/0.jpg)](http://www.youtube.com/watch?v=HCuclkiYMEU "")

#### dxf export2 

[![](http://img.youtube.com/vi/RC-u0scSZF0/0.jpg)](http://www.youtube.com/watch?v=RC-u0scSZF0 "")

