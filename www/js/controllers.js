angular.module('anonument', [])

.controller('homeCtrl', function($scope){
	//don't really need much here
})
.controller('createCtrl', function($scope, $ionicPlatform, $cordovaGeolocation) {
	/* Converts an HSL color value to RGB. Conversion formula
	* adapted from http://en.wikipedia.org/wiki/HSL_color_space.
	* Assumes h, s, and l are contained in the set [0, 1] and
	* returns r, g, and b in the set [0, 255]. (Thanks SO)*/
	$scope.toRGB = function hslToRgb(h, s, l){
		var r, g, b;

		if(s == 0){
			r = g = b = l; // achromatic
		}else{
			var hue2rgb = function hue2rgb(p, q, t){
			if(t < 0) t += 1;
			if(t > 1) t -= 1;
			if(t < 1/6) return p + (q - p) * 6 * t;
			if(t < 1/2) return q;
			if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			return p;
		}

		var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		var p = 2 * l - q;
		r = hue2rgb(p, q, h + 1/3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1/3);
		}

		var rgb = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
		return "rgb("+rgb[0]+", "+rgb[1]+", "+rgb[2]+")";
	};
	//refresh when changing sliders
	$scope.refreshColor = function(){
		$scope.create_color = $scope.toRGB($scope.data.hue/100, $scope.data.sat/100, 0.6);
	};
	//post the monument to parse
	$scope.submit = function(){
		//save the point in Parse and show the comment thread
		var Monument = Parse.Object.extend("monuments");
		var Comment = Parse.Object.extend("comments");

		//run the query!
		var m = new Monument();
		m.set("title", $scope.data.title);
		m.set("mood_color", $scope.create_color);
		m.set("views", 0);
		m.set("location", new Parse.GeoPoint($scope.loc.latitude, $scope.loc.longitude));
		var parseError = function(ob, err){
			console.log('Parse Error:', err);
			alert('Could not save point, connection error: ', err);
		}
		m.save(null, {
			success:function(ob) {
				//save first comment as well
				var c = new Comment();
				c.set("monument", ob);
				c.set("comment", $scope.data.comment);
				c.save(null, {
					success: function(ob){
						//TODO: take to comment thread page

					}, error: parseError
				});
			},
			error: parseError
		});
	};
	//defaults
	$scope.data = {
		title: "",
		comment: "",
		hue: 70,
		sat: 35
	};
	$scope.loc = null;
	$scope.refreshColor();
	//GPS location watch
	$scope.$on('$ionicView.enter', function(){
		var watchOptions = {
			frequency : 1000,
			timeout : 10000,
			enableHighAccuracy: true // may cause errors if true
		};
		$scope.gps_watch = $cordovaGeolocation.watchPosition(watchOptions);
		$scope.gps_watch.then(
			null,
			function(err) {
				// error
				console.log('GPS Error', err);
			},
			function(position) {
				$scope.loc = position.coords;
				console.log('coord:', $scope.loc);
			});
	});
	//Unbind GPS watch on page exit
	$scope.$on('$ionicView.leave', function(){
		$cordovaGeolocation.clearWatch($scope.gps_watch);
	});
})
.controller('findCtrl', function($scope, $cordovaGeolocation){
	$scope.pos_geopoint = null;
	$scope.map = null;
	$scope.monument = null;
	//uses current user location and initializes the map
	$scope.initMap = function(){
		//create a google map
		var latLng = new google.maps.LatLng($scope.pos_geopoint._latitude, $scope.pos_geopoint._longitude);
		var mapOptions = {
			center: latLng,
			zoom: 15,
			disableDefaultUI: true,		//hide all controls
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		//add a position marker for the user
		var pos_img = $scope.createColorMarker('blue', 15, 0);
		$scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);
		var pos_marker = new google.maps.Marker({
			map: $scope.map,
			position: latLng,
			icon: pos_img
		});
		//query parse for nearby monuments and display
		$scope.showNearbyMonuments();
	}
	//gets all nearby monuments and shows them
	$scope.showNearbyMonuments = function(){
		//response functions
		var parse_error = function(error) {
			alert("Could not get monuments: " + error.code + " " + error.message);
		};
		var monuments_success = function(results) {
			//add markers for each result
			for (var i = 0; i < results.length; i++) {
				var get_comments = function(index){
					var r = results[i];
					//run the query for comments
					var Comments = Parse.Object.extend('comments');
					var query = new Parse.Query(Comments);
					query.equalTo("monument", results[i]);
					query.count({
						success: function(num){
							r.comments_str = num + " Comment";
							//check dat grammar yo
							if(num != 1){ r.comments_str += "s"; }
							var m_loc = r.get('location');
							var m_latlng = new google.maps.LatLng(m_loc.latitude, m_loc.longitude);
							var m_img = $scope.createColorMarker(r.get('mood_color'), 16, 4);
							var marker = new google.maps.Marker({
								map: $scope.map,
								position: m_latlng,
								icon: m_img,
								monument: r
							});
							marker.addListener('click', $scope.monumentDetails);
						},
						error: parse_error
					});
				}
				get_comments(i);
			}
		};
		//run the query for monuments
		var Monument = Parse.Object.extend("monuments");
		var query = new Parse.Query(Monument);
		query.near("location", $scope.pos_geopoint);
		query.limit(50);	//at most 50 results
		query.find({
			success: monuments_success,
			error: parse_error
		});
	};
	//draw a colored circle with a border and save as a data URI
	$scope.createColorMarker = function(color, size, border_size){
		var canvas = document.createElement('canvas');
		canvas.width =  size + border_size;
		canvas.height = size + border_size;
		var ctx = canvas.getContext('2d');
		ctx.imageSmoothingEnabled = false;
		//draw black border
		ctx.fillStyle = 'black';
		ctx.beginPath();
		ctx.arc(
			(size+border_size)/2, 		//x
			(size+border_size)/2, 		//y
			(size+border_size)/2, 		//radius
			0, 							//start angle
			Math.PI*2					//end angle
		);
		ctx.closePath();
		ctx.fill();
		//draw colored filling (mmmmmm....filling)
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(
			(size+border_size)/2, 		//x
			(size+border_size)/2, 		//y
			size/2, 					//radius
			0, 							//start angle
			Math.PI*2					//end angle
		);
		ctx.closePath();
		ctx.fill();
		return canvas.toDataURL();
	};
	//show details about the monument
	$scope.monument_detail = false;
	$scope.monumentDetails = function(){
		var m = this;
		$scope.map.setZoom(18);
		setTimeout(function(){
			//trigger the resize event since it doesn't seem to notice
			google.maps.event.trigger($scope.map, "resize");
			$scope.map.panTo(m.position);
		}, 500);
		$scope.monument_detail = true;
		$scope.monument = m.monument;
		$scope.updateMonumentDist();
		$scope.$apply();
	};
	//update the distance and the status string of the selected monument
	$scope.updateMonumentDist = function(){
		//calc distance to monument
		var km = $scope.monument.get('location').kilometersTo($scope.pos_geopoint);
		$scope.monument.distance = parseInt(km * 1000);
		if($scope.monument.distance > 10){
			$scope.monument.status = "Only "+$scope.monument.distance+"m to go";
		}else{
			$scope.monument.status = "View";
		}
	}
	//get location on page enter
	$scope.$on('$ionicView.enter', function(){
		var watchOptions = {
			frequency : 1000,
			timeout : 10000,
			enableHighAccuracy: true // may cause errors if true
		};
		$scope.gps_watch = $cordovaGeolocation.watchPosition(watchOptions);
		$scope.gps_watch.then(
			null,
			function(err) {
				// error
				console.log('GPS Error', err);
			},
			function(position) {
				//set user location
				$scope.pos_geopoint = new Parse.GeoPoint(position.coords);
				//init map if needed
				if($scope.map == null){
					$scope.initMap()
				}
				//update selected monument distance if needed
				if($scope.monument != null){
					$scope.updateMonumentDist();
				}
				//$scope.$apply();		//who knows maybe I don't need it
				console.log('coord:', $scope.pos_geopoint);
			});
	});
	//Unbind GPS watch on page exit
	$scope.$on('$ionicView.leave', function(){
		console.log('leaving...');
		$cordovaGeolocation.clearWatch($scope.gps_watch);
	});
});
