'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(cords,distance,duration){
        this.cords = cords; // [lat, lng] Arr
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription(){
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
}

class Running extends Workout{
    constructor(cords,distance,duration,cadence){
        super(cords,distance,duration);
        this.cadence = cadence;
        this.type = 'running';
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        // min/km
        this.pace = (this.duration / this.distance).toFixed(2);
        return this.pace;
    }
}

class Cycling extends Workout{
    constructor(cords,distance,duration,elevationGain){
        super(cords,distance,duration);
        this.elevationGain = elevationGain;
        this.type = 'cycling';
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed(){
        // km/h
        this.speed = (this.distance / (this.duration / 60)).toFixed(1);
        return this.speed;
    }
}

// const run1 = new Running([39,-12],5.2,24,178);
// const cycling1 = new Cycling([39,-12],27,95,523);

// console.log(run1);
// console.log(cycling1);


/////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoom = 13;

    constructor(){
        this._getPosition();

        this._getLocalStorage();

        form.addEventListener('submit',this._newWorkout.bind(this));
        inputType.addEventListener('change',this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),function(){
                alert('Could not get your position')
            })
        }
    }

    _loadMap(position){
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
        
        this.#map = L.map('map').setView([latitude, longitude], this.#mapZoom);
        
        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        })
    }

    _showForm(mapE){
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e){
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        // Get data from form

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;

        const {lat,lng} = this.#mapEvent.latlng;

        let workout;

        // If workout is running, create running object

        if(type === 'running'){
            const cadence = +inputCadence.value;
            // Check if data is valid
            if(!validInputs(distance,duration,cadence) || !allPositive(distance,duration,cadence)) return alert('Inputs have to be positive numbers!');

            workout = new Running([lat,lng],distance,duration,cadence);
        }

        // If cycling create object cycling

        if(type === 'cycling'){
            const elevation = +inputElevation.value;
            // Check if data is valid
            if(!validInputs(distance,duration,elevation) || !allPositive(distance,duration)) return alert('Inputs have to be positive numbers!');

            workout = new Cycling([lat,lng],distance,duration,elevation);
        }

        // Add new object to workout array

        this.#workouts.push(workout);

        // Render workout on list

        this._renderWorkout(workout);

        // Render workout on map as marker

        this._renderWorkoutMarker(workout);

        // Hide form + clear input fields

        this._hideForm();

        // Add data to local storage

        this._setLocalStorage();
    }

    _hideForm(){
        form.classList.add('hidden')
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    }

    _renderWorkoutMarker(workout){
        L.marker(workout.cords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        })).setPopupContent(`${workout.description}`).openPopup();
    }

    _renderWorkout(workout){
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        `;

        if(workout.type === 'running') {
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          <div class="workout__change">
            <button id="change">Change</button>
            <button id="delete">Delete</button>
          </div>
        </li>`
        } else{
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          <div class="workout__change">
            <button id="change">Change</button>
            <button id="delete">Delete</button>
          </div>
        </li>
            `;
        }

        form.insertAdjacentHTML('afterend',html);
    }

    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout');
        
        if(!workoutEl) return;

        const workout = this.#workouts.find((el) => el.id === workoutEl.dataset.id);

        console.log(workout);

        this.#map.setView(workout.cords, this.#mapZoom, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }

    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'));

        if(!data) return;

        console.log(data);

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        })
    }

    reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }
}



const app = new App();


