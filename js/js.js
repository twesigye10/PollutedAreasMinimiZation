require([
            "esri/Map",
            "esri/views/MapView",
            "esri/widgets/Home",
            "esri/widgets/Locate",
            "esri/widgets/Search",
            "esri/layers/FeatureLayer",
            "esri/layers/MapImageLayer",
            "esri/widgets/BasemapToggle",
            "esri/Graphic",
            "esri/layers/GraphicsLayer",
            "esri/tasks/RouteTask",
            "esri/tasks/support/RouteParameters",
            "esri/tasks/support/FeatureSet",
            "esri/tasks/support/DataFile",
            "esri/tasks/support/Query",
            "esri/widgets/Legend",
            "dojo/dom-construct",
            "esri/core/urlUtils",
            "dojo/on",
            "dojo/dom",
            "dojo/domReady!"
        ], function(
            Map, MapView, Home, Locate, Search, FeatureLayer, MapImageLayer,
            BasemapToggle, Graphic, GraphicsLayer, RouteTask, RouteParameters, FeatureSet,
            DataFile, Query, Legend, domConstruct, urlUtils, on, dom
        ) {

            // UJIs Geotech route service URL
            var routeTask = new RouteTask({
                url: "https://geotec.init.uji.es/arcgis/rest/services/routing/SpainNetwork/NAServer/Route"
            });
            // Layer for all graphics
            var routeLyr = new GraphicsLayer();
            // Service URL and data type variables
            var fLyUrl = "https://services1.arcgis.com/k8WRSCmxGgCwZufI/arcgis/rest/services/madridPollutionSurface/FeatureServer/"
            var barQType = "/query?where=1%3D1&returnGeometry=true&f=json"
            // Route parameters definition
            var routeParams = new RouteParameters({
                stops: new FeatureSet(),
                impedanceAttributeName: "Kilometers",
                outSpatialReference: {
                    wkid: 3857
                }
            });
            // test for existance of features in layers to be used as barriers(poor and veryPoor categories)
            const polBarrier1 = new FeatureLayer({
                url: fLyUrl + "2" // points to the poor category layer
            });
            const query1 = new Query();
            query1.where = "Classes = 2";
            query1.outSpatialReference = {
                wkid: 3857
            };
            query1.returnGeometry = true;
            polBarrier1.queryFeatures(query1).then(function(results) {
                var tone2 = results.features.length; // the length of features
                if (tone2 > 0) {
                    routeParams = new RouteParameters({
                        stops: new FeatureSet(),
                        polygonBarriers: new DataFile({
                            url: fLyUrl + "2" + barQType
                        })
                    })
                }
            });

            const polBarrier2 = new FeatureLayer({
                url: fLyUrl + "3" // points to the very poor category layer
            });
            const query2 = new Query();
            query2.where = "Classes = 3";
            query2.outSpatialReference = {
                wkid: 3857
            };
            query2.returnGeometry = true;
            polBarrier2.queryFeatures(query2).then(function(results) {
                var tone3 = results.features.length; // the length of features
                if (tone3 > 0) {
                    routeParams = new RouteParameters({
                        stops: new FeatureSet(),
                        polygonBarriers: new DataFile({
                            url: fLyUrl + "3" + barQType
                        })
                    })
                }
            });

            // Stops symbology
            var stopSymbol = {
                type: "simple-marker",
                style: "circle",
                color: "blue",
                size: 5,
                outline: {
                    color: "blue",
                    width: 2
                }
            };
            // Route symbology
            var routeSymbol = {
                type: "simple-line",
                color: [0, 0, 255, 0.5],
                width: 5
            };
            // Map
            var map = new Map({
                basemap: "streets",
                layers: [routeLyr]
            });
            // view
            var view = new MapView({
                container: "viewDiv",
                map: map,
                padding: {
                    top: 30
                },
                extent: { // default view extent
                    xmin: -432920,
                    ymin: 4911390,
                    xmax: -391620,
                    ymax: 4959870,
                    spatialReference: 3857
                }
            });

            // Add feature Layers
            var ftLyr1 = new FeatureLayer({
                url: fLyUrl + "0"
            });
            ftLyr1.refreshInterval = 2;
            map.add(ftLyr1);

            var ftLyr2 = new FeatureLayer({
                url: fLyUrl + "1"
            });
            ftLyr2.refreshInterval = 2;
            map.add(ftLyr2);

            var ftLyr3 = new FeatureLayer({
                url: fLyUrl + "2"
            });
            ftLyr3.refreshInterval = 2;
            map.add(ftLyr3);

            var ftLyr4 = new FeatureLayer({
                url: fLyUrl + "3"
            });
            ftLyr4.refreshInterval = 2;
            map.add(ftLyr4);

            // Home button
            var homeBtn = new Home({
                view: view
            });
            // Add the home button to the left of the view
            view.ui.add(homeBtn, {
                position: "top-left",
                top: "70px"
            }, {
                index: 0
            });
            // Location button
            var locateBtn = new Locate({
                view: view
            });
            // Adding the location button on the view ui
            view.ui.add(locateBtn, {
                position: "top-left"
            }, {
                index: 1
            });
            // Search button
            var searchWidget = new Search({
                view: view
            });
            // Adding the search button on the view ui
            view.ui.add(searchWidget, {
                position: "top-right"
            }, {
                index: 0
            });
            // toggle the basemap
            var toggle = new BasemapToggle({
                view: view, // view that provides access to the basemap
                nextBasemap: "hybrid" // second basemap
            });
            // Add the toggle widget
            view.ui.add(toggle, "top-right", {
                index: 1
            });
            // logo
            var logo = domConstruct.create("img", {
                src: "img/MLAQI.png?&w=100&h=80",
                id: "logo"
            });
            view.ui.add(logo, "bottom-right");

            // Button events
            on(dom.byId("addStops"), "click", activateStop);
            on(dom.byId("solveRoute"), "click", activateSolve);
            on(dom.byId("ClearRouteParams"), "click", clearRoutes);

            // connect the stops button and the view click event
            var addStopsConnect;

            function activateStop() {
                removeEventHandlers();
                addStopsConnect = on(view, "click", addStop);
            }
            // activate the solve route button
            function activateSolve() {
                // Execute the route task with atleat 2 stops
                if (routeParams.stops.features.length >= 2) {
                    routeTask.solve(routeParams).then(showRoute);
                }
            }
            // Adding stops event
            function addStop(event) {
                // Add a stop on the map click
                var stop = new Graphic({
                    geometry: event.mapPoint,
                    symbol: stopSymbol
                });
                routeLyr.add(stop);
                // push the stops to the route parameters
                routeParams.stops.features.push(stop);
            }
            // Adds solved route on map
            function showRoute(data) {
                var routeResult = data.routeResults[0].route;
                routeResult.symbol = routeSymbol;
                routeLyr.add(routeResult);
                removeEventHandlers();
            }
            //Clears all stops
            function clearStops() {
                removeEventHandlers();
                for (var i = routeParams.stops.features.length - 1; i >= 0; i--) {
                    routeLyr.remove(routeParams.stops.features.splice(i, 1)[0]);
                }
            }
            // remove all stops and routes
            function clearRoutes() {
                clearStops();
                routeLyr.removeAll();
                routeLyr.graphics = [];
            }
            // remove event handlers
            function removeEventHandlers() {
                if (addStopsConnect) {
                    addStopsConnect.remove();
                }
            }

        });