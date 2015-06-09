angular.module('ldr.user.registration', [
    'ui.router',
    'ldr.api',
    'ngLodash'
])

    .config(function($stateProvider) {
        $stateProvider.state('userRegistration', {
            url: '/user/registration',
            controller: 'RegisterCtrl',
            templateUrl: 'user/registration/registration.html',
            data: {
                loggedIn: true
            }
        });
    })

    .directive('usernameAvailable', function($timeout, $q, lodash) {
        return {
            require: 'ngModel',
            link: function(scope, element, attrs, ctrl) {
                ctrl.$asyncValidators.username = function(modelValue) {
                    if (ctrl.$isEmpty(modelValue)) {
                        return $q.when();
                    }

                    var def = $q.defer();
                    $timeout(function() {
                        // Mock a delayed response

                        var lcUsers = lodash.map(scope.userList,
                            function(name) {
                                return name.toLowerCase();
                            });
                        if (lcUsers.indexOf(modelValue.toLowerCase()) === -1) {
                            // The username is available
                            def.resolve();
                        } else {
                            def.reject();
                        }
                    }, 1000);
                    return def.promise;
                };
            }
        };
    })

    .controller('RegisterCtrl', function LoginController($rootScope, $scope, $http, store, $state, api, lodash) {

        // TODO: Validation of registration form (Partially there)
        $scope.groups = [];
        $scope.userList = [];

        api('groups/').get().success(function(data) {
            $scope.groups = lodash.filter(data, function(obj) {
                return obj.name !== 'NIH'
            });
        });

        api('users/').get().success(function(data) {
            $scope.userList = lodash.map(data, 'username');
        });

        $scope.reset = function(form) {
            if (form) {
                form.$setPristine();
                form.$setUntouched();
            }
            $scope.user = {
                username: '',
                password: '',
                passwordConfirm: '',
                firstName: '',
                lastName: '',
                email: '',
                group: {
                    name: ''
                },
                location: '',
                fieldOfStudy: '',
                homepage: 'http://'
            };
        };

        $scope.createUser = function() {
            // Combine first and last name into one name field
            $scope.user.name = $scope.user.firstName + ' ' +
                $scope.user.lastName;
            $http.post('/LDR/register', $scope.user)
                .success(function(response) {
                    alert('User created successfully');
                    $scope.setCurrentUser(response.user, response.id_token);
                    $state.go('home');
                });
        };

        $scope.reset();
    });