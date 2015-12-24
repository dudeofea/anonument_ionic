angular.module('anonument', [])

.controller('homeCtrl'  , function($scope){
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
		//TODO: possibly replace this with just blocking the POST button
		if($scope.data.title == ""){
			alert('Please enter a title');
			return;
		}
		if($scope.data.comment == ""){
			alert('Please enter a comment');
			return;
		}
		//save the point in Parse and show the comment thread
		var Monument = Parse.Object.extend("monuments");
		var Comment = Parse.Object.extend("comments");

		//run the query!
		var m = new Monument();
		m.set("title", $scope.data.title);
		m.set("mood_color", $scope.create_color);
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
})
.controller('findCtrl'  , function($scope, $cordovaGeolocation){
	//get location first, then center map around that
	var options = {timeout: 10000, enableHighAccuracy: true};
	$cordovaGeolocation.getCurrentPosition(options).then(function(position){
		//create a google map
		var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
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
		//query parse for nearby monuments
		var Monument = Parse.Object.extend("monuments");
		var pos_geopoint = new Parse.GeoPoint(position.coords);
		var query = new Parse.Query(Monument);
		query.near("location", pos_geopoint);
		query.limit(50);	//at most 50 results
		query.find({
			success: function(results) {
				// Do something with the returned Parse.Object values
				for (var i = 0; i < results.length; i++) {
					var r = results[i];
					var m_loc = r.get('location');
					var m_latlng = new google.maps.LatLng(m_loc.latitude, m_loc.longitude);
					var m_img = $scope.createColorMarker(r.get('mood_color'), 16, 4);
					new google.maps.Marker({
						map: $scope.map,
						position: m_latlng,
						icon: m_img
					});
				}
			},
			error: function(error) {
				alert("Could not get monuments: " + error.code + " " + error.message);
			}
		});
	}, function(error){
		console.log("Could not get location");
	});
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
});
