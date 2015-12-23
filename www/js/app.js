// Ionic Starter App

//Init Parse Keys
Parse.initialize('yuRBoDhzewR97zctSJeKBZWdv3UFeiPTt7y3zvoJ',		//Application ID
				 'K0qtZ0NsTuhoTM22k0otm29UxBUjxJzncFmxvJwR');		//JS key

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'anonument', 'ngCordova'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js

  // setup an abstract state for the anonument directive
  $stateProvider.state('anonument', {
    url: '/anonument',
    abstract: true,
    templateUrl: 'templates/main.html'
  })

  // Each tab has its own nav history stack:
  var pages = ['home', 'create', 'find'];
  for (var i = 0; i < pages.length; i++) {
  $stateProvider.state('anonument.'+pages[i], {
		url: '/'+pages[i],
		views: {
			'main-view': {
				templateUrl: 'templates/'+pages[i]+'.html',
				controller: pages[i]+'Ctrl'
			}
		}
	});
  }

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/anonument/home');

}).config(function($ionicConfigProvider) {
  // remove back button text completely
  $ionicConfigProvider.backButton.previousTitleText(false).text('');
});
