angular.module( 'milestonesLanding.login', [
    'ui.router',
    'angular-storage'
])
.config(function($stateProvider) {
    $stateProvider.state('login', {
        url: '/login',
        controller: 'LoginCtrl',
        templateUrl: 'views/login.html'
    });
})
.controller('LoginCtrl', function LoginController($scope, $http, store, $state) {

    $scope.user = {};
    $scope.login = function() {
        $http({
            url: base + 'login',
            method: 'POST',
            data: $scope.user
        }).then(function(result) {
            // No error: authentication OK
            store.set('currentUser', result.data.user);
            store.set('jwt', result.data.id_token);
            $state.go('forms');
        }, function(error) {
            // Error: authentication failed
            store.set('message', 'Authentication failed.');
            alert('Login was unsuccessful. Please try again.');
        });
    };

});