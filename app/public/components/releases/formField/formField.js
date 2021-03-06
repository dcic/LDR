(function() {
  'use strict';

  angular
    .module('ldr')
    .directive('ldrFormField', ldrFormField);

  /* @ngInject */
  function ldrFormField(metadata) {
    return {
      restrict: 'E',
      required: 'ngModel',
      scope: {
        title: '@',
        name: '@',
        maxTags: '@',
        placeholder: '@',
        useAutocomplete: '@',
        autocompleteOnly: '@',
        allowSelectMultiple: '@',
        autocompleteEndpoint: '@',
        autocompleteSource: '=',
        ngModel: '=',
        isRequired: '@',
        showErrors: '='
      },
      templateUrl: 'partials/formField.html',
      controller: LDRFormFieldController,
      controllerAs: 'vm',
      bindToController: true
    };

    /* @ngInject */
    function LDRFormFieldController(lodash, metadata) {

      var vm = this;
      vm.addNew = addNew;
      vm.selectMultiple = selectMultiple;

      function selectMultiple() {
        metadata
          .selectMultiple(vm.name)
          .then(function(selectedSamples) {
            if (lodash.isArray(vm.ngModel)) {
              // Combine all results and then remove objects with duplicate ids
              var allOpts = vm.ngModel.concat(selectedSamples);
              vm.ngModel = lodash.uniq(allOpts, 'name');
            } else {
              console.error('Tried to select multiple samples but ngModel'
                + 'is not an array!');
            }
          });

      }

      function addNew(newTag) {
        if (!newTag.newField) {
          return true;
        }
        metadata
          .addNew(newTag, vm.name, vm.ngModel, vm.element)
          .then(function() {}, function() {
            // Modal was dismissed
            vm.ngModel.splice(vm.ngModel.length - 1, 1);
          });
      }
    }
  }
})();
