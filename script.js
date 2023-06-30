'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputStrokes = document.querySelector('.form__input--strokes');
const inputElevation = document.querySelector('.form__input--elevation');
const btnsCustomContainer = document.querySelector('.custom__btns');
const btnReset = document.querySelector('.btn--reset');
const btnForm = document.querySelector('.btn-_form');
const btnOk = document.querySelector('.form__btn');
const sortContainer = document.querySelector('.sort__buttons__container');
const sortDivider = document.querySelector('.sort__devider');
const showSortBtns = document.querySelector('.show__sort__btns');

class Workout {
  date = new Date();
  id = String(Date.now()).slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
class Swimming extends Workout {
  type = 'swimming';
  constructor(coords, distance, duration, strokes) {
    super(coords, distance, duration);
    this.strokes = strokes;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
//APPLICATION ARCHIRECTURE
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 14;
  #workouts = [];
  #markers = [];
  #workoutEdit;
  #flag = 0;
  lat;
  lng;

  constructor() {
    //Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Event handlers
    /*we bind every function to this scope becaue it's a call
    -back function, where this would otherwise point towards
    the object on which it was called*/
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    btnReset.addEventListener('click', this.reset);
    btnOk.addEventListener('change', this._newWorkout.bind(this));

    //sort event listener
    showSortBtns.addEventListener('click', this._toggleSortBtns.bind(this));
    sortContainer.addEventListener('click', this._sortAndRender.bind(this));
  }

  //Getting the user's position
  _getPosition() {
    /*accessing location using geolocation API, success and
    failure callback functions respectively*/
    if (navigator.geolocation) {
      //returns a coords object
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position!');
        }
      );
    }
  }

  //Load the map
  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const coords = [latitude, longitude];

    //we'll need a map element to store the rendered map
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //method from the leaflet library
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(
      function (el) {
        /*bind is very important here, calling _renderMarker 
        here only after the map has loaded*/
        this._renderWorkoutMarker(el);
      }.bind(this)
    );
  }

  //Showing the form
  _showForm(mapE) {
    //here'well get the co-ordinates of the clicked point
    this.#mapEvent = mapE;
    form.classList.remove('hidden');

    inputDistance.focus();
  }

  _hideForm() {
    //hide form + empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
    form.classList.add('hidden');
  }

  //Toggling the elevation form
  _toggleElevationField() {
    if (inputType.value == 'running') {
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputStrokes.closest('.form__row').classList.add('form__row--hidden');
    }
    if (inputType.value == 'cycling') {
      inputStrokes.closest('.form__row').classList.add('form__row--hidden');
      inputElevation.closest('.form__row').classList.add('form__row-hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    }
    if (inputType.value == 'swimming') {
      inputStrokes.closest('.form__row').classList.remove('form__row--hidden');
      inputElevation.closest('.form__row').classList.add('form__row-hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
    }
  }

  _showCustomButtons() {
    if (!localStorage) return;
    btnsCustomContainer.classList.remove('hidden');
  }

  _allPositive(a, b, c = 1) {
    if (a <= 0 || b <= 0 || c <= 0) return false;
    return true;
  }

  _validInput(a, b, c) {
    if (!Number.isFinite(a)) return false;
    if (!Number.isFinite(b)) return false;
    if (!Number.isFinite(c)) return false;
    return true;
  }

  //Creating the workouts
  _newWorkout(e) {
    console.log(e);
    if (e.type == 'submit') {
      e.preventDefault();

      //Get data from the form
      const type = inputType.value;
      const distance = Number(inputDistance.value);
      const duration = Number(inputDuration.value);

      if (this.#flag == 0) {
        this.lat = this.#mapEvent.latlng.lat;
        this.lng = this.#mapEvent.latlng.lng;
      }
      let workout;

      //If workout is Running, create Running object
      if (type === 'running') {
        const cadence = Number(inputCadence.value);

        //Check if the data is valid
        if (
          !this._validInput(distance, duration, cadence) ||
          !this._allPositive(distance, duration, cadence)
        ) {
          return alert('Input is not valid!');
        }
        workout = new Running(
          [this.lat, this.lng],
          distance,
          duration,
          cadence
        );
      }

      //If workout is Cycling, create Cycling object
      if (type === 'cycling') {
        const elevation = Number(inputElevation.value);

        //Check if the data is valid
        if (
          !this._validInput(distance, duration, elevation) ||
          !this._allPositive(distance, duration)
        ) {
          return alert('Input is not valid!');
        }
        workout = new Cycling(
          [this.lat, this.lng],
          distance,
          duration,
          elevation
        );
      }
      if (type === 'swimming') {
        const strokes = Number(inputStrokes.value);
        //Check if the data is valid
        if (
          !this._validInput(distance, duration, strokes) ||
          !this._allPositive(distance, duration, strokes)
        ) {
          return alert('Input is not valid!');
        }
        workout = new Swimming(
          [this.lat, this.lng],
          distance,
          duration,
          strokes
        );
      }
      if (this.#flag == 1) this._deleteWorkoutByObject(this.#workoutEdit);

      //Add the new object to the workout array
      this.#workouts.push(workout);

      // //Render workout on Map as marker
      this._renderWorkoutMarker(workout);

      //Render workout on list
      this._renderWorkout(workout);

      //Hide form + clear input fields
      this._hideForm();

      //Set local storage to all workouts
      this._setLocalStorage();

      //Showing the buttons
      if (btnsCustomContainer.classList.contains('hidden')) {
        this._showCustomButtons();
      }
    }
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${
          workout.type === 'running'
            ? '🏃'
            : workout.type === 'cycling'
            ? '🚴'
            : '🏊‍♀️'
        } ${workout.description}`
      )
      .openPopup();

    // Storing the markers
    this.#markers.push(marker);

    // Attaching the id with the marker
    marker.markID = workout.id;
  }

  _renderWorkout(workout) {
    const icon =
      workout.type === 'running'
        ? '🏃'
        : workout.type === 'cycling'
        ? '🚴'
        : '🏊‍♀️';
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__btns">
            <button class="workout__btn workout__btn--edit">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="workout__btn workout__btn--delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${icon}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
        `;
    if (workout.type === 'swimming')
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🏊🏻</span>
          <span class="workout__value">${workout.strokes}</span>
          <span class="workout__unit">/MIN</span>
        </div>
      </li>
          `;
    form.insertAdjacentHTML('afterend', html);
    const btnDelete = document.querySelector('.workout__btn--delete');
    const btnEdit = document.querySelector('.workout__btn--edit');
    btnDelete.addEventListener('click', this._deleteWorkout.bind(this));
    btnEdit.addEventListener('click', this._editWorkout.bind(this));
  }

  //event delegation
  _moveToPopup(e) {
    //no matter if i click on span, div etc
    const workoutEl = e.target.closest('.workout');

    //clicking on edit/delete would also return;
    if (!workoutEl || e.target.closest('.workout__btns')) return;

    //now we use the id
    const workout = this.#workouts.find(function (el) {
      return el.id === workoutEl.dataset.id;
    });

    ////method from the leaflet library
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    //API provided by the browser
    //stores eveything as a string, key:string pairs
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    /*parsing back the string after getting it using key*/
    const data = JSON.parse(localStorage.getItem('workout'));

    if (!data) return;

    //restoring the data
    this.#workouts = data;

    //setting the prototype chain, rendering the workout(s)
    this.#workouts.forEach(
      function (workout) {
        workout =
          workout.type === 'running'
            ? Object.setPrototypeOf(workout, Running.prototype)
            : workout.type == 'cycling'
            ? Object.setPrototypeOf(workout, Cycling.prototype)
            : Object.setPrototypeOf(workout, Swimming.prototype);
        this._renderWorkout(workout);
      }.bind(this)
    );

    //Showing the buttons
    this._showCustomButtons();
  }

  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }

  _deleteWorkout(e) {
    // Find the clicked workout element and the index of the workout in the array
    const clickedId = e.target.closest('.workout').dataset.id;
    const index = this.#workouts.findIndex(function (el) {
      return el.id === clickedId;
    });

    // Remove the workout from the array
    this.#workouts.splice(index, 1);

    // Update the local storage with the new workouts array
    localStorage.setItem('workout', JSON.stringify(this.#workouts));

    // Check if the workouts array is empty
    if (this.#workouts.length === 0) {
      // If it's empty, remove the workouts from local storage and hide the buttons
      localStorage.removeItem('workout');
      btnsCustomContainer.classList.add('hidden');
    }
    // Remove the marker from the map
    this.#markers
      .find(function (el) {
        return el.markID === clickedId;
      })
      .remove();

    // Remove the workout element from the page
    e.target.closest('.workout').remove();
  }

  _deleteWorkoutByObject(workout) {
    // Find the clicked workout element and the index of the workout in the array
    const clickedId = workout.id;
    const index = this.#workouts.findIndex(function (el) {
      return el.id === clickedId;
    });

    // Remove the workout from the array
    this.#workouts.splice(index, 1);

    // Update the local storage with the new workouts array
    localStorage.setItem('workout', JSON.stringify(this.#workouts));

    // Check if the workouts array is empty
    if (this.#workouts.length === 0) {
      // If it's empty, remove the workouts from local storage and hide the buttons
      localStorage.removeItem('workout');
      btnsCustomContainer.classList.add('hidden');
    }
    // Remove the marker from the map
    this.#markers
      .find(function (el) {
        return el.markID === clickedId;
      })
      .remove();

    // Remove the workout element from the page
    document.querySelector(`[data-id="${clickedId}"]`).remove();
    this.#flag = 0;
  }

  _editWorkout(e) {
    const clickedId = e.target.closest('.workout').dataset.id;
    const workout = this.#workouts.find(function (el) {
      return el.id === clickedId;
    });
    form.classList.remove('hidden');
    inputDistance.focus();
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    if (workout.type === 'running') inputCadence.value = workout.cadence;
    if (workout.type === 'cycling')
      inputElevation.value = workout.elevationGain;
    if (workout.type == 'swimming') inputStrokes.value = workout.strokes;
    this.lat = workout.coords[0];
    this.lng = workout.coords[1];
    this.#workoutEdit = workout;
    this.#flag = 1;
  }
  _toggleSortBtns() {
    sortContainer.classList.toggle('zero__height');
  }
  _sortAndRender(e) {
    const element = e.target.closest('.sort__button');
    console.log(e);

    let currentDirection = 'descending'; //default
    //guard function
    if (!element) return;

    const arrow = element.querySelector('.arrow');
    console.log(arrow);
    const type = element.dataset.type;
    console.log(type);
    //set all arrows to default state(down)
    sortContainer
      .querySelectorAll('.arrow')
      .forEach(e => e.classList.remove('arrow__up'));

    //get which direction to sort
    const typeValues = this.#workouts.map(workout => {
      return workout[type];
    });
    console.log(typeValues);
    const sortedAscending = typeValues
      .slice()
      .sort(function (a, b) {
        return a - b;
      })
      .join('');
    const sortedDescending = typeValues
      .slice()
      .sort(function (a, b) {
        return b - a;
      })
      .join('');

    // compare sortedAscending array with values from #workout array to check how are they sorted
    // 1. case 1 ascending
    if (typeValues.join('') === sortedAscending) {
      currentDirection = 'ascending';

      arrow.classList.add('arrow__up');
    }
    // 2. case 2 descending
    if (typeValues.join('') === sortedDescending) {
      currentDirection = 'descending';

      arrow.classList.remove('arrow__up');
    }

    // sort main workouts array
    this._sortArray(this.#workouts, currentDirection, type);

    ///////// RE-RENDER ////////
    // clear rendered workouts from DOM
    containerWorkouts
      .querySelectorAll('.workout')
      .forEach(workout => workout.remove());
    // clear workouts from map(to prevent bug in array order when deleting a single workout)
    this.#markers.forEach(marker => marker.remove());
    //clear array
    this.#markers = [];
    // render list all again sorted
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
      // create new markers and render them on map
      this._renderWorkoutMarker(workout);
    });
    // center map on the last item in array (this will be 1st workout on the list in the UI)
    // const lastWorkout = this.#workouts[this.#workouts.length - 1];
    // this._moveToPopup(lastWorkout);
  }
  _sortArray(array, currentDirection, type) {
    // sort opposite to the currentDirection
    if (currentDirection === 'ascending') {
      array.sort(function (a, b) {
        return b[type] - a[type];
      });
    }
    if (currentDirection === 'descending') {
      array.sort(function (a, b) {
        return a[type] - b[type];
      });
    }
  }
}

const app = new App();
//can use app.reset() on console on clear all workouts
