angular.module('milestones')

.directive('lmDatePicker', function() {
    return {
        restrict: 'E',
        required: 'ngModel',
        scope: {
            level: '@',
            ngModel: '='
        },
        templateUrl: 'dataRelease/datePicker/datePicker.html',
        link: function(scope, element, attrs) {
            scope.format = 'MM/dd/yyyy';
            scope.open = function($event) {
                $event.preventDefault();
                $event.stopPropagation();
                scope.opened = true;
            };
        }
    };
});
