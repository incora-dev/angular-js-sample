const DEFAULT_START_INDEX = 0;
const DEFAULT_MAX_COUNT = 30;

export default class AdminParserCtrl {

  /*@ngInject*/
  constructor($scope, $state, parserApi, displayError, autosave, access, userApi) {
    $scope.parserApi = parserApi;
    $scope.autosave = autosave;
    $scope.tasks = {
      list: null,
      hasMore: false,
      showMore,
      showMoreProcessing: true,
    };

    $scope.runParser = runParser;

    activate();

    function activate() {
      userApi.getCurrentUser().then((currentUser) => {
        if (!access.isSuper(currentUser)) {
          $state.go('admin');
        }
      });
      updateTaskList(DEFAULT_START_INDEX);
    }

    function showMore() {
      const startIndex = DEFAULT_START_INDEX + $scope.tasks.list.length;
      updateTaskList(startIndex, true);
    }

    function updateTaskList(startIndex, addToExistingList) {
      $scope.tasks.showMoreProcessing = true;
      parserApi.getTasks({ limit: DEFAULT_MAX_COUNT + 1, offset: startIndex })
        .then(success)
        .catch(fail)
        .finally(() => {
          $scope.tasks.showMoreProcessing = false;
        });

      function success(list) {
        $scope.tasks.hasMore = list.length > DEFAULT_MAX_COUNT;
        const newTasks = list.slice(DEFAULT_START_INDEX, DEFAULT_MAX_COUNT);
        if (addToExistingList) {
          // We want to keep using the original array, so let's just add
          // all the new requisitions
          _.each(newTasks, (task) => {
              $scope.tasks.list.push(task);
          });
        } else {
          $scope.tasks.list = newTasks;
        }
      }

      function fail(status) {
        displayError(status);
      }
    }

    const maxIterationsAllowed = 10;
    let iterationsDone = 0;

    function runParser() {
      const {
        companyName,
        location,
      } = $scope;

      iterationsDone = 0;
      $scope.parserApi.runParser({ companyName, location }).then(({ id }) => getResults(id));

    }

    function getResults(id) {
      $scope.parserApi.getResults(id).then((task) => {
        const {
          companyName,
          location,
        } = $scope;
        $scope.task = task;

        ++iterationsDone;
        $scope.isTimeoutReached = iterationsDone === maxIterationsAllowed;
        if ($scope.task.status === 1 && !$scope.isTimeoutReached) {
          setTimeout(() => getResults(id), 3000);
        }
      });
    }
  }
}

