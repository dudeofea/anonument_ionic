angular.module('anonument', [])

.controller('CreateCtrl', function($scope, $ionicPlatform, $cordovaGeolocation) {
	/* Converts an HSL color value to RGB. Conversion formula
	* adapted from http://en.wikipedia.org/wiki/HSL_color_space.
	* Assumes h, s, and l are contained in the set [0, 1] and
	* returns r, g, and b in the set [0, 255].*/
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
	$scope.refreshColor = function(){
		$scope.create_color = $scope.toRGB($scope.data.hue/100, $scope.data.sat/100, 0.6);
	};
	$scope.submit = function(){
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
						//take to comment thread page

					}, error: parseError
				});
			},
			error: parseError
		});
	};
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
});
